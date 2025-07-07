import { SettingsService } from './services/settingsService.js';
import { NavigationService } from './services/navigationService.js';
import { IssuesLists } from "./services/issuesLists.js";
import { MessageActionTypes } from './enum/message-action-types.enum.js';

const DEFAULT_CUSTOM_DOMAIN = 'your-domain';
const DEFAULT_PROJECT_KEY = 'JIRA';

const settingsService = new SettingsService();
const navigationService = new NavigationService();
const issuesLists = new IssuesLists();

let isInitialized = false;

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
        { customDomain, defaultProjectKey },
        () => {
            console.debug(`Default settings saved: ${customDomain}, ${defaultProjectKey}`);
        }
    );
}

async function readSettings() {
    await settingsService.readSettings();
    await navigationService.init(settingsService);
}

async function initIssuesList() {
    await issuesLists.init();
    // await issuesLists.addMyIssues();
    // await issuesLists.addIssues(navigationService.tabsService.getIssuesList(), true);
    updateOpenTabs();
    // await issuesLists.updateIssuesList();
    console.debug("Issues list initialized:", issuesLists.getList());
}

function updateOpenTabs() {
    const openTabsIssues = navigationService.tabsService.getIssuesList();
    issuesLists.mergeOpenTabsIssues(openTabsIssues);
}

async function listenToMessages() {
    console.debug("Listening to messages");

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.debug('Message received:', message.action);

        switch (message.action) {
            case MessageActionTypes.NAVIGATE_TO_ISSUE:
                console.debug("Navigation request accepted to ", message.issueKey);
                navigationService.navigateToIssue(message.issueKey, message.stayInCurrentTab);
                sendResponse({ status: "navigation_started" });
                break;
            case MessageActionTypes.GET_SETTINGS:
                (async () => {
                    try {
                        console.debug("Settings requested");
                        await ensureInitialized();
                        sendResponse({ settings: settingsService.settings });
                    } catch (error) {
                        console.warn("Error returning settings from background listener:", error);
                        sendResponse({ error: "Failed to return settings" });
                    }
                })();

                return true; // Indicate an async response

            case MessageActionTypes.SAVE_SETTINGS:
                (async () => {
                    try {
                        console.debug("Settings save requested", message.settings);
                        await ensureInitialized(message.refreshAll);
                        await settingsService.saveSettings(message.settings);
                        sendResponse({ settings: settingsService.settings });
                    } catch (error) {
                        console.warn("Error saving settings:", error);
                        sendResponse({ error: "Failed to save settings" });
                    }
                })();

                return true; // Indicate an async response

            case MessageActionTypes.SETTINGS_CHANGED:
                (async () => {
                    try {
                        console.debug("Settings changed");
                        await ensureInitialized(true);
                        sendResponse({ settings: settingsService.settings });
                    } catch (error) {
                        console.warn("Error re-initializing:", error);
                        sendResponse({ error: "Failed to reload settings" });
                    }
                })();

                return true;
                
            case MessageActionTypes.GET_OPEN_TABS_ISSUES:
                console.debug("Open tabs issues requested");
                const openTabsIssues = navigationService.tabsService.getIssuesList();
                sendResponse({ issueKeys: openTabsIssues });
                break;
            case MessageActionTypes.GET_ISSUES_LIST:
                (async () => {
                    try {
                        console.debug("Issues list requested");
                        await ensureInitialized();
                        updateOpenTabs();
                        sendResponse({ issuesList: issuesLists.getList() });
                    } catch (error) {
                        console.warn("Error fetching issues list:", error);
                        sendResponse({ error: "Failed to fetch issues list" });
                    }
                })();

                return true; // Indicate an async response
            case MessageActionTypes.REFRESH_ISSUES_LIST:

                (async () => {
                    try {
                        console.debug("Issues list refresh requested");
                        await ensureInitialized();
                        await issuesLists.updateIssuesList();
                        sendResponse({ issuesList: issuesLists.getList() });
                    } catch (error) {
                        console.warn("Error refreshing issues list:", error);
                        sendResponse({ error: "Failed to refresh issues list" });
                    }
                })();

                return true; // Indicate an async response
        }

        return true; // Ensure async handling
    });
}

async function ensureInitialized(force) {
    if (!isInitialized || force) {
        console.log(`************  Initializing background script... [${new Date().toISOString()}] ************`);
        await readSettings();
        await initIssuesList();
        isInitialized = true;
        console.log(`++++++++++++ Background script initialized. [${new Date().toISOString()}] ++++++++++++`);
    }
}


(async () => {
    console.debug('Starting background service...');
    await listenToMessages();
    await ensureInitialized();
})();
