import {TabsService} from "./tabsService.js";

export class NavigationService {
    tabsService = new TabsService();
    settingsService;

    init = async (settingsService) => {
        this.settingsService = settingsService;
        await this.tabsService.readTabs(this.baseUrl, this.settingsService);
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

    getSearchLink = (jql) => {
        return `${this.baseUrl}/issues/?jql=${encodeURIComponent(jql)}`;
    }

    openTab = (url, stayInCurrentTab = false) => {
        if (stayInCurrentTab) {
            chrome.tabs.update({url});
        } else {
            chrome.tabs.create({url});
        }
    };

    openIssueTab = (issueKey, stayInCurrentTab = false) => {
        this.openTab(this.getIssueLink(issueKey), stayInCurrentTab);
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

    navigateToSearch = (jql, stayInCurrentTab = false) => {
        this.openTab(this.getSearchLink(jql), stayInCurrentTab);
    };
}
