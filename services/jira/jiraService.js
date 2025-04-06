import { JiraHttpService } from "./jiraHttpService.js";

export class JiraService {
    async guessBoardLink(domain, projectKey) {
        const baseUrl = `https://${domain}.atlassian.net`;
        const apiGetPath = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;

        try {
            const jiraHttpService = new JiraHttpService();
            const data = await jiraHttpService.fetch(apiGetPath);

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
        catch {
            console.debug(`Error fetching board:`, error);
            return baseUrl;
        }
    }
}