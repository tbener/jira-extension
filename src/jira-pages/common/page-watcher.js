/**
 * @fileoverview This module provides functionality to observe and handle changes 
 * to the DOM, specifically for adding elements dynamically to a page. It includes 
 * a page watcher that initializes an ElementObserver to monitor and process elements 
 * when the page is fully loaded.
 * 
 * @module page-watcher
 */

import { ElementObserver2 } from './element-observer2.js';
import { HeaderInfo } from './header-info.js';
import { JiraHttpService } from '../../services/jira/jiraHttpService.js';
import { CopyIssueIcon } from './copy-issue-icon.js';
import { PrevNextArrows } from '../modal/prev-next-arrows.js';
import { fetchSettingsFromBackground } from '../../common/utils.js';

const isInjectedContentPresent = () => !!document.querySelector('.extension-copy-link-button');

const data = {
    page: {
        targetElementSelector: 'div[data-component-selector="breadcrumbs-wrapper"] > nav',
        callbackFunction: elementReady,
        keepMonitorSelector: 'body',
        isInjectedContentPresent,
    },
    modal: {
        targetElementSelector: 'div[data-component-selector="breadcrumbs-wrapper"] > nav',
        callbackFunction: elementReady,
        keepMonitorSelector: 'div.atlaskit-portal-container',
        isInjectedContentPresent,
    }
}

let settings = null;
let latestRequestedIssueKey = null;

export default async function watchPageToAddElements(pageType) {
    console.debug("✅ page-watcher.js injected successfully.", `document.readyState = ${document.readyState}`);

    settings = await fetchSettingsFromBackground();

    const handler = async () => {
        console.debug('✅ Init watchPageToAddElements with args:', pageType);
        const pageData = data[pageType];
        console.debug('pageData:', pageData);
        const observer = new ElementObserver2();
        observer.waitForElement(pageData.targetElementSelector, pageData.callbackFunction, pageData.keepMonitorSelector, pageData.isInjectedContentPresent);
    };

    if (document.readyState === 'complete') {
        handler();
    } else {
        window.addEventListener('load', handler);
    }
}

async function elementReady(elm, issueKey) {
    console.debug('✅✔️✅✔️✅✔️✅ (callback function) ELEMENT READY!!!:', elm, issueKey);
    latestRequestedIssueKey = issueKey;
    try {
        // prevNextArrows only needs the key, which we already have, so it runs immediately
        // instead of waiting on the network round-trip below. That round-trip was the
        // actual cause of the arrows appearing to pop in late.
        const prevNextArrows = new PrevNextArrows();
        prevNextArrows.createButtons(elm, issueKey, !!settings?.showBoardDebugIndicator);

        const jiraHttpService = new JiraHttpService();
        await jiraHttpService.init();

        if (issueKey !== latestRequestedIssueKey) {
            // The user navigated to a different issue while init() (which hits the Jira
            // API) was in flight. Applying this stale response would bind the copy button
            // (and due date alert) to the wrong issue, since the breadcrumbs nav DOM node
            // is reused by Jira's SPA across navigations.
            console.debug('⏭️ Ignoring stale response for', issueKey, '- current issue is', latestRequestedIssueKey);
            return;
        }

        // The copy button reads the summary straight from the DOM at click time (instead
        // of from a fetched issue here), so button creation doesn't wait on this fetch.
        // It's still kicked off now (rather than only when showDueDateAlert needs it) so
        // it's ready as a fallback by the time the user clicks, in case the DOM selectors
        // the copy button relies on go stale.
        const issuePromise = jiraHttpService.fetchIssue(issueKey);
        // Nothing awaits this promise unless showDueDateAlert is on or the copy button's
        // DOM read falls back to it, so give it a no-op catch to avoid an unhandled
        // rejection warning while still letting real callers see (and handle) the error.
        issuePromise.catch(() => {});

        const issueLink = jiraHttpService.getIssueLink(issueKey);
        const copyIssueIcon = new CopyIssueIcon();
        copyIssueIcon.createButton(elm, issueKey, issueLink, issuePromise);

        if (settings?.showDueDateAlert) {
            const issue = await issuePromise;
            console.debug('🏝️ Fetched Issue:', issue);

            if (issueKey !== latestRequestedIssueKey) {
                console.debug('⏭️ Ignoring stale issue fetch for', issueKey, '- current issue is', latestRequestedIssueKey);
                return;
            }

            const headerInfo = new HeaderInfo(settings);
            headerInfo.addDueDateInfo(elm.parentElement.parentElement, issue);
        }

    } catch (error) {
        console.log('⚠️⚠️⚠️⚠️ Error adding element to issue page:', error);
    }
}

