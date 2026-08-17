import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { formatString } from '/common/utils.js';
import { CONFIG } from '../../config.js';

// Thrown by fetch() only when called with throwOnError=true - lets a caller distinguish
// "Jira rejected this request" (e.g. an invalid custom field id) from "genuinely no data",
// without changing behavior for every other call site (which still get null on error).
export class JiraApiError extends Error {
    constructor(status, body) {
        super(`Jira API request failed with status ${status}`);
        this.status = status;
        this.body = body;
    }
}

export class JiraHttpService {
    abortController = null;

    constructor() {
        this.baseUrl = '';
        this.authHeaders = {
            "Content-Type": "application/json",
        };
        this.settings = {};
    }

    API_PATH = {
        JQL: 'rest/api/3/search/jql?fields=key,summary,status,assignee,created,updated&jql={0}&maxResults={1}',
        ISSUE: 'rest/api/3/issue/{0}',
        MYSELF: 'rest/api/3/myself',
        USER_ASSIGNABLE_SEARCH: 'rest/api/3/user/assignable/search?project={0}&query={1}&maxResults={2}',
        FIELD: 'rest/api/3/field',
    };

    async init() {
        console.debug('Initializing JiraHttpService')
        // this is called when initializing background, so can't fetch settings from there
        const settingsService = new SettingsService();
        this.settings = await settingsService.readSettings();
        this.baseUrl = `https://${this.settings.customDomain}.atlassian.net`;
        await this.fetchCurrentUser();

        console.debug(`JiraHttpService initialized!!!`);
    }

    // Cached so _mapIssue can tell whether an issue is actually assigned to the current user,
    // independent of which query (my-issues JQL, open tabs, favorites) fetched it.
    async fetchCurrentUser() {
        const response = await this.fetch(this.getApiPath(this.API_PATH.MYSELF));
        this.currentUserAccountId = response?.accountId ?? null;
        console.debug('Current user account id:', this.currentUserAccountId);
    }

    getApiPath(apiPath, ...args) {
        return formatString(`${this.baseUrl}/${apiPath}`, ...args);
    }

    getJqlPath(jql) {
        return this.getApiPath(this.API_PATH.JQL, encodeURIComponent(jql), CONFIG.MAX_RESULTS);
    }

    getIssueLink(issueKey) {
        return `${this.baseUrl}/browse/${issueKey}`;
    }

    async fetchIssue(key, withAbortController = false) {
        console.debug("Fetching issue with key:", key);
        const apiPath = this.getApiPath(this.API_PATH.ISSUE, key);
        return await this.fetch(apiPath, withAbortController);
    }

    async fetchMyIssues() {
        console.debug("Fetching my issues.");

        const jql = await JqlBuilder.jqlMyIssues(this.settings.defaultProjectKey, this.settings.myIssuesJql);
        console.debug("Fetching my issues with JQL:", jql);
        return await this.fetchIssuesForJql(jql);
    }

    async fetchByKeys(keys) {
        console.debug("Fetching issues by keys:", keys);

        if (!keys || keys.length === 0) {
            console.debug("fetchByKeys - No keys provided. Returning empty list.");
            return [];
        }
        const jql = await JqlBuilder.jqlByKeyList(keys);
        return await this.fetchIssuesForJql(jql);
    }

    async fetchTextSearch(text) {
        console.debug("Fetching issues by text search:", text);

        const jql = await this.buildTextSearchJql(text);
        console.debug("Fetching text search with JQL:", jql);
        return await this.fetchIssuesForJql(jql, true);
    }

    async buildTextSearchJql(text) {
        return await JqlBuilder.jqlTextSearch(text, this.settings.defaultProjectKey);
    }

    // Scoped to defaultProjectKey (like the issue search itself) rather than the global
    // user directory - only returns users who currently hold assign permission on that
    // project, which naturally filters out departed/unrelated accounts that a global
    // picker would otherwise surface. Trade-off: someone who's only ever a *reporter*
    // (not assignable) on this project's issues won't show up here even though a
    // user-search would find their issues - acceptable default, but worth knowing.
    async fetchAssignableUsers(query) {
        console.debug("Fetching assignable users for query:", query);
        const apiPath = this.getApiPath(
            this.API_PATH.USER_ASSIGNABLE_SEARCH,
            encodeURIComponent(this.settings.defaultProjectKey),
            encodeURIComponent(query),
            CONFIG.MAX_RESULTS
        );
        // Response is a plain array of user objects (not wrapped like /user/picker's {users: [...]}).
        return await this.fetch(apiPath, true) ?? [];
    }

