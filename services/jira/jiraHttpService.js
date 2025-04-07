import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { formatString } from '/common/utils.js';
import { CONFIG } from '../../config.js';

export class JiraHttpService {
    abortController = null;

    constructor() {
        this.baseUrl = '';
        this.baseApiUrl = '';
        this.authHeaders = {
            Authorization: "Basic " + btoa(`${CONFIG.USERNAME}:${CONFIG.PASSWORD}`),
            "Content-Type": "application/json",
        };
        this.settings = {};
    }

    API_PATH = {
        JQL: 'rest/api/3/search',
        ISSUE: 'rest/api/3/issue/{0}'
    };

    async init() {
        console.debug('Initializing JiraHttpService')
        // this is called when initializing background, so can't fetch settings from there
        const settingsService = new SettingsService();
        this.settings = await settingsService.readSettings();
        this.baseUrl = `https://${this.settings.customDomain}.atlassian.net`;
        this.baseApiUrl = `${this.baseUrl}/rest/api/3/search`;

        console.debug(`JiraHttpService initialized!!!`);
    }

    getApiPath(apiPath, ...args) {
        return formatString(`${this.baseUrl}/${apiPath}`, ...args);
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

        const jql = await JqlBuilder.jqlMyIssues(this.settings.defaultProjectKey);
        console.debug("Fetching my issues with JQL:", jql);
        const apiPath = this.getJqlPath(jql);
        const response = await this.fetch(apiPath);
        return response?.issues ?? [];
    }

    async fetchByKeys(keys) {
        console.debug("Fetching issues by keys:", keys);

        if (!keys || keys.length === 0) {
            console.debug("fetchByKeys - No keys provided. Returning empty list.");
            return [];
        }
        const jql = await JqlBuilder.jqlByKeyList(keys);
        const apiPath = this.getJqlPath(jql);
        const response = await this.fetch(apiPath);
        return response?.issues ?? [];
    }

    getJqlPath(jql) {
        return `${this.baseApiUrl}?jql=${encodeURIComponent(jql)}&maxResults=${CONFIG.MAX_RESULTS}`;
    }

    async fetch(apiPath, withAbortController = false) {
        console.log(`Fetching ${apiPath}`);

        if (withAbortController) {
            console.debug("Using AbortController for fetch.");
            if (this.abortController) {
                console.debug("Aborting previous fetch request.");
            }
            // Abort the previous fetch request if it exists
            this.abortFetch();
            this.abortController = new AbortController();
            this.authHeaders.signal = this.abortController.signal;
        }

        try {

            const response = await fetch(apiPath, {
                method: "GET",
                headers: this.authHeaders,
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
                console.warn("Response is not JSON:", response);
                return null;
            }
        } catch (error) {
            console.warn("Error fetching issue(s):", error, "Path:", apiPath);
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