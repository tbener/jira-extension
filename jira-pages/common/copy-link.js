class CopyLink {
    constructor() {}

    createLink(issueKey) {
        chrome.storage.sync.get(
            { customDomain: 'mdclone' },
            (items) => {
    
                const username = 'tbener@gmail.com'
                const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';
    
                const apiGetPath = `https://${items.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;
    
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
                        const issueLink = `https://${items.customDomain}.atlassian.net/browse/${issueKey}`;
    
                        this.#copyLinkToClipboard(issueLink, issueKey, issueSummary);
    
                    })
                    .catch(error => {
                        console.error('Error fetching issue details:', error);
                    });
            }
        );
    }

    #copyLinkToClipboard(issueLink, issueKey, issueSummary) {
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
}

