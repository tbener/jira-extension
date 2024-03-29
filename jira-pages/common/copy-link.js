const parentElementSelector = 'div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child .issue_view_permalink_button_wrapper span[role="presentation"]';

const CopyIssueKeyWithTitle = (() => {
    saveUrl = '';
    found = true;
    keepAlive = false;

    const init = (elementToObserve, getIssueFunc, keepAlive = false) => {
        this.getIssueFunc = getIssueFunc;
        this.keepAlive = keepAlive;

        if (elementToObserve) {
            const observer = new MutationObserver(handleMutations);
            observer.observe(elementToObserve, { childList: true, subtree: true });
        }
        else {
            console.log("Jira Extension: Couldn't find [elementToObserve]. The Copy Link With Title feature will not be available")
        }
    };

    const handleMutations = (mutationsList, observer) => {
        console.log('Mutation detected!');
        if (this.found && !changedUrl()) return;

        console.log(`handleMutations - URL changed or not found yet (found = ${this.found})`, this.saveUrl);
        const issue = this.getIssueFunc();
        console.log('handleMutations - issue:', issue);
        if (!issue) return;

        console.log('handleMutations - issue exists');

        // Check if the element exists in the DOM
        const elmContainer = document.querySelector(parentElementSelector);
        if (elmContainer) {
            this.found = true;
            // Your code to add elements to the popup
            console.log('handleMutations - adding element...');
            createButton(elmContainer, issue);

            // Disconnect the observer to avoid unnecessary checks
            if (!this.keepAlive) {
                observer.disconnect();
            }
        }
        else {
            this.found = false;
            console.log('handleMutations - container element not found');
        }
    }

    const changedUrl = () => {
        if (this.saveUrl !== window.location.href) {
            this.saveUrl = window.location.href;
            return true;
        }
        return false;
    }

    const createButton = (parentElement, issueKey) => {
        const buttonElement = parentElement.querySelector('button');
        const clonedButton = buttonElement.cloneNode(true);
        const svgParent = clonedButton.querySelector('svg').parentNode;
        svgParent.innerHTML = newSvg;
        // svgParent.classList.add('ml-2');
        svgParent.style.marginLeft = '5px';
        parentElement.appendChild(clonedButton).appendChild;

        clonedButton?.addEventListener('click', () => {
            createLinkAndCopy(issueKey);
        });
    };

    const createLinkAndCopy = (issueKey) => {
        SettingsHandler.getSettings().then(settings => {

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
                    // console.log('DATA: ', data);
                    const issueSummary = data.fields.summary;
                    const issueLink = `https://${settings.customDomain}.atlassian.net/browse/${issueKey}`;

                    copyLinkToClipboard(issueLink, issueKey, issueSummary);

                })
                .catch(error => {
                    console.error('Error fetching issue details:', error);
                });
        });
    };

    const copyLinkToClipboard = (issueLink, issueKey, issueSummary) => {
        const htmlContent = `<a href="${issueLink}">${issueKey}</a> - ${issueSummary}`;
        const textContent = `${issueKey} - ${issueSummary}`;

        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': new Blob([htmlContent], { type: 'text/html' }),
                'text/plain': new Blob([textContent], { type: 'text/plain' })
            })
        ])
            .then(() => {
                console.log('HTML content copied to clipboard:', htmlContent);
            })
            .catch(error => {
                console.error('Error copying HTML content to clipboard:', error);
            });
    }

    return {
        init // Expose the init function
    };

})();

window.CopyIssueKeyWithTitle = CopyIssueKeyWithTitle;

const newSvg = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<g transform="translate(0 -1028.4)">
<path d="m12 1028.4 4 9 8 1-6 5 2 9-8-5-8 5 2-9-6-5 8-1z" fill="#f39c12"/>
<path d="m12 1028.4-4 9-6.9688 0.8 4.9688 4.2-0.1875 0.8 0.1875 0.2-1.75 7.8 7.75-4.8 7.75 4.8-1.75-7.8 0.188-0.2-0.188-0.8 4.969-4.2-6.969-0.8-4-9z" fill="#f1c40f"/>
</g>
<g fill="currentColor" fill-rule="evenodd">
<path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path>
<path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path>
</g>
</svg>
`

