
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

// The column header shows a "presented/unfiltered" counter, e.g. "15/20" when 15 cards
// match the board's active filters out of 20 in the column overall. The aria-label (e.g.
// "Analyze, total issue count: 20") reflects the SECOND, unfiltered number - not useful
// here, since a card excluded by the active filter will never be a real prev/next no
// matter how much of the column loads. The FIRST number (the "presented" count) is what
// actually bounds what's reachable, so that's what we want - purely informational for
// the debug badge, distinguishing "loaded so far" from "presented" so a low loaded count
// isn't mistaken for a bug when it's really just virtualization.
const columnTotalCountSelector = '[aria-label*="total issue count"]';
const columnTotalCountRegex = /total issue count:\s*(\d+)/i;
// The "15/20" counter animates per DIGIT: each whole number sits in its own outer
// `white-space:pre` span, and each digit inside it gets its own hidden span (sets layout
// width) + absolutely-positioned visible span (the actual animated glyph) pair, both
// with identical text at rest. So for "15", there are two digit pairs ("1" and "5")
// inside one `white-space:pre` wrapper - reading a single hidden span only gets the
// first digit ("1"), and naively reading the whole wrapper's textContent double-reads
// every digit (hidden + visible copies). Need to: scope to the first number's wrapper,
// then concatenate just its hidden digit spans, in order.
const columnNumberWrapperSelector = 'span[style*="white-space:pre"]';
const columnDigitSelector = 'span[style*="visibility:hidden"]';

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
// scrollIntoView (see getSiblingIssueKeys) deliberately mutates the board's DOM to
// nudge the virtualized list into rendering neighboring cards - set while that's
// happening so the board-change observer doesn't treat it as an external change and
// recompute again on top of the in-progress computation.
let isSelfMutating = false;

export class PrevNextArrows {

    async createButtons(elm, issueKey, debugEnabled = currentDebugEnabled) {
        try {
            await this.createButtonsInternal(elm, issueKey, debugEnabled);
        } catch (error) {
            isSelfMutating = false;
            console.warn('PrevNextArrows: error rendering arrows:', error);
        }
    }

