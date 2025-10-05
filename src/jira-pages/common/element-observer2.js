import { fetchSettingsFromBackground } from '/common/utils.js';
import { JiraHttpService } from '../../services/jira/jiraHttpService.js';

export class ElementObserver2 {
    constructor() {
        this.callbackWhenFound = null;
        this.keepMonitorSelector = null;
        this.targetSelector = null;
        this.issueKey = null;
        this.saveUrl = null;
        this.observer = null;
        this.keepMonitorElement = null;
        this.lastProcessedElement = null;
        this.isProcessing = false;
    }

    /**
     * @param {string} targetSelector - The selector of the element to observe.
     * @param {function} callbackWhenFound - The callback function to execute when the element is found.
     * @param {string|null} keepMonitorSelector - The selector of the element to keep monitoring (optional).
     * 
     * @description Initializes the ElementObserver2 to monitor for a specific element in the DOM.
     *              If the element is found, it executes the provided callback function.
     *              Optionally, it can keep monitoring another element.
     *              This version handles dynamic page changes better by continuously monitoring.
     */
    waitForElement(targetSelector, callbackWhenFound, keepMonitorSelector = null) {
        console.debug('ElementObserver2 - initializing...');

        this.callbackWhenFound = callbackWhenFound;
        this.keepMonitorSelector = keepMonitorSelector;
        this.targetSelector = targetSelector;
        this.issueKey = this.getIssueKeyFromUrl();
        this.saveUrl = window.location.href;

        // Start observing the body initially
        this.startObserve(document.body, this.handleBodyMutations.bind(this));
    }

    /**
     * Handle mutations on the body element
     */
    handleBodyMutations(mutationsList, observer) {
        console.debug('ElementObserver2 - handleBodyMutations called', mutationsList);
        
        // Check if we need to switch to keepMonitorElement
        if (this.keepMonitorSelector && !this.keepMonitorElement) {
            const keepMonitorElement = document.querySelector(this.keepMonitorSelector);
            if (keepMonitorElement) {
                console.debug('Switching observer to keepMonitorElement');
                this.observer.disconnect();
                this.keepMonitorElement = keepMonitorElement;
                this.startObserve(keepMonitorElement, this.handleMutations.bind(this));
                return;
            }
        }

        this.handleMutations(mutationsList, observer);
    }

    /**
     * Handle mutations on the monitored element
     */
    handleMutations(mutationsList, observer) {
        console.debug('ElementObserver2 - handleMutations called', mutationsList);
        
        // Check if URL changed (new issue)
        if (this.isNewIssue()) {
            console.debug('New issue detected, resetting state');
            this.lastProcessedElement = null;
        }

        // Always check for target element if we have an issue key
        if (this.issueKey) {
            this.checkTargetElement(observer);
        }
    }

    /**
     * Start observing an element
     */
    startObserve(element, handle) {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.observer = new MutationObserver(handle);
        this.observer.observe(element, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeOldValue: true
        });
    }

    /**
     * Check if target element exists and handle it
     */
    checkTargetElement(observer) {
        if (this.isProcessing) {
            console.debug('Already processing, skipping check');
            return;
        }

        console.debug(`[checkTargetElement] - looking for element (issueKey: ${this.issueKey})`);

        const foundElement = document.querySelector(this.targetSelector);
        if (foundElement) {
            // Check if this is the same element we already processed
            if (this.lastProcessedElement === foundElement) {
                console.debug('Same element already processed, skipping');
                return;
            }

            console.debug('ElementObserver2 - element found!');
            this.lastProcessedElement = foundElement;
            this.isProcessing = true;

            try {
                console.debug('Calling callbackWhenFound function');
                this.callbackWhenFound(foundElement, this.issueKey);
            } catch (error) {
                console.error('Error in callback function:', error);
            } finally {
                this.isProcessing = false;
            }
        } else {
            console.debug('Target element not found');
            // Reset last processed element if target is not found
            this.lastProcessedElement = null;
        }
    }

    /**
     * Get issue key from current URL
     */
    getIssueKeyFromUrl() {
        const issueKeyRegex = /(?:\/(?:browse|issues)\/|[?&]selectedIssue=)([A-Z][A-Z0-9]+-\d+)/;
        const match = window.location.href.match(issueKeyRegex);
        return match ? match[1] : null;
    }

    /**
     * Check if we're on a new issue
     */
    isNewIssue() {
        if (this.saveUrl !== window.location.href) {
            console.debug('URL changed:', window.location.href);
            this.saveUrl = window.location.href;
            const newIssueKey = this.getIssueKeyFromUrl();
            
            if (this.issueKey !== newIssueKey) {
                console.debug('Issue key changed from', this.issueKey, 'to', newIssueKey);
                this.issueKey = newIssueKey;
                this.lastProcessedElement = null;
                return true;
            }
        }
        return false;
    }

    /**
     * Disconnect the observer
     */
    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
