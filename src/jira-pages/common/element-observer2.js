export class ElementObserver2 {
    constructor() {
        this.callbackWhenFound = null;
        this.keepMonitorSelector = null;
        this.targetSelector = null;
        this.isInjectedContentPresent = null;
        this.issueKey = null;
        this.saveUrl = null;
        this.observer = null;
        this.keepMonitorElement = null;
        this.lastProcessedElement = null;
        this.isProcessing = false;
        this.pollInterval = null;
        this.pollAttempts = 0;
        this.pollIntervalMs = 400; // Poll every 400ms
        this.maxPollAttempts = 50; // Poll for up to 20 seconds (50 * 400ms)
    }

    /**
     * @param {string} targetSelector - The selector of the element to observe.
     * @param {function} callbackWhenFound - The callback function to execute when the element is found.
     * @param {string|null} keepMonitorSelector - The selector of the element to keep monitoring (optional).
     * @param {function|null} isInjectedContentPresent - Optional check that returns whether the content
     *              previously injected by callbackWhenFound is still present in the DOM. When the host
     *              page (e.g. a React app) re-renders and silently drops injected elements without
     *              replacing the observed target element itself, this lets checkTargetElement detect
     *              that and re-run the callback instead of assuming it's already handled.
     *
     * @description Initializes the ElementObserver2 to monitor for a specific element in the DOM.
     *              If the element is found, it executes the provided callback function.
     *              Optionally, it can keep monitoring another element.
     *              This version handles dynamic page changes better by continuously monitoring.
     */
    waitForElement(targetSelector, callbackWhenFound, keepMonitorSelector = null, isInjectedContentPresent = null) {
        console.debug('ElementObserver2 - initializing...');

        try {
            this.callbackWhenFound = callbackWhenFound;
            this.keepMonitorSelector = keepMonitorSelector;
            this.targetSelector = targetSelector;
            this.isInjectedContentPresent = isInjectedContentPresent;
            this.issueKey = this.getIssueKeyFromUrl();
            this.saveUrl = window.location.href;

            // Start observing the body initially
            this.startObserve(document.body, this.handleBodyMutations.bind(this));
            console.debug('ElementObserver2 - waitForElement initialized successfully');
            
            // Perform initial check in case the element is already in the DOM
            console.debug('ElementObserver2 - performing initial check');
            this.handleBodyMutations([], this.observer);
            
            // Start fallback polling in case mutations aren't detected
            this.startPolling();
        } catch (error) {
            console.error('❌❌❌ Error in waitForElement:', error);
        }
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
                
                // Perform initial check after switching observers
                console.debug('ElementObserver2 - performing initial check after switching to keepMonitorElement');
                this.handleMutations([], this.observer);
                return;
            }
        }

        this.handleMutations(mutationsList, observer);
    }

    /**
     * Handle mutations on the monitored element
     */
    handleMutations(mutationsList, observer) {
        console.debug('ElementObserver2 - handleMutations called, mutations count:', mutationsList.length);

        // Check if URL changed (new issue)
        if (this.isNewIssue()) {
            console.debug('New issue detected, resetting state');
            this.lastProcessedElement = null;
            this.startPolling(); // Restart polling for new issue
        }

        // Always check for target element if we have an issue key
        if (this.issueKey) {
            this.checkTargetElement();
        }
    }

    /**
     * Start observing an element
     */
    startObserve(element, handle) {
        if (this.observer) {
            this.observer.disconnect();
        }

        console.debug('ElementObserver2 - starting observation on element:', element.tagName, element.className || element.id || '(no class/id)');
        this.observer = new MutationObserver(handle);
        this.observer.observe(element, {
            childList: true,
            subtree: true,
            attributes: true
        });
    }

    /**
     * Check if target element exists and handle it
     */
    checkTargetElement() {
        if (this.isProcessing) {
            console.debug('Already processing, skipping check');
            return;
        }

        console.debug(`[checkTargetElement] - looking for element (issueKey: ${this.issueKey}), ${this.targetSelector}`);

        const foundElement = document.querySelector(this.targetSelector);
        if (foundElement) {
            // Check if this is the same element we already processed. A host page (e.g. React)
            // can re-render and drop previously injected content without replacing this element
            // itself, so also confirm the injected content is still there before skipping.
            const injectedContentStillPresent = !this.isInjectedContentPresent || this.isInjectedContentPresent();
            if (this.lastProcessedElement === foundElement && injectedContentStillPresent) {
                console.debug('Same element already processed, skipping');
                this.stopPolling(); // Still need to stop polling even if already processed
                return;
            }
            if (this.lastProcessedElement === foundElement) {
                console.debug('Same element already processed, but injected content is missing - reprocessing');
            }

            console.log(`✅✅✅ Target element found!! (${this.pollAttempts} polling attempts)`, foundElement);
            this.lastProcessedElement = foundElement;
            this.isProcessing = true;
            
            // Stop polling since we found the element
            this.stopPolling();

            try {
                console.debug('Calling callbackWhenFound function');
                this.callbackWhenFound(foundElement, this.issueKey);
            } catch (error) {
                console.log('❌❌❌ Error in callback function:', error);
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
                return true;
            }
        }
        return false;
    }

    /**
     * Start polling fallback mechanism
     */
    startPolling() {
        this.stopPolling(); // Clear any existing interval
        this.pollAttempts = 0;
        
        console.debug('ElementObserver2 - starting fallback polling');
        this.pollInterval = setInterval(() => {
            this.pollAttempts++;
            console.debug(`ElementObserver2 - polling attempt ${this.pollAttempts}/${this.maxPollAttempts}`);
            
            if (this.pollAttempts >= this.maxPollAttempts) {
                console.debug('ElementObserver2 - max poll attempts reached, stopping');
                this.stopPolling();
                return;
            }
            
            // Check for the element
            if (this.issueKey) {
                this.checkTargetElement();
            }
        }, this.pollIntervalMs);
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollInterval) {
            console.debug('ElementObserver2 - stopping polling');
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Disconnect the observer
     */
    disconnect() {
        this.stopPolling();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}
