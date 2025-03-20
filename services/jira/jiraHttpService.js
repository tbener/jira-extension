import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { CONFIG } from '../../config.js';

export class JiraHttpService {
    constructor() {
        this.baseUrl = '';
        this.baseApiUrl = '';
        this.authHeaders = {
            Authorization: "Basic " + btoa(`${CONFIG.USERNAME}:${CONFIG.PASSWORD}`),
            "Content-Type": "application/json",
        };
    }

    async init() {
        const settingsService = new SettingsService();
        const settings = await settingsService.readSettings();
        const baseUrl = `https://${settings.customDomain}.atlassian.net`;
        this.baseApiUrl = `${baseUrl}/rest/api/3/search`;

        console.debug(`JiraHttpService initialized!!!`);
    }

    async fetchMyIssues() {
        const jql = await JqlBuilder.jqlMyIssues();
        return await this.fetchIssues(jql);
    }

    async fetchByKeys(keys) {
        if (!keys || keys.length === 0) {
            console.debug("fetchByKeys - No keys provided. Returning empty list.");
            return [];
        }
        const jql = await JqlBuilder.jqlByKeyList(keys);
        return await this.fetchIssues(jql);
    }

    getJqlPath(jql) {
        return `${this.baseApiUrl}?jql=${encodeURIComponent(jql)}&maxResults=${CONFIG.MAX_RESULTS}`;
    }

    async fetchIssues(jql) {
        try {
            const apiPath = this.getJqlPath(jql);
            console.log(`Fetching ${apiPath}`);

            const response = await fetch(apiPath, {
                method: "GET",
                headers: this.authHeaders,
            });

            if (!response.ok) {
                console.log(`ERROR: Failed to fetch issues: ${response.status} ${response.statusText}\nJQL: ${jql}`);
                return [];
            }

            const data = await response.json();
            return data.issues || [];
        } catch (error) {
            console.log("Error fetching issues:", error);
            return [];
        }
    }
}