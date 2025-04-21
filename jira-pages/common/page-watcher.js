/**
 * @fileoverview This module provides functionality to observe and handle changes 
 * to the DOM, specifically for adding elements dynamically to a page. It includes 
 * a page watcher that initializes an ElementObserver to monitor and process elements 
 * when the page is fully loaded.
 * 
 * @module page-watcher
 */

import { ElementObserver } from './element-observer.js';
import { HeaderInfo } from './header-info.js';
import { JiraHttpService } from '../../services/jira/jiraHttpService.js';
import { CopyIssueIcon } from './copy-issue-icon.js';
import { fetchSettingsFromBackground } from '../../common/utils.js';

const data = {
    page: {
        targetElementSelector: 'div[data-component-selector="breadcrumbs-wrapper"] > nav',
        callbackFunction: elementReady,
        keepMonitorSelector: 'body',
    },
    modal: {
        targetElementSelector: 'div[data-component-selector="breadcrumbs-wrapper"] > nav',
        callbackFunction: elementReady,
        keepMonitorSelector: 'div.atlaskit-portal-container',
    }
}

let settings = null;

export default async function watchPageToAddElements(pageType) {
    console.debug("✅ page-watcher.js injected successfully.", `document.readyState = ${document.readyState}`);

    settings = await fetchSettingsFromBackground();

    const handler = async () => {
        console.debug('✅ Init watchPageToAddElements with args:', pageType);
        const pageData = data[pageType];
        console.debug('pageData:', pageData);
        const observer = new ElementObserver();
        // observer.waitForElement(pageData.targetElementSelector, pageData.callbackFunction, pageData.keepMonitorSelector);

        observer.waitForElement('button[id="issue\\.fields\\.status-view\\.status-button"] > span', showDueDate, true, false);

    };

    if (document.readyState === 'complete') {
        handler();
    } else {
        window.addEventListener('load', handler);
    }
}

async function showDueDate(elm, issueKey) {
    console.log('✅✅✅✅ status changed!!!:', elm, issueKey);
    const breadcrumbsWrapper = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"]');
    const jiraHttpService = new JiraHttpService();
    await jiraHttpService.init();
    setTimeout(async () => {
        const issue = await jiraHttpService.fetchIssue(issueKey);
        console.log(breadcrumbsWrapper.parentElement, issue);
        console.log('✅ Issue Status ✅: ', issue.fields.status?.name);
    }, 1000);
}

async function elementReady(elm, issueKey) {
    console.log('✅✔️✅✔️✅✔️✅ NEW ISSUE!!!:', elm, issueKey);
    try {
        const jiraHttpService = new JiraHttpService();
        await jiraHttpService.init();
        const issue = await jiraHttpService.fetchIssue(issueKey);
        console.debug('Issue fetched:', issue);

        if (settings?.showDueDateAlert) {
            const headerInfo = new HeaderInfo(settings);
            headerInfo.addDueDateInfo(elm.parentElement.parentElement, issue);
        }

        const issueLink = jiraHttpService.getIssueLink(issue.key);
        const copyIssueIcon = new CopyIssueIcon();
        copyIssueIcon.createButton(elm, issue, issueLink);

    } catch (error) {
        console.error('Error adding element to issue page:', error);
    }
}

