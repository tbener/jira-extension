// Saves options to chrome.storage
const saveOptions = () => {
    const customDomain = document.getElementById('customDomain').value;
    const defaultProjectKey = document.getElementById('defaultProjectKey').value;

    SettingsHandler.saveSettings({ customDomain, defaultProjectKey }).then(() => {
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    })
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    SettingsHandler.getSettings().then(settings => {
        document.getElementById('customDomain').value = settings.customDomain;
        document.getElementById('defaultProjectKey').value = settings.defaultProjectKey;
    });
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);