import { MessageActionTypes } from '../../enum/message-action-types.enum.js';
import { fillIssuesTable } from "./fillTable.js";
import { fetchSettingsFromBackground } from '../../common/utils.js'
import { JiraHelperService } from '../../services/jira/jiraHelperService.js';

const jiraHelperService = new JiraHelperService()

const ELEMENT_IDS = {
    ISSUE_INPUT: 'issue',
    PREVIEW_LINK: 'preview-link',
    PREVIEW_ERROR: 'preview-error',
    VERSION_UPDATE: 'update',
    LINK_TO_PROJECT: 'link-to-project',
    ISSUES_TABLE: 'issues-table',
    PLACEHOLDERS_TABLE: 'issues-table-placeholders',
    VERSION: 'version',
    GO_BUTTON: 'goButton',
    GO_TO_OPTIONS: 'go-to-options',
    CHK_SHOW_DUE_DATE_ALERT: 'showDueDateAlert',
};

let typingTimer;
let latestRequest = 0;

const issueInputElement = document.getElementById(ELEMENT_IDS.ISSUE_INPUT);
const previewElementLink = document.getElementById(ELEMENT_IDS.PREVIEW_LINK);
const previewElementError = document.getElementById(ELEMENT_IDS.PREVIEW_ERROR);
const versionUpdateElement = document.getElementById(ELEMENT_IDS.VERSION_UPDATE);
const linkToProjectElement = document.getElementById(ELEMENT_IDS.LINK_TO_PROJECT);
const issuesTableElement = document.getElementById(ELEMENT_IDS.ISSUES_TABLE);
const placeholdersTableElement = document.getElementById(ELEMENT_IDS.PLACEHOLDERS_TABLE);
const versionElement = document.getElementById(ELEMENT_IDS.VERSION);
const showDueDateElement = document.getElementById(ELEMENT_IDS.CHK_SHOW_DUE_DATE_ALERT);

document.addEventListener('DOMContentLoaded', async () => {
    console.debug('--- Start loading popup');
    togglePlaceholdersVisibility(true);

    try {
        await jiraHelperService.init();
        await initializeIssuesTableFromCache();
        console.debug('Call Promise All: refreshIssuesTableFromServer(), fetchAndDisplayProjectAndVersion(), checkAndDisplayVersionUpdate()');
        await Promise.all([
            refreshIssuesTableFromServer(),
            applySettingsInfo(),
            checkAndDisplayVersionUpdate()
        ]);
    } catch (error) {
        console.warn('Error during DOMContentLoaded initialization:', error);
    } finally {
        togglePlaceholdersVisibility(false);
    }

    showDueDateElement.addEventListener('change', async function () {
        console.log('🤗 Checkbox changed:', this.checked);
        try {
            const showDueDateAlert = this.checked;
            await chrome.runtime.sendMessage({ action: "saveSettings", settings: { showDueDateAlert }, refreshAll: false });
            console.debug('Settings saved successfully');
        } catch (error) {
            console.log('Error saving settings:', error);
        }
    });

    console.debug('--- Finish loading popup');
});

const applySettingsInfo = async () => {
    try {
        const settings = await fetchSettingsFromBackground();
        showDueDateElement.checked = settings.showDueDateAlert;
        versionElement.textContent = settings.versionDisplay;
        linkToProjectElement.textContent = settings.defaultProjectKey;
        linkToProjectElement.href = settings.boardUrl || await jiraHelperService.guessBoardLink(settings.customDomain, settings.defaultProjectKey);
    } catch (error) {
        console.log('Error fetching project and version:', error);
    }
};

const checkAndDisplayVersionUpdate = async () => {
    try {
        const versionInfo = await VersionService.checkLatestVersion();
        if (versionInfo.isNewerVersion) {
            versionUpdateElement.style.display = 'block';
            versionUpdateElement.textContent = `Version v${versionInfo.remoteVersion} is now available. Click to download.`;
            versionUpdateElement.addEventListener('click', VersionService.startUpdate);
        }
    } catch (error) {
        console.log('Error checking version update:', error);
    }
};

const sendNavigateToIssueMessage = (issueKey, stayInCurrentTab = false) => {
    chrome.runtime.sendMessage({ action: "navigateToIssue", issueKey, stayInCurrentTab });
    window.close();
};

const navigateToIssueFromInput = (stayInCurrentTab = false) => {
    const issueKey = jiraHelperService.getIssueKey(issueInputElement.value.trim());
    sendNavigateToIssueMessage(issueKey, stayInCurrentTab);
};

issueInputElement.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        navigateToIssueFromInput(event.ctrlKey);
    }
});

document.getElementById(ELEMENT_IDS.GO_BUTTON).addEventListener('click', () => navigateToIssueFromInput());

const fetchAndDisplayIssuePreview = async () => {
    const currentRequest = ++latestRequest;
    const issueKey = jiraHelperService.getIssueKey(issueInputElement.value.trim());

    if (issueKey === '') {
        return;
    }

    try {
        const issue = await jiraHelperService.fetchIssueForPreview(issueKey);
        if (currentRequest === latestRequest && issue) {
            if (issue.error) {
                previewElementError.textContent = issue.error;
            } else {
                previewElementLink.textContent = `${issue.key.toUpperCase()}: ${issue.summary}`;
                previewElementLink.href = issue.link;
            }
        }
    } catch (error) {
        console.log('Error fetching issue preview:', error);
    }
};

const clearIssuePreview = () => {
    previewElementLink.textContent = '';
    previewElementLink.href = '#';
    previewElementError.textContent = '';
};

issueInputElement.addEventListener('input', async function () {
    jiraHelperService.AbortFetchIssueForPreview();
    clearTimeout(typingTimer);
    clearIssuePreview();

    typingTimer = setTimeout(async () => {
        await fetchAndDisplayIssuePreview();
    }, 200);
});

document.querySelector(`#${ELEMENT_IDS.GO_TO_OPTIONS}`).addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});

const fetchIssuesList = async (actionType) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: actionType }, response => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response.issuesList);
            }
        });
    });
};

const initializeIssuesTableFromCache = async () => {
    try {
        console.debug('initializeIssuesTableFromCache')
        const issuesList = await fetchIssuesList("getIssuesList");
        togglePlaceholdersVisibility(issuesList.length === 0);
        fillIssuesTable(issuesList, issuesTableElement);
        issuesTableElement.addEventListener("click", event => {
            const issueElement = event.target.closest(".jira-issue");
            if (issueElement) {
                const issueKey = issueElement.getAttribute("data-issue-key");
                if (issueKey) {
                    sendNavigateToIssueMessage(issueKey);
                }
            }
        });
    } catch (error) {
        console.log('Error initializing issues table from cache:', error);
    }
};

const refreshIssuesTableFromServer = async () => {
    try {
        const issuesList = await fetchIssuesList(MessageActionTypes.REFRESH_ISSUES_LIST);
        if (issuesList.length > 0) {
            fillIssuesTable(issuesList, issuesTableElement);
        }
    } catch (error) {
        console.log('Error refreshing issues table from server:', error);
    } finally {
        togglePlaceholdersVisibility(false);
    }
};

const togglePlaceholdersVisibility = (show) => {
    placeholdersTableElement.style.display = show ? 'block' : 'none';
    issuesTableElement.style.display = show ? 'none' : 'block';
};
