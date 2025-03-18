import { JiraHttpService } from "./jira/JiraHttpService.js";

export class IssuesLists {
    issuesList = {};

    jiraHttpService = new JiraHttpService();

    customProperties = {
        OpenTabs: { hasOpenTab: true },
        AssignedToMe: { assignedToMe: true },
    };


    init = async () => {
        await this.jiraHttpService.init();
    }

    // newoOpenTabsKeys are the currently open tabs - merge them to the list without fetching from server
    // -----------
    // if a key from newoOpenTabsKeys is in this.issuesList, set hasOpenTab to true, isUpdated to false
    // if a key from newoOpenTabsKeys is NOT in this.issuesList, add it with hasOpenTab to true, isUpdated to false
    // if a key is in this.issuesList but not in newoOpenTabsKeys, if it's not assigned to me, remove it from the this.issuesList
    mergeOpenTabsIssues = (newoOpenTabsKeys) => {
        const existingKeys = newoOpenTabsKeys.filter(key => this.issuesList[key]);
        console.debug("Existing keys:", existingKeys);
        const newKeys = newoOpenTabsKeys.filter(key => !existingKeys.includes(key));
        console.debug("New keys:", newKeys);

        const openTabField = { hasOpenTab: true, isUpdated: false };

        existingKeys.forEach(key => {
            // set hasOpenTab
            Object.assign(this.issuesList[key], openTabField);
        });
        console.debug("Existing keys updated.", this.issuesList);

        this._addIssues(newKeys.map(key => ({ key })), openTabField);
        console.debug("New keys added.", this.issuesList);

        // remove issues that are not in newoOpenTabsKeys and not assigned to me
        Object.keys(this.issuesList).forEach(key => {
            if (!newoOpenTabsKeys.includes(key) && !this.issuesList[key].assignedToMe) {
                delete this.issuesList[key];
            }
        });

        console.debug("Open tabs issues merged to list (not updated from server).", this.issuesList);
    }


    refreshIssues = async () => {
        const openTabsKeys = Object.keys(this.issuesList).filter(key => this.issuesList[key].hasOpenTab);
        const [myIssues, openTabsIssues] = await Promise.all([
            this.jiraHttpService.fetchMyIssues(),
            this.jiraHttpService.fetchByKeys(openTabsKeys)
        ]);

        console.debug("Issues fetched from server.", myIssues, openTabsIssues);

        this._addIssues(myIssues, this.customProperties.AssignedToMe);
        this._addIssues(openTabsIssues, this.customProperties.OpenTabs);
        console.debug("Issues refreshed and stored.", this.issuesList);
    }
        

    addMyIssues = async () => {
        const issues = await this.jiraHttpService.fetchMyIssues();
        this._addIssues(issues, { assignedToMe: true });
        console.debug("Assigned issues fetched and stored.", this.issuesList);
    }

    addIssues = async (issueKeys, hasOpenTabs) => {
        const issues = await this.jiraHttpService.fetchByKeys(issueKeys);
        const overrideFields = hasOpenTabs ? { hasOpenTab: true } : {};
        this._addIssues(issues, overrideFields);
        console.debug("Issues fetched and stored.", this.issuesList);
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
        const mappedIssue = this._mapIssue(issue, overrideFields);
        if (this.issuesList[issue.key]) {
            Object.assign(this.issuesList[issue.key], mappedIssue);
        } else {
            this.issuesList[issue.key] = mappedIssue;
        }
    }

    _mapIssue(issue, overrideFields) {
        const { id = '', key, fields = {} } = issue;
        const { summary = '', status = null, assignee = null, created = null, updated = null } = fields;

        return {
            id,
            key,
            summary,
            status: status?.name ?? "---",
            assignee: assignee?.displayName,
            assigneeIconUrl: assignee?.avatarUrls?.["16x16"],
            created,
            updated,
            assignedToMe: false,
            hasOpenTab: false,
            isUpdated: true,

            ...overrideFields,
        };
    }
}