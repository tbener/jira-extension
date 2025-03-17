import { JqlBuilder } from "./jqlBuilder.js";
import { SettingsService } from '../settingsService.js';

const MAX_RESULTS = 10;

export class JiraHttpService {
    username = 'tbener@gmail.com'
    password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

    baseUrl;
    baseApiUrl;
    authHeaders;

    jql;

    async init() {
        const settingsService = new SettingsService();
        const settings = await settingsService.readSettings();
        this.baseUrl = `https://${settings.customDomain}.atlassian.net`;
        this.baseApiUrl = `${this.baseUrl}/rest/api/3/search`;
        this.authHeaders = {
            Authorization: "Basic " + btoa(`${this.username}:${this.password}`),
            "Content-Type": "application/json",
        }

        this.jql = new JqlBuilder(settings.defaultProjectKey);
    }

    fetchMyIssues = async () =>
        await this.fetchIssues(this.jql.myIssues());


    fetchByKeys = async (keys) =>
        await this.fetchIssues(this.jql.byKeyList(keys));

    getJqlPath = (jql) => {
        return `${this.baseApiUrl}?jql=${encodeURIComponent(jql)}&maxResults=${MAX_RESULTS}`;
    }

    fetchIssues = async (jql) => {
        try {
            const apiPath = this.getJqlPath(jql);
            console.log(`Fetching ${apiPath}`);

            const response = await fetch(apiPath, {
                method: "GET",
                headers: this.authHeaders,
            });

            if (!response.ok) {
                console.log(`ERROR: Failed to fetch issues: ${response.status} ${response.statusText}\nJQL: ${jql}`);
            }

            const data = await response.json();
            return data.issues || [];
        } catch (error) {
            console.log("Error fetching issues:", error);
            return [];
        }
    }
}