import { JiraHttpService } from "./jira/JiraHttpService.js";

export class IssuesLists {
    issuesList = {};

    jiraHttpService = new JiraHttpService();


    init = async () => {
        await this.jiraHttpService.init();
    }

    addMyIssues = async () => {
        const issues = await this.jiraHttpService.fetchMyIssues();
        this._addIssues(issues, { assignedToMe: true });
        console.debug("Assigned issues fetched and stored.", this.issuesList);
    }

    addOpenTabsIssues = async () => {
        const {issueKeys} = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getOpenTabsIssues" }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        // remove existing keys from issuekeys
        const existingKeys = issueKeys.filter(key => this.issuesList[key]);
        const newKeys = issueKeys.filter(key => !existingKeys.includes(key));

        const openTabField = { hasOpenTab: true };

        existingKeys.forEach(key => {
            // set hasOpenTab
            Object.assign(this.issuesList[key], openTabField);
        });

        const issues = await this.jiraHttpService.fetchByKeys(newKeys);
        this._addIssues(issues, openTabField);
        console.debug("Open tabs issues fetched and stored.", this.issuesList);
    }

    getList = () => Object.values(this.issuesList);

    _addIssues(issues, overrideFields) {
        issues.forEach(issue => {
            this._setIssue(issue, overrideFields);
        });
    }

    _setIssue(issue, overrideFields) {
        if (this.issuesList[issue.key]) {
            Object.assign(this.issuesList[issue.key], overrideFields);
        } else {
            this.issuesList[issue.key] = this._mapIssue(issue, overrideFields);
        }
    }

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