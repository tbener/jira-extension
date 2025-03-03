export class TabsService {
    tabs = {};
    baseUrl = '';

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }

    init = () => {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                this.checkAddTab(tab);
            });
        })
    }

    activateTabByIssue = (issueKey) => {
        const tab = this.tabs[issueKey];
        if (!tab) {
            return false;
        }
        chrome.tabs.update(tab.id, {active: true});
        return true;
    }

    getTabByIssue = (issueKey) => {
        return this.tabs[issueKey] || null;
    };

    checkAddTab = (tab) => {
        const issueKey = this.extractIssueFromUrl(tab.url);
        if (issueKey) {
            this.tabs[issueKey] = tab;
            // console.log(`Added tab for issue ${issueKey}:`, tab);
        }
    }

    extractIssueFromUrl = (url) => {
        try {
            const parsedUrl = new URL(url);

            // Ensure the URL belongs to the JIRA domain
            if (parsedUrl.origin.toLowerCase() !== this.baseUrl.toLowerCase()) {
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
