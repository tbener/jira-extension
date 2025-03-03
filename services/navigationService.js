import {TabsService} from './tabsService.js';

export class NavigationService {
    baseUrl;
    tabsService;
    useFindExistingTabFeature = true;

    constructor() {
        SettingsHandler.getSettings().then(settings => {
            this.baseUrl = `https://${settings.customDomain}.atlassian.net`;
            this.useFindExistingTabFeature = true;
            this.tabsService = new TabsService(this.baseUrl);
            if (this.useFindExistingTabFeature) {
                this.tabsService.init();
            }
        })
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

        // check if we should try to find whether this issue already open in another tab
        const findExistingTab = this.useFindExistingTabFeature && !stayInCurrentTab;

        if (findExistingTab) {
            if (this.tabsService.activateTabByIssue(issueKey)) {
                return;
            }
        }

        this.openIssueTab(issueKey, stayInCurrentTab);
    };
}
