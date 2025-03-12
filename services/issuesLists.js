import {JiraHttpService} from "./jira/JiraHttpService.js";

export class IssuesLists {
    issuesList = {};

    jiraHttpService = new JiraHttpService();


    init = async () => {
        await this.jiraHttpService.init();
    }

    addMyIssues = async () => {
        const issues = await this.jiraHttpService.fetchMyIssues();
        issues.forEach(issue => {
            this.issuesList[issue.key] = this._mapIssue(issue, {assignedToMe: true});
        });
        console.log("Assigned issues fetched and stored.", this.issuesList);
    }

    getList = () => Object.values(this.issuesList);

    _mapIssue(issue, overrideFields) {
        const { id, key, fields } = issue;
        const { summary, status, assignee, created, updated } = fields;

        return {
            id,
            key,
            summary,
            status: status?.name || "Unknown",
            assignee: assignee?.displayName || null,
            created,
            updated,
            assignedToMe: false,
            hasOpenTab: false,

            ...overrideFields,
        };
    }
}