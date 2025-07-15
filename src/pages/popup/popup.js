import { MessageActionTypes } from '../../enum/message-action-types.enum.js';
import { fillIssuesTable } from "./fillTable.js";
import { fetchSettingsFromBackground } from '../../common/utils.js'
import { JiraHelperService } from '../../services/jira/jiraHelperService.js';

const jiraHelperService = new JiraHelperService()

const ELEMENT_IDS = {
    ISSUE_INPUT: 'issue',
    VERSION_UPDATE: 'update',
    DEFAULT_PROJECT: 'default-project',
    LINK_TO_BOARD: 'link-to-board',
    ISSUES_TABLE: 'issues-table',
    PLACEHOLDERS_TABLE: 'issues-table-placeholders',
    VERSION: 'version',
    GO_BUTTON: 'goButton',
    GO_TO_OPTIONS: 'go-to-options',
    CHK_SHOW_DUE_DATE_ALERT: 'showDueDateAlert',
    FILTER_BUTTONS_CONTAINER: 'filter-buttons-container',
};

const FILTERS = {
    ALL: { id: 'all', label: 'Show All', icon: 'all', hidden: true },
    OPEN_TABS: { id: 'open-tabs', label: 'Open Tabs', icon: 'tab' },
    MY: { id: 'my', label: 'My Issues', icon: 'avatar' },
    SEARCH_RESULTS: { id: 'search-results', label: 'Search Results', icon: 'search', hidden: 'auto' },
    // SUGGESTED: { id: 'suggested', label: 'Suggested', icon: 'suggested' },
    // FAVORITES: { id: 'favorites', label: 'Favorites', icon: 'favorites'}
};

let issuesList = [];
let typingTimer;
let currentFilter = null;
let originalProjectValue;

const issueInputElement = document.getElementById(ELEMENT_IDS.ISSUE_INPUT);
const versionUpdateElement = document.getElementById(ELEMENT_IDS.VERSION_UPDATE);
const defaultProjectElement = document.getElementById(ELEMENT_IDS.DEFAULT_PROJECT);
const linkToBoardElement = document.getElementById(ELEMENT_IDS.LINK_TO_BOARD);
const issuesTableElement = document.getElementById(ELEMENT_IDS.ISSUES_TABLE);
const placeholdersTableElement = document.getElementById(ELEMENT_IDS.PLACEHOLDERS_TABLE);
const versionElement = document.getElementById(ELEMENT_IDS.VERSION);
const showDueDateElement = document.getElementById(ELEMENT_IDS.CHK_SHOW_DUE_DATE_ALERT);
const filterButtonsContainer = document.getElementById(ELEMENT_IDS.FILTER_BUTTONS_CONTAINER);

document.addEventListener('DOMContentLoaded', async () => {
    console.debug('--- Start loading popup');
    togglePlaceholdersVisibility(true);

    // Clipboard check for jira issue format, and auto-fill input
    issueInputElement.addEventListener('focus', async function handleClipboardPasteOnce() {
        console.debug(`Checking clipboard for number input... secureContext: ${window.isSecureContext}`);
        if (issueInputElement && navigator.clipboard && window.isSecureContext) {
            try {
                const text = await navigator.clipboard.readText();
                const trimmedText = text.trim();
                if (/^[A-Z][A-Z0-9_]+-\d+$/i.test(trimmedText)) {
                    console.debug('Clipboard text matched format:', trimmedText);
                    issueInputElement.value = trimmedText;
                    issueInputElement.select();
                    handleIssueInput();
                }
            } catch (err) {
                console.log('Clipboard read failed:', err);
            }
        } else {
            console.log(`Clipboard access not available or not secure context. Reason: ${!issueInputElement ? 'issueInputElement is null' : ''} ${!navigator.clipboard ? 'navigator.clipboard is not available' : ''} ${!window.isSecureContext ? 'window.isSecureContext is false' : ''}`);
        }
        // Remove this event listener after first use
        issueInputElement.removeEventListener('focus', handleClipboardPasteOnce);
    });

    try {
        addFilterButtons();
        applyFilter(FILTERS.ALL);
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
        defaultProjectElement.textContent = settings.defaultProjectKey;
        originalProjectValue = defaultProjectElement.textContent;
        linkToBoardElement.href = settings.boardUrl || await jiraHelperService.guessBoardLink(settings.customDomain, settings.defaultProjectKey);
    } catch (error) {
        console.log('Error fetching project and version:', error);
    }
};

defaultProjectElement.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        defaultProjectElement.textContent = originalProjectValue;
        issueInputElement.focus();
        event.preventDefault();
    } else if (event.key === 'Enter') {
        issueInputElement.focus();
        event.preventDefault();
    }
});

