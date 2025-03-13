import {SettingsService} from '../../services/settingsService.js';
import {IssuesLists} from "../../services/issuesLists.js";
import {fillIssuesTable} from "./fillTable.js";

let typingTimer;
let latestRequest = 0;

const issueInputElement = document.getElementById('issue');
const previewElementLink = document.getElementById('preview-link');
const previewElementError = document.getElementById('preview-error');
const versionUpdateElement = document.getElementById('update');
const linkToProjectElement = document.getElementById('link-to-project');
const issuesTableElement = document.getElementsByClassName('jira-issues')[0];
const versionElement = document.getElementById('version');

document.addEventListener('DOMContentLoaded', async () => {
    const settingsService = new SettingsService();
    const settings = await settingsService.readSettings();

    await updateUIElements(settings);
    await checkVersion();
    await fillTable();
});

const updateUIElements = async (settings) => {
    linkToProjectElement.textContent = settings.defaultProjectKey;
    linkToProjectElement.href = settings.boardUrl || await JiraService.guessBoardLink(settings.customDomain, settings.defaultProjectKey);
    versionElement.textContent = settings.versionDisplay;
}

const checkVersion = async () => {
    const versionInfo = await VersionService.checkLatestVersion();

    if (versionInfo.isNewerVersion) {
        versionUpdateElement.style.display = 'block'; // Show update notification
        versionUpdateElement.textContent = `Version v${versionInfo.remoteVersion} is now available. Click to download.`;
        versionUpdateElement.addEventListener('click', VersionService.startUpdate);
    }
}

const navigateToIssue = (issueKey, stayInCurrentTab = false) => {
    chrome.runtime.sendMessage({action: "navigateToIssue", issueKey, stayInCurrentTab});
    window.close();
};

const navigateToInputIssue = (stayInCurrentTab = false) => {
    const issueKey = JiraService.getIssueKey(issueInputElement.value.trim());
    navigateToIssue(issueKey, stayInCurrentTab);
};

// Enter: navigate to issue on a new (or found) tab
// Ctrl + Enter: navigate to the issue on the same tab
issueInputElement.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        navigateToInputIssue(event.ctrlKey);
    }
});

document.getElementById('goButton').addEventListener('click', () => navigateToInputIssue());

const setPreview = async () => {
    const currentRequest = ++latestRequest; // Increment and get the latest request number
    const issueKey = JiraService.getIssueKey(issueInputElement.value.trim());

    if (issueKey === '') {
        return;
    }

    try {
        const issue = await JiraService.fetchIssue(issueKey);
        console.debug('ISSUE: ', issue);
        if (currentRequest === latestRequest && issue) { // Ensure this is the latest request
            if (issue.error) {
                previewElementError.textContent = issue.error;
            } else {
                previewElementLink.textContent = `${issue.key.toUpperCase()}: ${issue.summary}`;
                previewElementLink.href = issue.link;
            }
        }
    } catch (error) {
        // do nothing
    }
};

const clearPreview = () => {
    previewElementLink.textContent = '';
    previewElementLink.href = '#';
    previewElementError.textContent = '';
}

issueInputElement.addEventListener('input', async function () {
    JiraService.abort(); // Always abort the previous request

    clearTimeout(typingTimer);
    clearPreview();

    typingTimer = setTimeout(async () => {
        await setPreview();
    }, 200);
});

document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});

const fillTable = async () => {
    const issuesLists = new IssuesLists();
    await issuesLists.init();
    await issuesLists.addMyIssues();

    fillIssuesTable(issuesLists.getList(), issuesTableElement);

    issuesTableElement.addEventListener("click", event => {
        const issueElement = event.target.closest(".jira-issue");
        if (issueElement) {
            const issueKey = issueElement.getAttribute("data-issue-key");
            if (issueKey) {
                navigateToIssue(issueKey);
            }
        }
    });
}
