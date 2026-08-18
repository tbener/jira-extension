import { MessageActionTypes } from '../enum/message-action-types.enum.js';

// Injected directly into the tab via chrome.scripting.executeScript once it's done loading - NOT
// a content script, so it must be fully self-contained: no closures over outer variables, no
// imports, only what's passed in via args. Shows a toast, top-center, that fades out on its own;
// clicking the button asks the background to close this tab and switch to the existing one (a
// content-page script can't call chrome.tabs directly).
function renderSwitchToTabToast(existingTabId, switchActionType) {
    const TOAST_ID = 'extension-switch-tab-toast';
    if (document.getElementById(TOAST_ID)) {
        return;
    }

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        font-weight: 500;
        color: #172b4d;
        background-color: #fff;
        border: 1px solid #dfe1e6;
        border-radius: 6px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const text = document.createElement('span');
    text.textContent = 'This issue is already open in another tab.';
    toast.appendChild(text);

    const switchBtn = document.createElement('button');
    switchBtn.textContent = 'Close & switch';
    switchBtn.style.cssText = `
        border: none;
        background-color: #0052cc;
        color: #fff;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 12px;
        cursor: pointer;
    `;
    switchBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: switchActionType, existingTabId });
    });
    toast.appendChild(switchBtn);

    const FADE_OUT_MS = 300;
    const dismiss = () => {
        clearTimeout(autoFadeTimer);
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), FADE_OUT_MS);
    };

    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = '✕';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    dismissBtn.style.cssText = `
        border: none;
        background: transparent;
        color: #6b778c;
        font-size: 15px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        margin-left: 4px;
    `;
    dismissBtn.addEventListener('click', dismiss);
    toast.appendChild(dismissBtn);

    document.body.appendChild(toast);

    const FADE_IN_DELAY_MS = 10;
    const VISIBLE_MS = 5000;

    setTimeout(() => { toast.style.opacity = '1'; }, FADE_IN_DELAY_MS);
    const autoFadeTimer = setTimeout(dismiss, VISIBLE_MS);
}

export class TabsService {
    tabs = {};
    baseUrl = '';
    settingsService = null;
    // tabId -> existingTabId, for a tab whose navigation was detected as already open elsewhere.
    // The actual toast is deferred until the tab reaches status 'complete', since executeScript
    // needs a loaded page to inject into.
    pendingSwitchNotices = {};

    async readTabs(baseUrl, settingsService) {
        this.baseUrl = baseUrl.toLowerCase();
        this.settingsService = settingsService;

        this.scanTabs();

        chrome.tabs.onCreated.addListener((tab) => this.trackTab(tab));
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.updateTab(tabId, changeInfo, tab));
        chrome.tabs.onRemoved.addListener((tabId) => this.handleTabClosed(tabId));
    }

    // Only for tabs that actually closed - removeTab() is also called from updateTab() when a
    // tab's URL changes, where a pending toast must NOT be cleared (checkForExistingTab() just
    // set it moments earlier, for the status:'complete' handler to act on).
    handleTabClosed = (tabId) => {
        delete this.pendingSwitchNotices[tabId];
        this.removeTab(tabId);
    }

    // Re-syncs tracking from the browser's actual tab list - e.g. after a tab closes, in case
    // another tab was also showing that issue.
    scanTabs() {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                this.trackTab(tab);
            });
        });
    }

    trackTab = (tab) => {
        const issueKey = this.extractIssueFromUrl(tab.url);
        if (issueKey) {
            this.tabs[issueKey] = tab;
        }
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

    updateTab(tabId, changeInfo, tab) {
        if (changeInfo.url) {
            console.debug("Tab Url updated:", changeInfo);
            // Check before removeTab()/trackTab() overwrite this.tabs, so the previously-tracked
            // tab for this issue (if any) is still visible here. A plain refresh never reaches
            // this branch at all, since changeInfo.url is only present when the URL changes.
            this.checkForExistingTab(tabId, tab);
            this.removeTab(tabId);
            this.trackTab(tab);
        }

        if (changeInfo.status === 'complete' && tabId in this.pendingSwitchNotices) {
            const existingTabId = this.pendingSwitchNotices[tabId];
            delete this.pendingSwitchNotices[tabId];
            this.showSwitchNotice(tabId, existingTabId);
        }
    }

    // Experimental enhancement of Smart Navigation: extends the "switch to an existing tab"
    // behavior to links opened outside the popup. Requires both settings, since it only makes
    // sense as an extension of the base feature.
    checkForExistingTab = (tabId, tab) => {
        if (!this.settingsService?.settings?.useSmartNavigation || !this.settingsService?.settings?.useSmartNavigationExtended) {
            return;
        }

        const issueKey = this.extractIssueFromUrl(tab.url);
        if (!issueKey) {
            return;
        }

        const existingTab = this.tabs[issueKey];
        if (!existingTab || existingTab.id === tabId) {
            return;
        }

        console.debug(`Issue ${issueKey} already open in tab ${existingTab.id}; will offer to switch once tab ${tabId} loads`);
        this.pendingSwitchNotices[tabId] = existingTab.id;
    }

    showSwitchNotice = (tabId, existingTabId) => {
        chrome.scripting.executeScript({
            target: { tabId },
            func: renderSwitchToTabToast,
            args: [existingTabId, MessageActionTypes.SWITCH_TO_EXISTING_TAB]
        }).catch((error) => console.debug('Could not show switch-tab notice:', error.message));
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

            // Check for "/issues/MD-2501?filter=-1"
            const issuesMatch = parsedUrl.pathname.match(/\/issues\/([A-Z]+-\d+)/);
            if (issuesMatch) {
                return issuesMatch[1];
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
