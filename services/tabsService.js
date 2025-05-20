export class TabsService {
    tabs = {};
    baseUrl = '';

    async readTabs(baseUrl) {
        this.baseUrl = baseUrl.toLowerCase();

        this.scanTabs();

        chrome.tabs.onCreated.addListener((tab) => this.checkAddTab(tab));
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.updateTab(tabId, changeInfo, tab));
        chrome.tabs.onRemoved.addListener((tabId) => this.removeTab(tabId));
    }

    scanTabs() {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                this.checkAddTab(tab);
            });
        });
    }

    activateTabByIssue = (issueKey) => {
        const tab = this.tabs[issueKey];
        if (!tab) {
            return false;
        }

        chrome.tabs.update(tab.id, { active: true }, () => {
            chrome.windows.update(tab.windowId, { focused: true });
        });

        return true;
    }

    checkAddTab = (tab) => {
        const issueKey = this.extractIssueFromUrl(tab.url);
        if (issueKey) {
            this.tabs[issueKey] = tab;
            console.debug(`Added tab for issue ${issueKey}:`, tab);
        }
    }

    updateTab(tabId, changeInfo, tab) {
        if (changeInfo.url) {
            console.debug("Tab Url updated:", changeInfo);
            this.removeTab(tabId);
            this.checkAddTab(tab);
        }
    }

    removeTab(tabId) {
        const issueKey = Object.keys(this.tabs).find(key => this.tabs[key].id === tabId);

        if (issueKey) {
            delete this.tabs[issueKey];
            console.debug(`Removed tab tracking for issue ${issueKey}`);
        }

        this.scanTabs();
        console.debug("Tabs after removal:", this.tabs);
    }

    getIssuesList() {
        return Object.keys(this.tabs);
    }

    extractIssueFromUrl = (url) => {
        try {
            if (!url) {
                return null;
            }
            
            const parsedUrl = new URL(url);

            // Ensure the URL belongs to the JIRA domain
            if (parsedUrl.origin.toLowerCase() !== this.baseUrl) {
                return null; // Not a JIRA-related URL
            }

            // Check for "/browse/ISSUE-123"
            const browseMatch = parsedUrl.pathname.match(/\/browse\/([A-Z]+-\d+)/);
            if (browseMatch) {
                return browseMatch[1];
            }

            // Check for "/boards/xxx?selectedIssue=ISSUE-123"
            const selectedIssue = parsedUrl.searchParams.get("selectedIssue");
            if (selectedIssue && /^[A-Z]+-\d+$/.test(selectedIssue)) {
                return selectedIssue;
            }

            return null;
        } catch (error) {
            console.log("Invalid URL:", url, error.message || error.toString());
            return null;
        }
    };
}
