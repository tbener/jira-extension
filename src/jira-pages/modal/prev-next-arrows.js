
// Stable semantic selector (role + aria-label) for the modal's top-right button
// group (Watch, Share, Actions, minimise, close) - unlike Jira's obfuscated
// class names, this is unlikely to change between Jira versions.
const actionGroupSelector = 'div[role="group"][aria-label="Action items"]';
// A plain icon-only button (no counter badge) to use as a style reference when cloning.
const referenceButtonSelector = 'button[data-testid*="minimise-button"]';

// Candidate selectors for the board's card container, tried in order until one matches.
// Jira's board frontend (the "board-kit" package) exposes cards/columns via data-testid;
// the exact strings drift between Jira versions, so we try a few known patterns.
const boardContainerSelectors = [
    '[data-testid="software-board.board-area"]',
    '[data-testid="software-board.board"]',
    '[data-testid*="board-kit.ui.board"]',
];
const cardSelectors = [
    '[data-testid="platform-board-kit.ui.card.card"]',
    '[data-testid*="software-board"][data-testid*="card"]',
    '[data-testid$=".card"]',
    '[data-testid*="board-kit.ui.card"]',
    'div[role="button"][data-testid*="card"]',
];
const columnSelectors = [
    '[data-testid="platform-board-kit.ui.column.draggable-column.styled-wrapper"]',
    '[data-testid*="software-board"][data-testid*="column"]',
    '[data-testid$=".column"]',
    '[data-testid*="board-kit.ui.column"]',
    '[role="list"]',
];

const issueKeyRegex = /\b([A-Z][A-Z0-9]+-\d+)\b/;
const cardIdRegex = /^card-([A-Z][A-Z0-9]+-\d+)$/;
const boardUrlRegex = /\/boards\/\d+/;

// Persists across elementReady calls (module scope survives for the page's lifetime)
// so dismissing the debug indicator sticks until the page is reloaded.
let indicatorDismissed = false;

// elementReady only fires when the issue modal opens/switches - it does NOT fire when
// the underlying board changes (e.g. toggling a quick filter or epic grouping) while
// the same card stays open, because ElementObserver2 narrows its MutationObserver to
// the modal's portal container once found, which doesn't include the board behind it.
// So we separately watch the board container itself and recompute on any change,
// tracking the most recent (elm, issueKey) here since the observer callback fires
// outside of any particular elementReady invocation.
let boardObserver = null;
let observedBoardContainer = null;
let boardChangeDebounceTimer = null;
let currentElm = null;
let currentIssueKey = null;
let currentDebugEnabled = false;

export class PrevNextArrows {

    createButtons(elm, issueKey, debugEnabled = currentDebugEnabled) {
        try {
            this.createButtonsInternal(elm, issueKey, debugEnabled);
        } catch (error) {
            console.warn('PrevNextArrows: error rendering arrows:', error);
        }
    }

    createButtonsInternal(elm, issueKey, debugEnabled) {
        const isBoardUrl = boardUrlRegex.test(window.location.pathname);

        currentElm = elm;
        currentIssueKey = issueKey;
        currentDebugEnabled = debugEnabled;

        if (!isBoardUrl) {
            console.debug('PrevNextArrows: URL does not look like a board, skipping', window.location.pathname);
            this.renderDebugIndicator({ isBoardUrl, issueKey });
            this.disconnectBoardObserver();
            return;
        }

        const actionGroup = document.querySelector(actionGroupSelector);
        const boardContainer = this.findFirstMatch(boardContainerSelectors);
        this.renderDebugIndicator({ isBoardUrl, issueKey, actionGroupFound: !!actionGroup, boardContainerFound: !!boardContainer });

        if (!actionGroup) {
            console.debug('PrevNextArrows: action items group not found, skipping (selector may be stale)');
            this.disconnectBoardObserver();
            return;
        }

        if (!boardContainer) {
            console.debug('PrevNextArrows: board container not found, skipping (selector may be stale)');
            this.disconnectBoardObserver();
            return;
        }

        this.watchBoardForChanges(boardContainer);

        // Remove any arrows from a previous render before looking up a reference button:
        // our arrows are clones of it, so they carry the same data-testid and would
        // otherwise be matched instead of Jira's real button (and could propagate a
        // stale disabled state onto brand-new buttons).
        actionGroup.querySelectorAll('.extension-prev-next-arrow').forEach(el => el.remove());

        const referenceButton = actionGroup.querySelector(referenceButtonSelector) ?? actionGroup.querySelector('button');
        if (!referenceButton) {
            console.debug('PrevNextArrows: no button found inside action items group to clone from');
            return;
        }

        // Reads whatever cards are currently present in the DOM. Known limitation: the
        // column's card list is virtualized ("fast-virtual-list"), so a card outside the
        // currently-rendered scroll window won't be found even if it's the true
        // prev/next - in that case the arrow just shows as disabled. We tried actively
        // scrolling to force those cards to render, but it was too unreliable across
        // this board's virtualization/filtering behavior to be worth the complexity.
        const { prevKey, nextKey, currentCardFound, columnCardCount, currentPosition, keys } =
            this.getSiblingIssueKeys(boardContainer, issueKey);
        console.debug('PrevNextArrows: siblings for', issueKey, '->', { prevKey, nextKey, currentCardFound, columnCardCount, currentPosition });

        this.renderDebugIndicator({
            isBoardUrl, issueKey,
            actionGroupFound: !!actionGroup,
            boardContainerFound: !!boardContainer,
            currentCardFound, columnCardCount, currentPosition, prevKey, nextKey, keys,
        });

        this.renderArrows(actionGroup, referenceButton, prevKey, nextKey);

        console.debug('PrevNextArrows: arrows rendered');
    }

