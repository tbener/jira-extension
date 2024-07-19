
const username = 'tbener@gmail.com'
const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

let settings = {};
let typingTimer;

const issueInputElement = document.getElementById('issue');
const previewElement = document.getElementById('preview');

SettingsHandler.getSettings().then(sett => {
    settings = sett;
    document.getElementById('default_project_key').textContent = settings.defaultProjectKey;
    document.getElementById('version').textContent = settings.versionDisplay;
});

const navigateToIssue = (newWindow = true) => {
    let issue = document.getElementById('issue').value;
    if (!isNaN(issue)) {
        // only a number
        issue = `${settings.defaultProjectKey}-${issue}`;
    }

    const url = `https://${settings.customDomain}.atlassian.net/browse/${issue}`;

    // Navigate to the Jira issue page
    if (newWindow) {
        chrome.tabs.create({ url });
    } else {
        chrome.tabs.update({ url });
        window.close();
    }
};

const getIssueSummary = async () => {
    try {
        let issueKey = issueInputElement.value.trim();
        console.log(issueKey);
        if (!issueKey) return '';

        if (/^[A-Za-z]+-\d+$/.test(issueKey) === false) {
            if (isNaN(issueKey)) {
                // not a number and not in key format
                return ''
            } 
            issueKey = `${settings.defaultProjectKey}-${issueKey}`;
        }

        console.log('ISSUE:', issueKey);

        const apiGetPath = `https://${settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

        const response = await fetch(apiGetPath, {
            credentials: 'include',
            headers: {
                'Authorization': 'Basic ' + btoa(`${username}:${password}`) // Replace with your Jira username and password or API token
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch issue details. Status: ${response.status}`);
        }

        const data = await response.json();
        const summary = data.fields.summary;
        return summary;
            
    } catch (e) {
        console.log('Error fetching issue details:', e);
        return '-'
    }
}

const setPreview = async () => {
    previewElement.textContent = await getIssueSummary();
}
const clearPreview = () => {
    previewElement.textContent = ''
}

issueInputElement.addEventListener('input', async function() {
    clearPreview();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(async function() {
        await setPreview();
    }, 200);
});

issueInputElement.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'Enter') {
        navigateToIssue(false);
    }
});

document.getElementById('goButton').addEventListener('click', navigateToIssue);

document.querySelector('#go-to-options').addEventListener('click', function () {
    if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
    } else {
        window.open(chrome.runtime.getURL('/pages/options/options.html'));
    }
});