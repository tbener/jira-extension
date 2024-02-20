// Saves options to chrome.storage
const saveOptions = () => {
    const customDomain = document.getElementById('customDomain').value;
    const defaultProjectKey = document.getElementById('defaultProjectKey').value;

    chrome.storage.sync.set(
        { customDomain, defaultProjectKey },
        () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 3000);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.sync.get(
        { customDomain: 'mdclone', defaultProjectKey: '' },
        (items) => {
            document.getElementById('customDomain').value = items.customDomain;
            document.getElementById('defaultProjectKey').value = items.defaultProjectKey;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);