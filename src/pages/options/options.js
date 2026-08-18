import { SettingsService } from '../../services/settingsService.js';
import { MessageActionTypes } from '../../enum/message-action-types.enum.js'
import { JiraHelperService } from '../../services/jira/jiraHelperService.js';

const jiraHelperService = new JiraHelperService()
const settingsService = new SettingsService();

const boardLinkElement = document.getElementById('boardLinkA');
const boardLinkInputElement = document.getElementById('boardLinkInput');

document.addEventListener('DOMContentLoaded', async () => {
    await jiraHelperService.init();
    restoreOptions();

    const params = new URLSearchParams(window.location.search);
    if (params.has('welcome')) {
        // display pin message
        const pinCard = document.querySelector('.pin-card-container');
        const dismissBtn = document.getElementById('dismiss-pin-msg');
        if (pinCard) {
            pinCard.classList.add('show');
            dismissBtn.addEventListener('click', () => {
                pinCard.classList.remove('show');
            });
        }
    }
});

const ADDITIONAL_USER_FIELD_COUNT = 3;

const getAdditionalUserFieldRow = (index) => {
    const row = document.querySelector(`.additional-user-field-row[data-field-index="${index}"]`);
    return {
        input: row.querySelector('[data-role="field-id"]'),
        nameSpan: row.querySelector('[data-role="field-name"]'),
    };
};

// Looks up one row's field id and shows the resolved name inline (fetched from Jira, not
// user-entered) or an inline warning - returns null for an empty row, otherwise { id, name }
// (name is '' if the field couldn't be resolved). This is informational only and never
// blocks saving: a field id you didn't type in yourself (e.g. the shipped-in-default QA
// Assignee field) shouldn't be able to hold up every other setting on this page just
// because it doesn't happen to exist on your instance, and a wrong/unreachable id already
// fails safely at search time (falls back to Assignee/Reporter - see fetchUserSearch).
const resolveAdditionalUserFieldRow = async (index) => {
    const { input, nameSpan } = getAdditionalUserFieldRow(index);
    const id = input.value.trim();

    if (!id) {
        nameSpan.textContent = '';
        nameSpan.className = 'text-muted small';
        return null;
    }

    nameSpan.textContent = 'Checking...';
    nameSpan.className = 'text-muted small';

    // Validate against whatever domain/project is currently typed in, not whatever was
    // saved when the page opened - matters most on first-time setup, when those fields
    // are still blank/placeholder until this same save.
    jiraHelperService.updateConnectionSettings(
        document.getElementById('customDomain').value.trim(),
        document.getElementById('defaultProjectKey').value.trim()
    );

    const field = await jiraHelperService.fetchFieldInfo(id);
    if (!field) {
        nameSpan.textContent = 'Not found';
        nameSpan.className = 'text-danger small';
        return { id, name: '' };
    }

    nameSpan.textContent = field.name;
    nameSpan.className = 'text-muted small';
    return { id, name: field.name };
};

// Resolves all 3 rows in parallel - returns the final additionalUserFields array, with
// empty rows dropped. Invalid ones are kept (flagged inline by resolveAdditionalUserFieldRow)
// rather than blocking the save.
const resolveAdditionalUserFields = async () => {
    const results = await Promise.all(
        Array.from({ length: ADDITIONAL_USER_FIELD_COUNT }, (_, index) => resolveAdditionalUserFieldRow(index))
    );
    return results.filter(Boolean);
};

document.querySelectorAll('.additional-user-field-row [data-role="field-id"]').forEach(input => {
    input.addEventListener('blur', () => {
        const index = Number(input.closest('.additional-user-field-row').dataset.fieldIndex);
        resolveAdditionalUserFieldRow(index);
    });
});

// Saves options to chrome.storage
const saveOptions = async () => {
    const saveButton = document.getElementById('saveButton');

    saveButton.disabled = true;
    try {
        const additionalUserFields = await resolveAdditionalUserFields();

        const settings = {
            customDomain: document.getElementById('customDomain').value,
            defaultProjectKey: document.getElementById('defaultProjectKey').value,
            useSmartNavigation: document.getElementById('useSmartNavigation').checked,
            showDueDateAlert: document.getElementById('showDueDateAlert').checked,
            boardUrl: boardLinkInputElement.value,
            myIssuesJql: document.getElementById('myIssuesJql').value,
            includeTodoInDefaultView: document.getElementById('includeTodoInDefaultView').checked,
            useSmartNavigationExtended: document.getElementById('useSmartNavigationExtended').checked,
            showBoardDebugIndicator: document.getElementById('showBoardDebugIndicator').checked,
            additionalUserFields,
        }

        settingsService.saveSettings(settings);
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 3000);

        chrome.runtime.sendMessage({ action: MessageActionTypes.SETTINGS_CHANGED });
    } finally {
        saveButton.disabled = false;
    }
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
        document.getElementById('showDueDateAlert').checked = settings.showDueDateAlert;
        boardLinkInputElement.value = settings.boardUrl;
        document.getElementById('myIssuesJql').value = settings.myIssuesJql;
        for (let index = 0; index < ADDITIONAL_USER_FIELD_COUNT; index++) {
            const field = settings.additionalUserFields?.[index];
            const { input, nameSpan } = getAdditionalUserFieldRow(index);
            input.value = field?.id ?? '';
            nameSpan.textContent = field?.name ?? '';
        }
        document.getElementById('includeTodoInDefaultView').checked = settings.includeTodoInDefaultView;
        document.getElementById('useSmartNavigationExtended').checked = settings.useSmartNavigationExtended;
        document.getElementById('showBoardDebugIndicator').checked = settings.showBoardDebugIndicator;
        updateSmartNavigationExtendedAvailability();

        await setBoardLink();

    } catch (error) {
        console.warn('Error restoring options:', error);
    }
};

// The "extend to any link" setting is an enhancement of Smart Navigation, so it only makes
// sense to offer it when Smart Navigation itself is on.
const updateSmartNavigationExtendedAvailability = () => {
    document.getElementById('useSmartNavigationExtended').disabled = !document.getElementById('useSmartNavigation').checked;
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
document.getElementById('resetMyIssuesJql').addEventListener('click', () => {
    document.getElementById('myIssuesJql').value = settingsService.defaultSettings.myIssuesJql;
});
document.getElementById('useSmartNavigation').addEventListener('change', updateSmartNavigationExtendedAvailability);

document.querySelectorAll('input[type="text"]').forEach(input => {
    input.addEventListener('input', async (event) => {
        await setBoardLink();
    });
});