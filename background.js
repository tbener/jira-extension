import { SettingsService } from './services/settingsService.js';
import { NavigationService } from './services/navigationService.js';
import { IssuesLists } from "./services/issuesLists.js";
import { MessageActionTypes } from './enum/message-action-types.enum.js';

const DEFAULT_CUSTOM_DOMAIN = 'mdclone';
const DEFAULT_PROJECT_KEY = 'ADAMS';

const settingsService = new SettingsService();
const navigationService = new NavigationService();
const issuesLists = new IssuesLists();

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

async function refreshSettings() {
    await settingsService.readSettings();
    await navigationService.init(settingsService);
}

async function initIssuesList() {
    await issuesLists.init();
    await issuesLists.addMyIssues();
    await issuesLists.addIssues(navigationService.tabsService.getIssuesList(), true);
    console.debug("Issues list initialized:", issuesLists.getList());
}

function updateIssuesList() {
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
            case MessageActionTypes.GET_SETTIGNS:
                console.debug("Settings requested");
                sendResponse({ settings: settingsService.settings });
                break;
            case MessageActionTypes.SETTINGS_CHANGED:
                refreshSettings();
                sendResponse({ status: "settings_refreshed" });
                break;
            case MessageActionTypes.GET_OPEN_TABS_ISSUES:
                console.debug("Open tabs issues requested");
                const openTabsIssues = navigationService.tabsService.getIssuesList();
                sendResponse({ issueKeys: openTabsIssues });
                break;
            case MessageActionTypes.GET_ISSUES_LIST:
                console.debug("Issues list requested");
                updateIssuesList();
                sendResponse({ issuesList: issuesLists.getList() });
                break;
            case MessageActionTypes.REFRESH_ISSUES_LIST:
                (async () => {
                    console.debug("Issues list refresh requested");
                    await issuesLists.refreshIssues();
                    sendResponse({ issuesList: issuesLists.getList() });
                })();
                return true; // Indicate an async response
        }

        return true; // Ensure async handling
    });
}


(async () => {
    await listenToMessages();

    await refreshSettings();
    await initIssuesList();
    console.log("Background script initialized.");
})();
