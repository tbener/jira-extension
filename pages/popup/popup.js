const navigateToIssue = () => {
    chrome.storage.sync.get(
        { customDomain: 'mdclone', defaultProjectKey: '' },
        (items) => {
            let issue = document.getElementById('issue').value;
            if (!isNaN(issue)) {
                // only a number
                issue = `${items.defaultProjectKey}-${issue}`;
            }

            const url = `https://${items.customDomain}.atlassian.net/browse/${issue}`;

            // Navigate to the Jira issue page
            chrome.tabs.create({ url });
        }
    );
};

document.getElementById('goButton').addEventListener('click', navigateToIssue);

document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});

const createElementToCopy = (issueKey, issueLink, summary) => {
    const span = document.createElement('span');
    const link = document.createElement('a');
    link.href = issueLink;
    link.textContent = issueKey;
    const text = document.createTextNode(` - ${summary}`);

    span.appendChild(link);
    span.appendChild(text);

    return span;
}

document.querySelector('#test').addEventListener('click', function () {
    const link = document.querySelector('#bla');
    const range = document.createRange();
    range.selectNode(link);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    document.execCommand('copy');
    selection.removeAllRanges();

    return;
    const issueKey = 'jira-5'; // window.location.pathname.split('/').pop();
    const username = 'tbener@gmail.com'
    const password = 'ATATT3xFfGF0si42KVwh3uPazrdcH7idKxeSyReW6exJT6Y45gjLt8-fBinwc9LapXHUyKeqSDp3EpETpQ1V3J9aSEHAT6alSMZtzkGHeLSIfurb1e8LCUpABs29bnBh4Y7XLbwz3jJBrT5093IcHd08conVjog5fHMPPHyHqesUltsnz0M7Cf8=EC46FC59';

    fetch(`https://tbener.atlassian.net/rest/api/3/issue/${issueKey}`, {
        headers: {
            'Authorization': 'Basic ' + btoa('${username}:${password}') // Replace with your Jira username and password or API token
        }
    })
        .then(response => response.json())
        .then(data => {
            // Handle the response data and display it in your extension UI
            console.log(data.data.fields.summary);
            const issueSummary = data.data.fields.summary;
            chrome.storage.sync.get(
                { customDomain: 'mdclone' },
                (items) => {

                    const issueLink = `https://${items.customDomain}.atlassian.net/browse/${issueKey}`;
                    const htmlContent = `<a href="${issueLink}">${issueKey}</a>: ${issueSummary}`;

                    navigator.clipboard.write(htmlContent)
                        .then(() => {
                            console.log('HTML content copied to clipboard:', htmlContent);
                        })
                        .catch(error => {
                            console.error('Error copying HTML content to clipboard:', error);
                        });

                }
            );

        })
        .catch(error => {
            console.error('Error fetching issue details:', error);
        });
});
