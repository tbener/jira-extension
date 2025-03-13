import {TabsService} from "./tabsService.js";

export class NavigationService {
    tabsService = new TabsService();
    settingsService;

    init = async (settingsService) => {
        this.settingsService = settingsService;
        await this.tabsService.readTabs(this.baseUrl);
    }

    get settings() {
        return this.settingsService.settings;
    }

    get baseUrl() {
        return `https://${this.settings.customDomain}.atlassian.net`;
    }

    getIssueLink = (issueKey) => {
        return `${this.baseUrl}/browse/${issueKey}`;
    }

    openIssueTab = (issueKey, stayInCurrentTab = false) => {
        const url = this.getIssueLink(issueKey);

        // Navigate to the Jira issue page
        if (stayInCurrentTab) {
            chrome.tabs.update({url});
        } else {
            chrome.tabs.create({url});
        }
    };

    navigateToIssue = (issueKey, stayInCurrentTab = false) => {
        if (this.settings.useSmartNavigation) {
            // smart navigation takes over stayInCurrentTab (otherwise we will lose the other tab)
            if (this.tabsService.activateTabByIssue(issueKey)) {
                return;
            }
        }

        this.openIssueTab(issueKey, stayInCurrentTab);
    };
}