    renderArrows(actionGroup, referenceButton, prevKey, nextKey) {
        actionGroup.querySelectorAll('.extension-prev-next-arrow').forEach(el => el.remove());

        const nextButton = this.buildArrowButton(referenceButton, 'next', nextKey);
        const prevButton = this.buildArrowButton(referenceButton, 'prev', prevKey);

        actionGroup.insertBefore(nextButton, actionGroup.firstElementChild);
        actionGroup.insertBefore(prevButton, actionGroup.firstElementChild);
    }

    buildArrowButton(referenceButton, direction, targetKey) {
        const button = referenceButton.cloneNode(true);
        button.classList.add('extension-prev-next-arrow', `extension-${direction}-arrow`);
        const label = direction === 'prev' ? 'Prev' : 'Next';
        const tooltip = targetKey ? `${label}: ${targetKey}` : `${label}: none`;
        button.removeAttribute('aria-label');
        button.setAttribute('aria-label', tooltip);
        button.title = tooltip;

        const svgParent = button.querySelector('svg')?.parentNode ?? button;
        svgParent.innerHTML = direction === 'prev' ? arrowLeftSvg : arrowRightSvg;

        // Reset rather than trust the clone source's state - defense in depth alongside
        // the cleanup-before-lookup fix above, in case a stale extension button is ever
        // used as the reference again.
        button.classList.remove('extension-arrow-disabled');
        button.removeAttribute('aria-disabled');
        button.disabled = false;

        if (!targetKey) {
            button.classList.add('extension-arrow-disabled');
            button.setAttribute('aria-disabled', 'true');
            button.disabled = true;
        } else {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.navigateToCard(targetKey);
            });
        }

        return button;
    }

    watchBoardForChanges(boardContainer) {
        // Watch the PARENT of the board container, not the container itself: some
        // filter/grouping changes (e.g. toggling epic swimlanes) make Jira replace the
        // board-area node wholesale rather than just mutating its children. An observer
        // attached to the old node would go silently dead in that case, and nothing else
        // would re-arm a new one since no card-switch event fires to trigger it. The
        // parent is far less likely to itself be replaced, and watching it with
        // subtree:true still covers ordinary card/column mutations (filtering, dragging
        // a card between columns) exactly as before.
        const watchTarget = boardContainer.parentElement ?? boardContainer;

        if (observedBoardContainer === watchTarget && boardObserver) {
            return;
        }

        this.disconnectBoardObserver();
        observedBoardContainer = watchTarget;
        boardObserver = new MutationObserver(() => {
            clearTimeout(boardChangeDebounceTimer);
            boardChangeDebounceTimer = setTimeout(() => {
                if (!currentIssueKey) return;
                console.debug('PrevNextArrows: board content changed (e.g. filter/epic toggle/drag), recomputing arrows');
                this.createButtons(currentElm, currentIssueKey);
            }, 300);
        });
        // Board card mutations never touch the action-items group we render into,
        // so this can't self-trigger a loop.
        boardObserver.observe(watchTarget, { childList: true, subtree: true });
    }

    disconnectBoardObserver() {
        clearTimeout(boardChangeDebounceTimer);
        if (boardObserver) {
            boardObserver.disconnect();
            boardObserver = null;
        }
        observedBoardContainer = null;
    }

    navigateToCard(issueKey) {
        // Drive Jira's own router via the URL rather than clicking the card element:
        // the board's cards are wrapped in drag-and-drop machinery whose click handling
        // we can't reliably reach with a synthetic click. Jira already keys off the
        // `selectedIssue` query param to open/switch issues (see getIssueKeyFromUrl in
        // element-observer2.js), and pushState + a synthetic popstate is the standard
        // way to trigger a client-side router (which listens for popstate) without a
        // full page reload.
        const url = new URL(window.location.href);
        url.searchParams.set('selectedIssue', issueKey);
        console.debug('PrevNextArrows: navigating to', issueKey, url.toString());
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    getSiblingIssueKeys(boardContainer, currentIssueKey) {
        const currentCard = this.findCardByIssueKey(boardContainer, currentIssueKey);
        if (!currentCard) {
            console.debug('PrevNextArrows: current card not found on board for', currentIssueKey);
            return { prevKey: null, nextKey: null, currentCardFound: false, columnCardCount: 0 };
        }

        const column = this.getColumnContainer(currentCard, boardContainer);
        const columnCards = this.queryAllFirstMatch(column, cardSelectors);
        const keys = columnCards.map(card => this.extractIssueKey(card));
        const currentIndex = keys.indexOf(currentIssueKey);
        console.debug('PrevNextArrows: column keys', keys, 'currentIndex', currentIndex, 'columnEqualsBoard', column === boardContainer);

        if (currentIndex === -1) {
            console.debug('PrevNextArrows: current card not indexed within its column');
            return { prevKey: null, nextKey: null, currentCardFound: true, columnCardCount: keys.length, keys };
        }

        return {
            prevKey: currentIndex > 0 ? keys[currentIndex - 1] : null,
            nextKey: currentIndex < keys.length - 1 ? keys[currentIndex + 1] : null,
            currentCardFound: true,
            columnCardCount: keys.length,
            currentPosition: currentIndex + 1,
            keys,
        };
    }

    findCardByIssueKey(boardContainer, issueKey) {
        if (!boardContainer) return null;
        const cards = this.queryAllFirstMatch(boardContainer, cardSelectors);
        return cards.find(card => this.extractIssueKey(card) === issueKey) ?? null;
    }

    getColumnContainer(cardElement, boardContainer) {
        for (const selector of columnSelectors) {
            const column = cardElement.closest(selector);
            if (column && boardContainer.contains(column)) {
                return column;
            }
        }
        console.debug('PrevNextArrows: no column ancestor matched, falling back to card parent');
        return cardElement.parentElement;
    }

    extractIssueKey(cardElement) {
        // Cards are rendered with id="card-MD-8830" - far more reliable than scraping
        // links or text.
        const idMatch = cardElement.id?.match(cardIdRegex);
        if (idMatch) return idMatch[1];

        const link = cardElement.querySelector('a[href*="selectedIssue="], a[href*="/browse/"]');
        if (link) {
            const match = link.href.match(issueKeyRegex);
            if (match) return match[1];
        }

        const ariaLabel = cardElement.getAttribute('aria-label') ?? '';
        const ariaMatch = ariaLabel.match(issueKeyRegex);
        if (ariaMatch) return ariaMatch[1];

        const textMatch = cardElement.textContent.match(issueKeyRegex);
        return textMatch ? textMatch[1] : null;
    }

    // Debug indicator - diagnostic aid for prev/next board navigation (issue #12), kept intentionally.
    renderDebugIndicator(state) {
        if (indicatorDismissed) return;

        if (!currentDebugEnabled) {
            document.getElementById('extension-board-debug-indicator')?.remove();
            return;
        }

        const { isBoardUrl, issueKey, actionGroupFound, boardContainerFound, currentCardFound, columnCardCount, currentPosition, prevKey, nextKey, keys } = state;
        console.debug('PrevNextArrows: renderDebugIndicator', state);

        let badge = document.getElementById('extension-board-debug-indicator');
        let content;
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'extension-board-debug-indicator';

            const closeButton = document.createElement('button');
            closeButton.textContent = '✕';
            closeButton.setAttribute('aria-label', 'Dismiss debug indicator');
            closeButton.className = 'extension-board-debug-indicator-close';
            closeButton.addEventListener('click', () => {
                indicatorDismissed = true;
                badge.remove();
            });
            badge.appendChild(closeButton);

            content = document.createElement('pre');
            content.className = 'extension-board-debug-indicator-content';
            badge.appendChild(content);

            document.body.appendChild(badge);
        } else {
            content = badge.querySelector('.extension-board-debug-indicator-content');
        }

        const line = (label, value) => `${value ? '✅' : '❌'} ${label}`;
        const lines = [`Issue: ${issueKey ?? '-'}`, line('Board URL', isBoardUrl)];
        if (isBoardUrl) {
            lines.push(line('Action items group', actionGroupFound));
            lines.push(line('Board container', boardContainerFound));
        }
        if (actionGroupFound && boardContainerFound) {
            lines.push(line('Current card found', currentCardFound));
            lines.push(`Position: ${currentPosition ?? '-'} / ${columnCardCount ?? '-'}`);
            lines.push(`Prev: ${prevKey ?? '-'}  Next: ${nextKey ?? '-'}`);
            if (keys?.length) {
                lines.push(`Keys: ${keys.map((k, i) => i === currentPosition - 1 ? `[${k ?? '?'}]` : (k ?? '?')).join(', ')}`);
            }
        }
        content.textContent = lines.join('\n');
    }

    findFirstMatch(selectors) {
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    queryAllFirstMatch(root, selectors) {
        for (const selector of selectors) {
            const els = Array.from(root.querySelectorAll(selector));
            if (els.length > 0) return els;
        }
        return [];
    }
}

const arrowLeftSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const arrowRightSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
