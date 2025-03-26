import { fetchSettingsFromBackground } from '/common/utils.js';
import { JiraHttpService } from '../../services/jira/jiraHttpService.js';

const parentElementSelector = 'div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]';

export class CopyIssueKeyWithTitle {
    fetchSettings = async () => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: "getSettings" }, response => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response.settings);
                }
            });
        });
    };

    async init(elementToObserve, getIssueFunc, keepAlive = false) {
        console.debug('CopyIssueKeyWithTitle - initializing...');

        this.getIssueFunc = getIssueFunc;
        this.keepAlive = keepAlive;
        this.subElementToObserve = elementToObserve;

        // we start observing the body, until we find the subElement, if needed
        this.startObserve(document.body);
    }

    handleMutations(mutationsList, observer) {
        if (this.subElementToObserve) {
            console.debug(`subElementToObserve: ${this.subElementToObserve}`);
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                const element = document.querySelector(this.subElementToObserve);
                if (element) {
                    console.debug(`Found inner element to observe. Disconnecting previous one`);
                    // found inner element to observe. Disconnecting previous one
                    observer.disconnect();
                    this.subElementToObserve = '';
                    this.startObserve(element);
                }
            }, 100);
        } else {
            this.doCheck(observer);
        }
    }

    startObserve(element) {
        const observer = new MutationObserver(this.handleMutations.bind(this));
        observer.observe(element, { childList: true, subtree: true });
    }

    doCheck(observer) {
        // console.debug(`Checking dom! (${++this.count})`);
        if (this.found && !this.changedUrl()) return;

        console.debug(`[handling] - URL changed or not found yet (found = ${this.found})`, this.saveUrl);

        // Check if the element exists in the DOM
        const elmContainer = document.querySelector(parentElementSelector);
        if (elmContainer) {
            this.found = true;
            console.debug('handleMutations - adding element...');
            this.createButton();

            // Disconnect the observer to avoid unnecessary checks
            if (!this.keepAlive) {
                console.debug('Disconnecting observer');
                observer.disconnect();
            }
        } else {
            this.found = false;
            console.debug('handleMutations - container element not found');
        }
    }

    changedUrl() {
        if (this.saveUrl !== window.location.href) {
            this.saveUrl = window.location.href;
            return true;
        }
        return false;
    }

    createButton() {
        // clearTimeout(createButtonTimout);
        setTimeout(() => {
            const parentElement = document.querySelector(parentElementSelector);
            if (parentElement.querySelector('.extension-copy-link-button')) {
                return;
            }
            const buttonElement = parentElement.querySelector('button');
            this.iconButton = buttonElement.cloneNode(true);
            const svgParent = this.iconButton.querySelector('svg').parentNode;
            svgParent.innerHTML = copyLinkSvg;

            svgParent.style.marginLeft = '5px';
            this.iconButton.classList.add('extension-copy-link-button');
            parentElement.appendChild(this.iconButton);

            this.iconButton?.addEventListener('click', () => {
                const issueKey = this.getIssueFunc();
                this.createLinkAndCopy(issueKey);
            });

            console.debug('Copy-link button created');
        }, 0);
    }

    async createLinkAndCopy(issueKey) {
        //TODO: Implement JiraHttpService!!!
        
        // const jiraHttpService = new JiraHttpService();
        // await jiraHttpService.fetchIssue(issueKey);

        const settings = await fetchSettingsFromBackground();

        const username = 'tbener@gmail.com'
        const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

        const apiGetPath = `https://${settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

        fetch(apiGetPath, {
            headers: {
                'Authorization': 'Basic ' + btoa(`${username}:${password}`) // Replace with your Jira username and password or API token
            }
        })
            .then(response => response.json())
            .then(data => {
                // Handle the response data and display it in your extension UI
                // console.debug('DATA: ', data);
                const issueSummary = data.fields.summary;
                const issueLink = `https://${settings.customDomain}.atlassian.net/browse/${issueKey}`;

                this.copyLinkToClipboard(issueLink, issueKey, issueSummary);

            })
            .catch(error => {
                console.error('Error fetching issue details:', error);
            });
    }

    copyLinkToClipboard(issueLink, issueKey, issueSummary) {
        const htmlContent = `<a href="${issueLink}">${issueKey}</a> - ${issueSummary}`;
        const textContent = `${issueKey} - ${issueSummary}`;

        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            })
        ])
            .then(() => {
                this.showResultIcon(true);
                console.debug('HTML content copied to clipboard:', htmlContent);
            })
            .catch(error => {
                this.showResultIcon(false);
                console.error('Error copying HTML content to clipboard:', error);
            });
    }

    showResultIcon(isSuccess) {
        const svgParent = this.iconButton.querySelector('svg').parentNode;
        svgParent.innerHTML = isSuccess ? checkmarkSvg : errorSvg;

        // Set a timer to revert the icon and class back to the original after 2 seconds (2000 milliseconds)
        setTimeout(() => {
            svgParent.innerHTML = copyLinkSvg;
        }, 2000);
    }
}


const copyLinkSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(0 -1028.4)">
<path d="m12 1028.4 4 9 8 1-6 5 2 9-8-5-8 5 2-9-6-5 8-1z" fill="#f39c12"/>
<path d="m12 1028.4-4 9-6.9688 0.8 4.9688 4.2-0.1875 0.8 0.1875 0.2-1.75 7.8 7.75-4.8 7.75 4.8-1.75-7.8 0.188-0.2-0.188-0.8 4.969-4.2-6.969-0.8-4-9z" fill="#f1c40f"/>
</g>
<g fill="currentColor" fill-rule="evenodd">
<path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path>
<path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path>
</g>
</svg>
`;

const checkmarkSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="#2ecc71"/>
<path d="M9 14l-2.5-2.5-1.5 1.5 4 4 8-8-1.5-1.5L9 14z" fill="#ffffff"/>
</svg>`;

const errorSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" fill="#e74c3c"/>
<path d="M14.828 14.828l-2.828-2.828-2.828 2.828-1.414-1.414 2.828-2.828-2.828-2.828 1.414-1.414 2.828 2.828 2.828-2.828 1.414 1.414-2.828 2.828 2.828 2.828-1.414 1.414z" fill="#ffffff"/>
</svg>`;
