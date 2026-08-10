import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { formatString } from '/common/utils.js';
import { CONFIG } from '../../config.js';

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
        MYSELF: 'rest/api/3/myself'
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

    async fetchIssuesForJql(jql, withAbortController = false) {
        const apiPath = this.getJqlPath(jql);
        const response = await this.fetch(apiPath, withAbortController);
        return response?.issues ?? [];
    }

    async fetch(apiPath, withAbortController = false) {
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