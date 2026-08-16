import { MessageActionTypes } from '../../enum/message-action-types.enum.js';
import { fillIssuesTable } from "./fillTable.js";
import { fetchSettingsFromBackground } from '../../common/utils.js'
import { JiraHelperService } from '../../services/jira/jiraHelperService.js';
import { CONFIG } from '../../config.js';
import { renderUserSuggestions, clearUserSuggestions, moveHighlight, getHighlightedUser, isOpen as isUserPickerOpen, onSuggestionSelected } from './userPicker.js';

const jiraHelperService = new JiraHelperService()

const ELEMENT_IDS = {
    ISSUE_INPUT: 'issue',
    DEFAULT_PROJECT: 'default-project',
    LINK_TO_BOARD: 'link-to-board',
    ISSUES_TABLE: 'issues-table',
    PLACEHOLDERS_TABLE: 'issues-table-placeholders',
    VERSION: 'version',
    GO_BUTTON: 'goButton',
    GO_TO_OPTIONS: 'go-to-options',
    CHK_SHOW_DUE_DATE_ALERT: 'showDueDateAlert',
    FILTER_BUTTONS_CONTAINER: 'filter-buttons-container',
    SEARCH_RESULTS_COUNT: 'search-results-count',
};

const FILTERS = {
    DEFAULT: { id: 'default', label: 'Default', icon: 'all', hidden: true },
    OPEN_TABS: { id: 'open-tabs', label: 'Open Tabs', icon: 'tab' },
    MY: { id: 'my', label: 'My Issues', icon: 'avatar' },
    FAVORITES: { id: 'favorites', label: 'Favorites', icon: 'favorites'},
    // SUGGESTED: { id: 'suggested', label: 'Suggested', icon: 'suggested' },
    SEARCH_RESULTS: { id: 'search-results', label: 'Search Results', icon: 'search', hidden: 'auto' }
};

const SEARCH_MODES = {
    KEY: { id: 'key', placeholder: 'Enter issue number or ID', goTitle: 'Go to issue' },
    TEXT: { id: 'text', placeholder: 'Free text search', goTitle: 'Open search results in Jira' },
    USER: { id: 'user', placeholder: 'Search by user (@)', goTitle: "Open user's issues in Jira" },
};

const SEARCH_MODE_BY_ID = Object.fromEntries(Object.values(SEARCH_MODES).map(mode => [mode.id, mode]));

const MIN_TEXT_SEARCH_LENGTH = 2;
const MIN_USER_SEARCH_LENGTH = 1;

let issuesList = [];
let typingTimer;
let currentFilter = null;
let originalProjectValue;
let settings = {};
let searchMode = SEARCH_MODES.KEY;
let activeTabIssueKey = null;
let selectedUserAccountId = null;

const issueInputElement = document.getElementById(ELEMENT_IDS.ISSUE_INPUT);
const defaultProjectElement = document.getElementById(ELEMENT_IDS.DEFAULT_PROJECT);
const linkToBoardElement = document.getElementById(ELEMENT_IDS.LINK_TO_BOARD);
const issuesTableElement = document.getElementById(ELEMENT_IDS.ISSUES_TABLE);
const placeholdersTableElement = document.getElementById(ELEMENT_IDS.PLACEHOLDERS_TABLE);
const versionElement = document.getElementById(ELEMENT_IDS.VERSION);
const showDueDateElement = document.getElementById(ELEMENT_IDS.CHK_SHOW_DUE_DATE_ALERT);
const filterButtonsContainer = document.getElementById(ELEMENT_IDS.FILTER_BUTTONS_CONTAINER);
const searchModeInputs = document.querySelectorAll('input[name="search-mode"]');
const goButtonElement = document.getElementById(ELEMENT_IDS.GO_BUTTON);
const searchResultsCountElement = document.getElementById(ELEMENT_IDS.SEARCH_RESULTS_COUNT);

