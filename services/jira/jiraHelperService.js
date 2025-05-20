import { JiraHttpService } from "./jiraHttpService.js";
import { fetchSettingsFromBackground, formatString } from '../../common/utils.js';

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

    async fetchIssueForPreview(issueKey) {
        console.debug("Fetching issue with key:", issueKey);
        if (!issueKey) {
            console.debug("No issue key provided. Returning null.");
            return null;
        }

        const data = await this.jiraHttpService.fetchIssue(issueKey);

        if (!data) {
            return { error: "Not found" };
        }

        return {
            key: data.key,
            summary: data.fields.summary,
            link: this.jiraHttpService.getIssueLink(data.key)
        }
    }

    AbortFetchIssueForPreview() {
        this.jiraHttpService.abortFetch();
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