const updateNotificationElement = document.getElementsByClassName('update-notification')[0];
const upToDateNotificationElement = document.getElementsByClassName('update-not-required')[0];
const downloadUpdateElement = document.getElementById('download-update');
const checkUpdateElement = document.getElementById('checkUpdateButton');

checkUpdateElement.addEventListener('click', async () => checkUpdate(true));

document.addEventListener('DOMContentLoaded', async () => {
    updateNotificationElement.addEventListener('click', VersionService.startUpdate);
    downloadUpdateElement.addEventListener('click', VersionService.startUpdate);

    checkUpdate(false);
});

const checkUpdate = async (force = false) => {
    const versionInfo = await VersionService.checkLatestVersion(force);

    if (versionInfo.isNewerVersion) {
        upToDateNotificationElement.style.display = 'none';
        updateNotificationElement.style.display = 'block';
        updateNotificationElement.textContent = `Version v${versionInfo.remoteVersion} is now available. Click to download.`;
    } else {
        updateNotificationElement.style.display = 'none';
        upToDateNotificationElement.style.display = force ? 'block' : 'none';
    }
}

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
        document.getElementById('version').textContent = settings.versionDisplay;
    });
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('saveButton').addEventListener('click', saveOptions);