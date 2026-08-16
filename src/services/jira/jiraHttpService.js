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
        USER_PICKER: 'rest/api/3/user/picker?query={0}&maxResults={1}',
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

    async fetchUserPicker(query) {
        console.debug("Fetching user picker for query:", query);
        const apiPath = this.getApiPath(this.API_PATH.USER_PICKER, encodeURIComponent(query), CONFIG.MAX_RESULTS);
        const response = await this.fetch(apiPath, true);
        return response?.users ?? [];
    }

    // Full field list for this Jira instance - used to validate a configured custom
    // field id (e.g. qaAssigneeFieldId) actually exists before it's used in a JQL query.
    // Cached in memory for the session since it's effectively static per instance.
    async fetchFieldList() {
        if (!this._fieldListCache) {
            const apiPath = this.getApiPath(this.API_PATH.FIELD);
            this._fieldListCache = await this.fetch(apiPath) ?? [];
        }
        return this._fieldListCache;
    }

    async fetchFieldExists(fieldId) {
        if (!fieldId) {
            return false;
        }
        const normalizedId = /^\d+$/.test(fieldId) ? `customfield_${fieldId}` : fieldId;
        const fields = await this.fetchFieldList();
        return fields.some(field => field.id === normalizedId);
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
            if (!this.settings.qaAssigneeFieldId || this._qaFieldBroken) {
                console.log("Error fetching issues by user:", error);
                return [];
            }
            // The QA field may have gone stale since it was validated in settings
            // (deleted, permissions revoked, moved off-scope) - retry once without it
            // rather than letting one bad clause silently blank out assignee/reporter matches.
            console.warn("QA field query failed, retrying user search without it:", this.settings.qaAssigneeFieldId, error);
            this._qaFieldBroken = true;
            const fallbackJql = await JqlBuilder.jqlUserSearch(accountId, this.settings.defaultProjectKey, JqlBuilder.DEFAULT_USER_SEARCH_ROLES);
            return await this.fetchIssuesForJql(fallbackJql, true);
        }
    }

    _userSearchRoleFields() {
        const fields = [...JqlBuilder.DEFAULT_USER_SEARCH_ROLES];
        if (this.settings.qaAssigneeFieldId && !this._qaFieldBroken) {
            fields.push(this.settings.qaAssigneeFieldId);
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