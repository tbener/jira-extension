const dropdownElement = document.getElementById('user-picker-dropdown');
const listElement = document.getElementById('user-picker-list');
const templateElement = listElement.querySelector('.user-suggestion[data-template]');

// Deterministic per-user color so the same person always gets the same initials color,
// used as a fallback when a suggestion has no avatar or its image fails to load.
const AVATAR_COLORS = ['#5a9bd8', '#2a72b5', '#8e6fce', '#e0796a', '#3aa675', '#d9822b'];

function colorForUser(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) | 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(displayName) {
    const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '?';
    }
    const first = parts[0][0];
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}

let currentUsers = [];
let highlightedIndex = -1;
let selectCallback = null;

export function onSuggestionSelected(callback) {
    selectCallback = callback;
}

export function renderUserSuggestions(users) {
    clearRows();
    currentUsers = dedupeByAccountId(users || []);

    if (currentUsers.length === 0) {
        dropdownElement.classList.add('d-none');
        return;
    }

    currentUsers.forEach((user, index) => {
        const row = templateElement.cloneNode(true);
        row.classList.remove('d-none');
        row.removeAttribute('data-template');
        row.dataset.index = index;

        const avatar = row.querySelector('.user-suggestion-avatar');
        const initials = row.querySelector('.user-suggestion-initials');
        initials.textContent = getInitials(user.displayName);
        initials.style.backgroundColor = colorForUser(user.accountId || user.displayName || '?');

        const showInitialsFallback = () => {
            avatar.classList.add('d-none');
            initials.classList.add('is-visible');
        };

        const avatarUrl = user.avatarUrls?.['16x16'];
        if (avatarUrl) {
            avatar.alt = user.displayName || '';
            avatar.onerror = showInitialsFallback;
            avatar.src = avatarUrl;
        } else {
            showInitialsFallback();
        }

        const name = row.querySelector('.user-suggestion-name');
        name.textContent = user.displayName || user.accountId;

        listElement.appendChild(row);
    });

    highlightedIndex = 0;
    updateHighlight();
    dropdownElement.classList.remove('d-none');
}

export function clearUserSuggestions() {
    clearRows();
    currentUsers = [];
    highlightedIndex = -1;
    dropdownElement.classList.add('d-none');
}

export function isOpen() {
    return currentUsers.length > 0 && !dropdownElement.classList.contains('d-none');
}

export function moveHighlight(direction) {
    if (currentUsers.length === 0) {
        return;
    }
    highlightedIndex = Math.min(Math.max(highlightedIndex + direction, 0), currentUsers.length - 1);
    updateHighlight();
}

export function getHighlightedUser() {
    return currentUsers[highlightedIndex] ?? null;
}

// Defensive safety net regardless of API behavior - Jira's picker endpoints have been
// known to return the same account twice (e.g. once via direct match, once via a group).
function dedupeByAccountId(users) {
    const seen = new Set();
    return users.filter(user => {
        if (seen.has(user.accountId)) {
            return false;
        }
        seen.add(user.accountId);
        return true;
    });
}

function clearRows() {
    listElement.querySelectorAll('.user-suggestion:not([data-template])').forEach(row => row.remove());
}

function updateHighlight() {
    listElement.querySelectorAll('.user-suggestion:not([data-template])').forEach((row, index) => {
        if (index === highlightedIndex) {
            row.classList.add('is-highlighted');
            row.scrollIntoView({ block: 'nearest' });
        } else {
            row.classList.remove('is-highlighted');
        }
    });
}

// Bound to mousedown (not click) with preventDefault so a suggestion pick wins the race
// against the input's blur-driven dropdown close.
listElement.addEventListener('mousedown', (event) => {
    const row = event.target.closest('.user-suggestion:not([data-template])');
    if (!row) {
        return;
    }
    event.preventDefault();
    const user = currentUsers[Number(row.dataset.index)];
    if (user && selectCallback) {
        selectCallback(user);
    }
});