defaultProjectElement.addEventListener('focusout', async function () {
    try {
        const newProjectKey = defaultProjectElement.textContent.trim();
        if (newProjectKey !== originalProjectValue) {
            await chrome.runtime.sendMessage({
                action: MessageActionTypes.SAVE_SETTINGS,
                settings: { defaultProjectKey: newProjectKey },
                refreshAll: true
            });
            originalProjectValue = newProjectKey;
            console.debug('Default project key saved successfully');
        }
    } catch (error) {
        console.log('Error saving default project key:', error);
    }
});

const checkAndDisplayVersionUpdate = async () => {
    try {
        const versionInfo = await VersionService.checkLatestVersion();
        if (versionInfo.isNewerVersion) {
            versionUpdateElement.style.display = 'block';
            versionUpdateElement.textContent = `Version v${versionInfo.remoteVersion} is now available. Click to download.`;
            versionUpdateElement.addEventListener('click', VersionService.startUpdate);

            const hintSpan = document.createElement('div');
            hintSpan.className = 'text-muted small';
            hintSpan.textContent = 'If the file does not automatically start downloading, please open the popup and click it again.';
            versionUpdateElement.appendChild(hintSpan);
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

const fetchAndDisplayIssueFromInput = async () => {
    const issueKey = jiraHelperService.getIssueKey(issueInputElement.value.trim());

    const handleNoResults = () => {
        applyFilter(FILTERS.ALL);
        hideFilter(FILTERS.SEARCH_RESULTS);
    };

    if (issueKey === '') {
        handleNoResults();
        return;
    }

    try {
        const issue = await jiraHelperService.fetchIssue(issueKey, { searchResults: true });
        if (issue) {
            console.log('Issue fetched by input:', issue);
            issuesList = issuesList.filter(issue => !issue.searchResults);
            console.log('Filtered issuesList:', issuesList);
            issuesList.push({ ...issue });
            console.log('Updated issuesList:', issuesList);
            applyFilter(FILTERS.SEARCH_RESULTS, false);
        }
        else {
            handleNoResults();
        }
    } catch (error) {
        console.log('Error updating search results from input:', error);
    }
};

const clearSearchResults = () => {
    issuesList = issuesList.filter(issue => !issue.searchResults);
    if (currentFilter?.id === FILTERS.SEARCH_RESULTS.id) {
        applyFilter(currentFilter);
    }
};

const handleIssueInput = async function () {
    jiraHelperService.AbortFetch();
    clearTimeout(typingTimer);
    clearSearchResults();

    typingTimer = setTimeout(async () => {
        await fetchAndDisplayIssueFromInput();
    }, 200);
};

issueInputElement.addEventListener('input', handleIssueInput);

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
        issuesList = await fetchIssuesList(MessageActionTypes.REFRESH_ISSUES_LIST);
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

const hideFilter = (filter) => {
    const button = filterButtonsContainer.querySelector(`#filter-${filter.id}-button`);
    if (button) {
        button.setAttribute('hidden', 'true');
    }
};

const applyFilter = (filter, toggle = true) => {
    if (toggle && currentFilter?.id === filter?.id) {
        filter = FILTERS.ALL;
    }
    currentFilter = filter;
    console.log(`Applying filter: ${filter.label}`);

    const input = filterButtonsContainer.querySelector(`#filter-${filter.id}`);
    if (input) {
        input.checked = true;
        if (filter.hidden === 'auto') {
            // make sure the button is visible
            const button = input.closest('.filter-button');
            if (button) {
                button.removeAttribute('hidden');
            }
        }
    }

    if (!issuesList?.length > 0) {
        return;
    }

    let filteredIssues = issuesList;

    switch (filter.id) {
        case FILTERS.SEARCH_RESULTS.id:
            filteredIssues = issuesList.filter(issue => issue.searchResults);
            break;
        case FILTERS.OPEN_TABS.id:
            filteredIssues = issuesList.filter(issue => issue.hasOpenTab);
            break;
        case FILTERS.MY.id:
            filteredIssues = issuesList.filter(issue => issue.assignedToMe);
            break;
        default:
        // No filter applied, show all issues
    }

    fillIssuesTable(filteredIssues, issuesTableElement);
};

const addFilterButtons = () => {
    const template = filterButtonsContainer.querySelector('#filter-button-template');
    if (!template) {
        console.error('Filter button template not found in the DOM.');
        return;
    }

    Object.values(FILTERS).forEach(filter => {
        // Duplicate the span in the template for each button
        const button = template.firstElementChild.cloneNode(true);
        const input = button.querySelector('input');
        const label = button.querySelector('label');
        const icon = label.querySelector('use');

        button.id = `filter-${filter.id}-button`;
        input.id = `filter-${filter.id}`;
        label.setAttribute('for', input.id);
        label.title = filter.label;
        if (filter.hidden) {
            button.setAttribute('hidden', 'true');
        }

        if (icon) {
            icon.setAttribute('href', `sprite.svg#${filter.icon}`);
        }

        input.addEventListener('click', () => {
            console.log(`Filter ${filter.label} clicked`);
            applyFilter(filter);
        });
        filterButtonsContainer.appendChild(button);
    });
}