    // Full field list for this Jira instance - used to validate a configured additional
    // user field (see additionalUserFields) actually exists before it's used in a JQL
    // query. Cached in memory for the session since it's effectively static per instance.
    async fetchFieldList() {
        if (!this._fieldListCache) {
            const apiPath = this.getApiPath(this.API_PATH.FIELD);
            this._fieldListCache = await this.fetch(apiPath) ?? [];
        }
        return this._fieldListCache;
    }

    // Resolves a field id to its Jira field object (which includes .name) or null if it
    // doesn't exist on this instance - lets options.js auto-fill the field's display name
    // instead of asking the user to type it in themselves.
    async fetchFieldInfo(fieldId) {
        if (!fieldId) {
            return null;
        }
        const normalizedId = /^\d+$/.test(fieldId) ? `customfield_${fieldId}` : fieldId;
        const fields = await this.fetchFieldList();
        return fields.find(field => field.id === normalizedId) ?? null;
    }

    async buildUserSearchJql(accountId) {
        return await JqlBuilder.jqlUserSearch(accountId, this.settings.defaultProjectKey, this._userSearchRoleFields());
    }

    async fetchUserSearch(accountId) {
        console.debug("Fetching issues by user:", accountId);

        const jql = await this.buildUserSearchJql(accountId);
        try {
            const response = await this.fetch(this.getJqlPath(jql), true, true); // throwOnError
            return response?.issues ?? [];
        } catch (error) {
            const additionalFields = this.settings.additionalUserFields ?? [];
            if (additionalFields.length === 0 || this._additionalFieldsBroken) {
                console.log("Error fetching issues by user:", error);
                return [];
            }
            // One of the additional fields may have gone stale since it was validated in
            // settings (deleted, permissions revoked, moved off-scope) - retry once with
            // just assignee/reporter rather than letting a bad clause silently blank out
            // those matches too. Drops ALL additional fields at once rather than trying to
            // bisect which one broke it - simpler, and still correct either way.
            console.warn("Additional user field(s) query failed, retrying without them:", additionalFields, error);
            this._additionalFieldsBroken = true;
            const fallbackJql = await JqlBuilder.jqlUserSearch(accountId, this.settings.defaultProjectKey, JqlBuilder.DEFAULT_USER_SEARCH_ROLES);
            return await this.fetchIssuesForJql(fallbackJql, true);
        }
    }

    _userSearchRoleFields() {
        const fields = [...JqlBuilder.DEFAULT_USER_SEARCH_ROLES];
        if (!this._additionalFieldsBroken) {
            (this.settings.additionalUserFields ?? []).forEach(field => {
                if (field?.id) {
                    fields.push(field.id);
                }
            });
        }
        return fields;
    }

    async fetchIssuesForJql(jql, withAbortController = false) {
        const apiPath = this.getJqlPath(jql);
        const response = await this.fetch(apiPath, withAbortController);
        return response?.issues ?? [];
    }

    async fetch(apiPath, withAbortController = false, throwOnError = false) {
        console.log(`Fetching ${apiPath}`);

        let signal;
        if (withAbortController) {
            console.debug("Using AbortController for fetch.");
            if (this.abortController) {
                console.debug("Aborting previous fetch request.");
            }
            // Abort the previous fetch request if it exists
            this.abortFetch();
            this.abortController = new AbortController();
            signal = this.abortController.signal;
        }

        try {

            const response = await fetch(apiPath, {
                method: "GET",
                headers: this.authHeaders,
                signal,
            });

            console.debug("Response:", response);

            if (!response.ok) {
                console.log(`ERROR: Failed to fetch: ${response.status} ${response.statusText}`);
                if (throwOnError) {
                    const errorBody = await response.json().catch(() => null);
                    throw new JiraApiError(response.status, errorBody);
                }
                return null;
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                return await response.json();
            } else {
                console.log("Response is not JSON:", response);
                return null;
            }
        } catch (error) {
            if (error instanceof JiraApiError) {
                throw error;
            }
            console.log("Error fetching issue(s):", error, "Path:", apiPath);
            return null;
        }
    }

    abortFetch() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}