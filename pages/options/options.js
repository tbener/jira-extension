import { SettingsService } from '../../services/settingsService.js';
import { MessageActionTypes } from '../../enum/message-action-types.enum.js'
import { JiraHelperService } from '../../services/jira/jiraHelperService.js';

const jiraHelperService = new JiraHelperService()
const settingsService = new SettingsService();

const updateNotificationElement = document.getElementsByClassName('update-notification')[0];
const upToDateNotificationElement = document.getElementsByClassName('update-not-required')[0];
const downloadUpdateElement = document.getElementById('download-update');
const checkUpdateElement = document.getElementById('checkUpdateButton');
const boardLinkElement = document.getElementById('boardLinkA');
const boardLinkInputElement = document.getElementById('boardLinkInput');

checkUpdateElement.addEventListener('click', async () => checkUpdate(true));

document.addEventListener('DOMContentLoaded', async () => {
    await jiraHelperService.init();

    updateNotificationElement.addEventListener('click', VersionService.startUpdate);
    downloadUpdateElement.addEventListener('click', VersionService.startUpdate);

    restoreOptions();
    checkUpdate(false);
});

const checkUpdate = async (force = false) => {
    const versionInfo = await VersionService.checkLatestVersion(force);

    if (versionInfo.isNewerVersion) {
        upToDateNotificationElement.style.display = 'none';
        updateNotificationElement.style.display = 'block';
        updateNotificationElement.textContent = `Version v${versionInfo.remoteVersion} is now available. Click to download.`;
    } else {
        updateNotificationElement.style.display = 'none';
        upToDateNotificationElement.style.display = force ? 'block' : 'none';
    }
}

// Saves options to chrome.storage
const saveOptions = () => {
    const settings = {
        customDomain: document.getElementById('customDomain').value,
        defaultProjectKey: document.getElementById('defaultProjectKey').value,
        useSmartNavigation: document.getElementById('useSmartNavigation').checked,
        boardUrl: boardLinkInputElement.value
    }

    settingsService.saveSettings(settings);
    const status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(() => {
        status.textContent = '';
    }, 3000);

    chrome.runtime.sendMessage({ action: MessageActionTypes.SETTINGS_CHANGED });

};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = async () => {
    try {
        const settings = await settingsService.readSettings();

        document.getElementById('customDomain').value = settings.customDomain;
        document.getElementById('defaultProjectKey').value = settings.defaultProjectKey;
        document.getElementById('version').textContent = settings.versionDisplay;
        document.getElementById('useSmartNavigation').checked = settings.useSmartNavigation;
        boardLinkInputElement.value = settings.boardUrl;

        await setBoardLink();

    } catch (error) {
        console.warn('Error restoring options:', error);
    }
};

const setBoardLink = async () => {
    let boardLink = boardLinkInputElement.value;
    if (boardLink === '') {
        const domain = document.getElementById('customDomain').value;
        const projectKey = document.getElementById('defaultProjectKey').value;
        boardLinkElement.textContent = "Searching...";
        boardLink = await jiraHelperService.guessBoardLink(domain, projectKey);
    }
    boardLinkElement.href = boardLink;
    boardLinkElement.textContent = boardLink;
}

const copyBoardLinkToInput = async () => {
    boardLinkInputElement.value = boardLinkElement.textContent;
}

document.getElementById('saveButton').addEventListener('click', saveOptions);
document.getElementById('setBoardLink').addEventListener('click', copyBoardLinkToInput);

document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', async (event) => {
        await setBoardLink();
    });
});