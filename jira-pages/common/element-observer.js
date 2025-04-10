import { fetchSettingsFromBackground } from '/common/utils.js';
import { JiraHttpService } from '../../services/jira/jiraHttpService.js';

const parentElementSelector = 'div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]';

export class ElementObserver {

    // Public

    /*
        * @param {string} targetSelector - The selector of the element to observe.
        * @param {function} callbackWhenFound - The callback function to execute when the element is found.
        * @param {string|null} keepMonitorSelector - The selector of the element to keep monitoring (optional).
        * 
        * @description Initializes the ElementObserver to monitor for a specific element in the DOM.
        *              If the element is found, it executes the provided callback function.
        *              Optionally, it can keep monitoring another element.
    */
    waitForElement(targetSelector, callbackWhenFound, keepMonitorSelector = null) {
        console.debug('ElementObserver - initializing...');

        this.callbackWhenFound = callbackWhenFound;
        this.keepMonitorSelector = keepMonitorSelector;
        this.targetSelector = targetSelector;
        this.getIssueKeyFromUrl();
        // this.saveUrl = window.location.href;

        // we start observing the body, until we find the subElement, if needed
        this.startObserve(document.body, this.handleBodyMutations);
    }



    // Private

    handleMutations(mutationsList, observer) {
        console.debug('✅✅✅ ElementObserver - handleMutations called', mutationsList);
        if (this.shouldCheckTargetElement()) {
            this.checkTargetElement(observer);
        }
    }

    handleBodyMutations(mutationsList, observer) {
        this.handleMutations(mutationsList, observer);

        if (this.keepMonitorSelector && !this.keepMonitorElement) {
            const keepMonitorElement = document.querySelector(this.keepMonitorSelector);
            if (keepMonitorElement) {
                console.debug('Switching observer to keepMonitorElement');
                observer.disconnect();
                this.keepMonitorElement = keepMonitorElement;
                this.startObserve(keepMonitorElement, this.handleMutations);
                return;
            }
        }
    }

    startObserve(element, handle) {
        const observer = new MutationObserver(handle.bind(this));
        observer.observe(element, { childList: true, subtree: true });
    }

    shouldCheckTargetElement() {
        console.debug('✅ ElementObserver - shouldCheckTargetElement called. Current state:', this.issueKey, this.found);
        if (this.isNewIssue()) {
            console.debug('New issue detected, resetting found state and looking for target element.');
        }

        // If no issue is present, stop looking
        if (!this.issueKey) {
            console.debug('No issue detected, skipping element search.');
            return false;
        }

        // If the element has already been found for the current issue, no need to check again
        if (this.found) {
            console.debug('Element already found for the current issue. Skipping further checks.');
            return false;
        }

        // There is an issue key, and the element has not been found yet
        return true;
    }

    checkTargetElement(observer) {
        console.debug(`[checkTargetElement] - looking for element (issueKey: ${this.issueKey})`);

        const foundElement = document.querySelector(this.targetSelector);
        if (foundElement) {
            this.found = true;
            console.debug('ElementObserver - element found!');

            if (this.keepMonitorSelector) {
                console.debug('Keeping observer alive!!');
            } else {
                // Disconnect the observer to avoid unnecessary checks
                console.debug('Disconnecting observer');
                observer.disconnect();
            }

            console.debug('Calling callbackWhenFound function');
            this.callbackWhenFound(foundElement, this.issueKey);
        } else {
            console.debug('handleMutations - container element not found');
        }
    }

    getIssueKeyFromUrl() {
        const issueKeyRegex = /(?:\/browse\/|[?&]selectedIssue=)([A-Z][A-Z0-9]+-\d+)/;
        const match = window.location.href.match(issueKeyRegex);
        return match ? match[1] : null;
    }

    isNewIssue() {
        if (this.saveUrl !== window.location.href) {
            console.debug('☑️☑️☑️ URL changed:', window.location.href);
            this.saveUrl = window.location.href;
            const issueKey = this.getIssueKeyFromUrl();
            console.debug('😎😎😎 Issue key:', issueKey, 'this.issueKey:', this.issueKey);
            if (this.issueKey !== issueKey) {
                this.issueKey = issueKey;
                this.found = false;
                console.debug('Issue key changed:', this.issueKey);
                return !!this.issueKey;
            }
        }
        console.debug('❌❌❌ URL did not change:', window.location.href);
        return false;
    }
}
