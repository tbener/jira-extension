import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';
import { CONFIG } from '../../config.js';

export class JiraHttpService {
    constructor() {
        this.username = CONFIG.USERNAME;
        this.password = CONFIG.PASSWORD;
        this.baseUrl = '';
        this.baseApiUrl = '';
        this.authHeaders = {};
        this.jql = null;
    }

    /**
     * Initializes the JiraHttpService with settings.
     */
    async init() {
        const settingsService = new SettingsService();
        const settings = await settingsService.readSettings();
        this.baseUrl = `https://${settings.customDomain}.atlassian.net`;
        this.baseApiUrl = `${this.baseUrl}/rest/api/3/search`;
        this.authHeaders = {
            Authorization: "Basic " + btoa(`${this.username}:${this.password}`),
            "Content-Type": "application/json",
        };

        this.jql = new JqlBuilder(settings.defaultProjectKey);
    }

    /**
     * Fetches issues assigned to the current user.
     * @returns {Promise<Array>} List of issues.
     */
    async fetchMyIssues() {
        if (!this.ensureInitialized()) {
            return [];
        }
        return await this.fetchIssues(this.jql.myIssues());
    }

    /**
     * Fetches issues by their keys.
     * @param {Array<string>} keys - List of issue keys.
     * @returns {Promise<Array>} List of issues.
     */
    async fetchByKeys(keys) {
        if (!this.ensureInitialized()) {
            return [];
        }
        if (!keys || keys.length === 0) {
            console.debug("fetchByKeys - No keys provided. Returning empty list.");
            return [];
        }
        this.ensureInitialized();
        return await this.fetchIssues(this.jql.byKeyList(keys));
    }

    /**
     * Ensures that the service is initialized.
     * @throws {Error} If the service is not initialized.
     */
    ensureInitialized() {
        if (!this.jql) {
            console.log("ERROR: JiraHttpService not initialized. Call init() first.");
            throw new Error("JiraHttpService not initialized. Call init() first.");
        }
        return true;
    }

    /**
     * Constructs the JQL API path.
     * @param {string} jql - The JQL query.
     * @returns {string} The API path.
     */
    getJqlPath(jql) {
        return `${this.baseApiUrl}?jql=${encodeURIComponent(jql)}&maxResults=${CONFIG.MAX_RESULTS}`;
    }

    /**
     * Fetches issues based on the JQL query.
     * @param {string} jql - The JQL query.
     * @returns {Promise<Array>} List of issues.
     */
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