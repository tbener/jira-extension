import { JiraHttpService } from "./jiraHttpService.js";
import { fetchSettingsFromBackground } from '../../common/utils.js';
import { Issue } from "../../models/issue.js";

export class JiraHelperService {

    async init() {
        console.debug('Initializing JiraHelperService')
        this.settings = await fetchSettingsFromBackground();
        this.jiraHttpService = new JiraHttpService();
        await this.jiraHttpService.init();
    }

    getIssueKey(issueNumberOrKey) {
        if (issueNumberOrKey === '') return '';

        if (/^[A-Za-z]+-\d+$/.test(issueNumberOrKey)) {
            // the input is in full format, return it as is
            return issueNumberOrKey
        }

        if (isNaN(issueNumberOrKey)) {
            // not a number and not in key format
            return ''
        }

        // input is only the number
        return `${this.settings.defaultProjectKey}-${issueNumberOrKey}`;
    }

    async fetchIssueByKey(issueKey) {
        console.debug("Fetching issue with key:", issueKey);
        if (!issueKey) {
            console.debug("No issue key provided. Returning null.");
            return null;
        }

        return await this.jiraHttpService.fetchIssue(issueKey);

    }

    async fetchIssue(issueKey, overrideFields = {}) {
        const data = await this.fetchIssueByKey(issueKey);

        if (!data) {
            return null;
        }

        return new Issue(data, overrideFields);

    }

    async searchByText(text) {
        console.debug("Searching issues by text:", text);
        if (!text) {
            return [];
        }

        const results = await this.jiraHttpService.fetchTextSearch(text);
        return results.map(data => new Issue(data, { searchResults: true }));
    }

    async buildTextSearchJql(text) {
        return await this.jiraHttpService.buildTextSearchJql(text);
    }

    async searchUsers(query) {
        console.debug("Searching users by query:", query);
        if (!query) {
            return [];
        }

        return await this.jiraHttpService.fetchAssignableUsers(query);
    }

    async searchByUser(accountId) {
        console.debug("Searching issues by user:", accountId);
        if (!accountId) {
            return [];
        }

        const results = await this.jiraHttpService.fetchUserSearch(accountId);
        return results.map(data => new Issue(data, { searchResults: true }));
    }

    async buildUserSearchJql(accountId) {
        return await this.jiraHttpService.buildUserSearchJql(accountId);
    }

    async fetchFieldInfo(fieldId) {
        return await this.jiraHttpService.fetchFieldInfo(fieldId);
    }

    AbortFetch() {
        this.jiraHttpService?.abortFetch();
    }

    async guessBoardLink(domain, projectKey) {
        const baseUrl = `https://${domain}.atlassian.net`;
        const apiGetPath = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;

        try {
            const data = await this.jiraHttpService.fetch(apiGetPath);

            if (!data) {
                return baseUrl;
            }

            const boards = data.values;
            let board;
            if (boards?.length > 0) {
                if (boards.length === 1) {
                    board = boards[0];
                } else {
                    board = boards.find(b => b.type === 'kanban' && b.location.projectKey === projectKey);
                    if (!board) {
                        board = boards.find(b => b.location.projectKey === projectKey);
                    }
                }
            }

            if (board) {
                return `${baseUrl}/jira/software/c/projects/${projectKey}/boards/${board.id}`;
            }

            // we couldn't find a relevant board
            return baseUrl;
        }
        catch (error) {
            console.debug(`Error fetching board:`, error);
            return baseUrl;
        }
    }
}