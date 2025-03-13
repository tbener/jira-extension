import {SettingsService} from './services/settingsService.js';
import {NavigationService} from './services/navigationService.js';

const DEFAULT_CUSTOM_DOMAIN = 'mdclone';
const DEFAULT_PROJECT_KEY = 'ADAMS';

const settingsService = new SettingsService();
const navigationService = new NavigationService();

chrome.runtime.onInstalled.addListener(function (details) {
    // Check if the extension is newly installed
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        // Save default settings or perform any necessary setup
        saveDefaultSettings();
    } else if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
        chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
                console.error('Error clearing storage:', chrome.runtime.lastError);
            }
        });
    }
});

function saveDefaultSettings() {
    const customDomain = DEFAULT_CUSTOM_DOMAIN;
    const defaultProjectKey = DEFAULT_PROJECT_KEY;

    chrome.storage.sync.set(
        {customDomain, defaultProjectKey},
        () => {
            console.debug(`Default settings saved: ${customDomain}, ${defaultProjectKey}`);
        }
    );
}

async function refreshSettings() {
    await settingsService.readSettings();
    await navigationService.init(settingsService);
}

(async () => {
    await refreshSettings();

    // Listen for navigation requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.debug('Message received:', message.action);
        if (message.action === "navigateToIssue") {
            console.debug("Navigation request accepted to ", message.issueKey);
            navigationService.navigateToIssue(message.issueKey, message.stayInCurrentTab);
            sendResponse({status: "navigation_started"});
        } else if (message.action === "settingsChanged") {
            refreshSettings();
        } else if (message.action === "getOpenTabsIssues") {
            console.debug("Open tabs issues requested");
            const openTabsIssues = navigationService.tabsService.getIssuesList();
            sendResponse({issueKeys: openTabsIssues});
        }
    });
})();