document.addEventListener('DOMContentLoaded', async () => {
    console.debug('--- Start loading popup');
    togglePlaceholdersVisibility(true);

    // Check for update message and mark popup as opened
    await checkAndShowUpdateMessage();

    // Clipboard check for jira issue format, and auto-fill input
    issueInputElement.addEventListener('focus', async function handleClipboardPasteOnce() {
        console.debug(`Checking clipboard for number input... secureContext: ${window.isSecureContext}`);
        if (searchMode.id !== SEARCH_MODES.KEY.id) {
            issueInputElement.removeEventListener('focus', handleClipboardPasteOnce);
            return;
        }
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
        applyFilter(FILTERS.DEFAULT);
        await jiraHelperService.init();
        setupIssuesTableEventListeners();
        await loadIssuesFromCache(); // Load cache data but don't display it
        await loadSettings();
        await resolveActiveTabIssueKey();
        console.debug('Call Promise All: refreshIssuesTableFromServer(), resolveBoardLink()');
        await Promise.all([
            refreshIssuesTableFromServer(),
            resolveBoardLink()
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

const loadSettings = async () => {
    try {
        settings = await fetchSettingsFromBackground();
        showDueDateElement.checked = settings.showDueDateAlert;
        versionElement.textContent = settings.versionDisplay;
        defaultProjectElement.textContent = settings.defaultProjectKey;
        originalProjectValue = defaultProjectElement.textContent;
    } catch (error) {
        console.log('Error fetching settings:', error);
    }
};

// Identifies the issue in the tab the user was on before opening the popup, so it can be
// highlighted in the list (e.g. to make it easy to favorite the issue you're currently viewing).
const resolveActiveTabIssueKey = async () => {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab?.url) {
            return;
        }

        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: MessageActionTypes.GET_ACTIVE_TAB_ISSUE_KEY, url: activeTab.url }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        activeTabIssueKey = response?.issueKey || null;
    } catch (error) {
        console.log('Error resolving active tab issue key:', error);
    }
};

const resolveBoardLink = async () => {
    try {
        linkToBoardElement.href = settings.boardUrl || await jiraHelperService.guessBoardLink(settings.customDomain, settings.defaultProjectKey);
    } catch (error) {
        console.log('Error resolving board link:', error);
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

const sendNavigateToIssueMessage = (issueKey, stayInCurrentTab = false) => {
    chrome.runtime.sendMessage({ action: "navigateToIssue", issueKey, stayInCurrentTab });
    window.close();
};

const sendNavigateToSearchMessage = (jql, stayInCurrentTab = false) => {
    chrome.runtime.sendMessage({ action: MessageActionTypes.NAVIGATE_TO_SEARCH, jql, stayInCurrentTab });
    window.close();
};

const toggleIssueFavorite = async (issueKey) => {
    try {
        console.debug(`Toggling favorite for issue: ${issueKey}`);
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: MessageActionTypes.TOGGLE_FAVORITE, issueKey }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        if (response.error) {
            console.error('Error toggling favorite:', response.error);
            return;
        }

        // Update the local issues list
        issuesList = response.issuesList || issuesList;
        console.debug('Updated issuesList after toggle:', issuesList.map(i => `${i.key}(F:${i.isFavorite})`));
        
        // Re-apply the current filter to refresh the display
        applyFilter(currentFilter, false);
        
        console.debug(`Issue ${issueKey} favorite status: ${response.isFavorite}`);
    } catch (error) {
        console.error('Error toggling favorite:', error);
    }
};

const navigateToIssueFromInput = (stayInCurrentTab = false) => {
    const issueKey = jiraHelperService.getIssueKey(issueInputElement.value.trim());
    if (issueKey === '') {
        return;
    }
    sendNavigateToIssueMessage(issueKey, stayInCurrentTab);
};

const navigateToSearchFromInput = async (stayInCurrentTab = false) => {
    const text = issueInputElement.value.trim();
    if (!text) {
        return;
    }
    const jql = await jiraHelperService.buildTextSearchJql(text);
    sendNavigateToSearchMessage(jql, stayInCurrentTab);
};

const navigateToUserSearchFromInput = async (stayInCurrentTab = false) => {
    if (!selectedUserAccountId) {
        return;
    }
    const jql = await jiraHelperService.buildUserSearchJql(selectedUserAccountId);
    sendNavigateToSearchMessage(jql, stayInCurrentTab);
};

const navigateFromInput = (stayInCurrentTab) => {
    if (searchMode.id === SEARCH_MODES.KEY.id) {
        navigateToIssueFromInput(stayInCurrentTab);
    } else if (searchMode.id === SEARCH_MODES.USER.id) {
        navigateToUserSearchFromInput(stayInCurrentTab);
    } else {
        navigateToSearchFromInput(stayInCurrentTab);
    }
};

issueInputElement.addEventListener('keydown', function (event) {
    if (searchMode.id === SEARCH_MODES.USER.id) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveHighlight(1);
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveHighlight(-1);
            return;
        }
        if (event.key === 'Escape') {
            clearUserSuggestions();
            return;
        }
        if (event.key === 'Enter' && isUserPickerOpen()) {
            event.preventDefault();
            const user = getHighlightedUser();
            if (user) {
                selectUser(user);
            }
            return;
        }
    }

    if (event.key !== 'Enter') {
        return;
    }
    navigateFromInput(event.ctrlKey);
});

issueInputElement.addEventListener('blur', () => {
    clearUserSuggestions();
});

goButtonElement.addEventListener('click', () => {
    navigateFromInput(false);
});

const handleNoSearchResults = () => {
    applyFilter(FILTERS.DEFAULT);
    hideFilter(FILTERS.SEARCH_RESULTS);
};

const updateSearchResults = (issues) => {
    issuesList = issuesList.filter(issue => !issue.searchResults);
    if (issues.length === 0) {
        handleNoSearchResults();
        return;
    }
    issuesList.push(...issues);
    applyFilter(FILTERS.SEARCH_RESULTS, false);
};

const fetchAndDisplayIssueFromInput = async () => {
    const issueKey = jiraHelperService.getIssueKey(issueInputElement.value.trim());

    if (issueKey === '') {
        handleNoSearchResults();
        return;
    }

    try {
        const issue = await jiraHelperService.fetchIssue(issueKey, { searchResults: true });
        updateSearchResults(issue ? [issue] : []);
    } catch (error) {
        console.log('Error updating search results from input:', error);
    }
};

const fetchAndDisplayTextSearchResults = async () => {
    const text = issueInputElement.value.trim();

    if (text.length < MIN_TEXT_SEARCH_LENGTH) {
        handleNoSearchResults();
        return;
    }

    try {
        const issues = await jiraHelperService.searchByText(text);
        updateSearchResults(issues);
    } catch (error) {
        console.log('Error updating text search results from input:', error);
    }
};

const fetchAndDisplayUserSuggestions = async () => {
    const query = issueInputElement.value.trim();

    if (query.length < MIN_USER_SEARCH_LENGTH) {
        clearUserSuggestions();
        return;
    }

    try {
        const users = await jiraHelperService.searchUsers(query);
        renderUserSuggestions(users);
    } catch (error) {
        console.log('Error fetching user suggestions:', error);
    }
};

const selectUser = async (user) => {
    selectedUserAccountId = user.accountId;
    issueInputElement.value = user.displayName;
    clearUserSuggestions();

    try {
        const issues = await jiraHelperService.searchByUser(user.accountId);
        updateSearchResults(issues);
    } catch (error) {
        console.log('Error searching issues by user:', error);
    }
};

onSuggestionSelected(selectUser);

const clearSearchResults = () => {
    issuesList = issuesList.filter(issue => !issue.searchResults);
    if (currentFilter?.id === FILTERS.SEARCH_RESULTS.id) {
        applyFilter(currentFilter);
    }
};

const getFetchHandlerForMode = (modeId) => {
    if (modeId === SEARCH_MODES.KEY.id) {
        return fetchAndDisplayIssueFromInput;
    }
    if (modeId === SEARCH_MODES.USER.id) {
        return fetchAndDisplayUserSuggestions;
    }
    return fetchAndDisplayTextSearchResults;
};

const handleIssueInput = async function () {
    jiraHelperService.AbortFetch();
    clearTimeout(typingTimer);
    clearSearchResults();

    if (searchMode.id === SEARCH_MODES.USER.id) {
        // Editing the input after a suggestion was already picked starts a new query.
        selectedUserAccountId = null;
    }

    const fetchAndDisplay = getFetchHandlerForMode(searchMode.id);

    typingTimer = setTimeout(async () => {
        await fetchAndDisplay();
    }, 200);
};

issueInputElement.addEventListener('input', handleIssueInput);

const syncSearchModeInputs = () => {
    searchModeInputs.forEach(input => {
        input.checked = input.value === searchMode.id;
    });
};

const setSearchMode = (mode) => {
    if (searchMode.id === mode.id) {
        return;
    }
    searchMode = mode;
    issueInputElement.placeholder = mode.placeholder;
    goButtonElement.title = mode.goTitle;
    syncSearchModeInputs();
    clearTimeout(typingTimer);
    jiraHelperService.AbortFetch();
    clearSearchResults();
    selectedUserAccountId = null;
    clearUserSuggestions();
    issueInputElement.focus();

    getFetchHandlerForMode(mode.id)();
};

searchModeInputs.forEach(input => {
    input.addEventListener('change', () => {
        setSearchMode(SEARCH_MODE_BY_ID[input.value]);
    });
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

const setupIssuesTableEventListeners = () => {
    issuesTableElement.addEventListener("click", event => {
        // Check if the click was on a favorite icon
        const favoriteIcon = event.target.closest(".favorite-icon");
        if (favoriteIcon) {
            event.stopPropagation();
            const issueElement = favoriteIcon.closest(".jira-issue");
            const issueKey = issueElement.getAttribute("data-issue-key");
            if (issueKey) {
                toggleIssueFavorite(issueKey);
            }
            return;
        }

        // Regular issue click handling
        const issueElement = event.target.closest(".jira-issue");
        if (issueElement) {
            const issueKey = issueElement.getAttribute("data-issue-key");
            if (issueKey) {
                sendNavigateToIssueMessage(issueKey);
            }
        }
    });
};

const loadIssuesFromCache = async () => {
    try {
        console.debug('Loading issues from cache');
        await fetchIssuesList(MessageActionTypes.GET_ISSUES_LIST);
        console.debug('Issues loaded from cache');
    } catch (error) {
        console.log('Error loading issues from cache:', error);
    }
};

const refreshIssuesTableFromServer = async () => {
    try {
        issuesList = await fetchIssuesList(MessageActionTypes.REFRESH_ISSUES_LIST);
        if (issuesList.length > 0) {
            applyFilter(currentFilter, false);
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
        filter = FILTERS.DEFAULT;
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
        case FILTERS.DEFAULT.id:
            filteredIssues = issuesList.filter(issue =>
                issue.hasOpenTab || issue.isFavorite || issue.statusCategory === 'In Progress' ||
                (settings.includeTodoInDefaultView && issue.status === 'To Do')
            );
            break;
        case FILTERS.SEARCH_RESULTS.id:
            filteredIssues = issuesList.filter(issue => issue.searchResults);
            break;
        case FILTERS.OPEN_TABS.id:
            filteredIssues = issuesList.filter(issue => issue.hasOpenTab);
            break;
        case FILTERS.MY.id:
            filteredIssues = issuesList.filter(issue => issue.assignedToMe);
            break;
        case FILTERS.FAVORITES.id:
            filteredIssues = issuesList.filter(issue => issue.isFavorite);
            break;
        default:
        // No filter applied, show all issues
    }

    updateSearchResultsCount(filter, filteredIssues.length);

    filteredIssues.forEach(issue => {
        issue.isActiveTab = issue.key === activeTabIssueKey;
    });

    console.debug('Applying filter, filteredIssues:', filteredIssues.map(i => `${i.key}(F:${i.isFavorite})`));
    fillIssuesTable(filteredIssues, issuesTableElement, 'refresh');
};

const updateSearchResultsCount = (filter, count) => {
    if (filter.id === FILTERS.SEARCH_RESULTS.id) {
        searchResultsCountElement.textContent = count >= CONFIG.MAX_RESULTS
            ? `Showing first ${CONFIG.MAX_RESULTS} results`
            : `${count} result${count === 1 ? '' : 's'} found`;
    } else {
        searchResultsCountElement.textContent = `${count} issue${count === 1 ? '' : 's'}`;
    }
};

const checkAndShowUpdateMessage = async () => {
    try {
        const response = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getUpdateMessage" }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        if (response.shouldShow && response.updateMessage) {
            showUpdateMessage(response.updateMessage);
        }

        // Mark update as seen (removes badge)
        chrome.runtime.sendMessage({ action: "markUpdateAsSeen" });
    } catch (error) {
        console.log('Error checking update message:', error);
    }
};

const showUpdateMessage = (updateMessage) => {
    const updateNotification = document.getElementById('update-notification');
    const titleElement = updateNotification.querySelector('.update-title');
    const featureElement = updateNotification.querySelector('.update-feature');
    const detailsElement = updateNotification.querySelector('.update-details');

    // Populate content
    titleElement.textContent = updateMessage.title;
    featureElement.textContent = updateMessage.message;
    
    // Clear and populate features
    detailsElement.innerHTML = '';
    if (updateMessage.features && updateMessage.features.length > 0) {
        updateMessage.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            detailsElement.appendChild(li);
        });
    }

    // Show the message
    updateNotification.classList.remove('d-none');
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