    async createButtonsInternal(elm, issueKey, debugEnabled) {
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

        // The column's card list is virtualized ("fast-virtual-list"), so a card outside
        // the currently-rendered scroll window won't be found even if it's the true
        // prev/next. getSiblingIssueKeys nudges the current card into view first (see
        // there for why), which usually - but not always - is enough to reveal it; when
        // it isn't, the arrow just shows as disabled rather than navigating.
        const { prevKey, nextKey, currentCardFound, columnCardCount, columnTotalCount, currentPosition, keys } =
            await this.getSiblingIssueKeys(boardContainer, issueKey);
        console.debug('PrevNextArrows: siblings for', issueKey, '->', { prevKey, nextKey, currentCardFound, columnCardCount, columnTotalCount, currentPosition });

        // The modal may have moved on to a different issue while we were waiting for the
        // scroll-into-view to settle - discard this stale result rather than clobbering
        // whatever's now showing.
        if (currentIssueKey !== issueKey) {
            console.debug('PrevNextArrows: issue changed while computing siblings for', issueKey, '- discarding stale result');
            return;
        }

        this.renderDebugIndicator({
            isBoardUrl, issueKey,
            actionGroupFound: !!actionGroup,
            boardContainerFound: !!boardContainer,
            currentCardFound, columnCardCount, columnTotalCount, currentPosition, prevKey, nextKey, keys,
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
            if (isSelfMutating) {
                // Our own scrollIntoView is deliberately mutating this subtree - it will
                // handle recomputation itself once done, so ignore these mutations
                // rather than racing a second recompute on top of the current one.
                return;
            }
            clearTimeout(boardChangeDebounceTimer);
            boardChangeDebounceTimer = setTimeout(() => {
                // Re-check isSelfMutating here too, not just when the mutation was
                // observed: this timer may have been scheduled just before self-mutation
                // started, and would otherwise fire in the middle of it regardless.
                if (isSelfMutating || !currentIssueKey) return;
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
        // Prefer clicking the card's real focus/open button - platform-card.ui.card.
        // focus-container is a genuine <button> layered over the card specifically for
        // opening it (its aria-label literally says "Use the enter key to load the work
        // item"), separate from the outer draggable wrapper so drag gestures don't get
        // confused with a click. Clicking the wrapper itself (what we tried originally)
        // did nothing, because it has no click handler of its own - the real one lives
        // on this inner button. Clicking it natively also gets us the board's own
        // "active card" highlight/scroll-alignment behavior for free, instead of us
        // having to reimplement that ourselves.
        const boardContainer = this.findFirstMatch(boardContainerSelectors);
        const cardElement = this.findCardByIssueKey(boardContainer, issueKey);
        const focusButton = cardElement?.querySelector('button[data-testid="platform-card.ui.card.focus-container"]');

        if (focusButton) {
            console.debug('PrevNextArrows: navigating to', issueKey, 'via native card focus button');
            focusButton.click();
            return;
        }

        // Fallback for when the target card isn't currently in the DOM at all (outside
        // the virtualized list's rendered window): drive Jira's router via the URL.
        // Jira already keys off the `selectedIssue` query param to open/switch issues
        // (see getIssueKeyFromUrl in element-observer2.js), and pushState + a synthetic
        // popstate is the standard way to trigger a client-side router (which listens
        // for popstate) without a full page reload.
        console.debug('PrevNextArrows: no focus button found for', issueKey, '- falling back to URL navigation');
        const url = new URL(window.location.href);
        url.searchParams.set('selectedIssue', issueKey);
        window.history.pushState(null, '', url);
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    async getSiblingIssueKeys(boardContainer, currentIssueKey) {
        const currentCard = this.findCardByIssueKey(boardContainer, currentIssueKey);
        if (!currentCard) {
            console.debug('PrevNextArrows: current card not found on board for', currentIssueKey);
            return { prevKey: null, nextKey: null, currentCardFound: false, columnCardCount: 0 };
        }

        const column = this.getColumnContainer(currentCard, boardContainer);

        // Bring the current card into view within its column. Besides being a nice
        // touch on its own (aligning the board to show what's open), scrollIntoView
        // triggers a native scroll event exactly like a real user action would, which
        // nudges Jira's virtualized list into rendering neighboring cards - often
        // enough to reveal a prev/next that wasn't previously in the DOM. Unlike the
        // earlier hand-rolled step-scrolling attempt, this is a single, idempotent
        // browser-native action (a no-op if already in view) rather than an open-ended
        // loop, so it can't oscillate or run away.
        isSelfMutating = true;
        try {
            currentCard.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
            await this.waitForRender();
        } finally {
            isSelfMutating = false;
        }

        const columnTotalCount = this.getColumnTotalCount(column);
        const columnCards = this.queryAllFirstMatch(column, cardSelectors);
        const keys = columnCards.map(card => this.extractIssueKey(card));
        const currentIndex = keys.indexOf(currentIssueKey);
        console.debug('PrevNextArrows: column keys', keys, 'currentIndex', currentIndex, 'columnTotalCount', columnTotalCount, 'columnEqualsBoard', column === boardContainer);

        if (currentIndex === -1) {
            console.debug('PrevNextArrows: current card not indexed within its column');
            return { prevKey: null, nextKey: null, currentCardFound: true, columnCardCount: keys.length, columnTotalCount, keys };
        }

        return {
            prevKey: currentIndex > 0 ? keys[currentIndex - 1] : null,
            nextKey: currentIndex < keys.length - 1 ? keys[currentIndex + 1] : null,
            currentCardFound: true,
            columnCardCount: keys.length,
            columnTotalCount,
            currentPosition: currentIndex + 1,
            keys,
        };
    }

    getColumnTotalCount(column) {
        const header = column.querySelector(columnTotalCountSelector);
        if (!header) return null;

        // Prefer the "presented" count (the counter's first number): a card excluded by
        // the board's active filter is never a reachable prev/next regardless of how
        // much of the column loads, so that's the number actually relevant here.
        const firstNumberWrapper = header.querySelector(columnNumberWrapperSelector);
        const digits = firstNumberWrapper?.querySelectorAll(columnDigitSelector) ?? [];
        if (digits.length > 0) {
            const presentedCount = parseInt(Array.from(digits).map(d => d.textContent.trim()).join(''), 10);
            if (!Number.isNaN(presentedCount)) {
                return presentedCount;
            }
        }

        // Fallback to the aria-label's (unfiltered) total if the counter's DOM structure
        // didn't match - better than nothing, though it may overstate what's reachable.
        console.debug('PrevNextArrows: could not read presented count, falling back to aria-label total');
        const match = header.getAttribute('aria-label')?.match(columnTotalCountRegex);
        return match ? parseInt(match[1], 10) : null;
    }

    findCardByIssueKey(boardContainer, issueKey) {
        if (!boardContainer) return null;
        const cards = this.queryAllFirstMatch(boardContainer, cardSelectors);
        return cards.find(card => this.extractIssueKey(card) === issueKey) ?? null;
    }

    waitForRender() {
        return new Promise(resolve => setTimeout(resolve, 150));
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

        const { isBoardUrl, issueKey, actionGroupFound, boardContainerFound, currentCardFound, columnCardCount, columnTotalCount, currentPosition, prevKey, nextKey, keys } = state;
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
            lines.push(`Position: ${currentPosition ?? '-'} / ${columnCardCount ?? '-'} (loaded)  Total: ${columnTotalCount ?? '?'}`);
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
