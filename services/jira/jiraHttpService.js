import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { fetchSettingsFromBackground, formatString } from '/common/utils.js';
import { CONFIG } from '../../config.js';

export class JiraHttpService {
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
        const settingsService = new SettingsService();
        this.settings = await settingsService.readSettings();
        const baseUrl = `https://${this.settings.customDomain}.atlassian.net`;
        this.baseApiUrl = `${baseUrl}/rest/api/3/search`;

        console.debug(`JiraHttpService initialized!!!`);
    }

    getApiPath(apiPath, ...args) {
        const baseUrl = `https://${this.settings.customDomain}.atlassian.net`;
        return formatString(`${baseUrl}/${apiPath}`, ...args);
    }

    //TODO: Implement fetchIssue method
    async fetchIssue(key) {
        const apiPath = this.getApiPath(this.API_PATH.ISSUE, key);
        console.log(`API Path: ${apiPath}`);
        // Add fetch logic here
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

    async fetch(apiPath) {
        try {
            console.log(`Fetching ${apiPath}`);

            const response = await fetch(apiPath, {
                method: "GET",
                headers: this.authHeaders,
            });

            if (!response.ok) {
                console.log(`ERROR: Failed to fetch: ${response.status} ${response.statusText}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.log("Error fetching issue(s):", error);
            return null;
        }
    }
}