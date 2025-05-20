const VersionService = (() => {
    EXTENSIONS_PAGE_URL = 'chrome://extensions/';

    baseUrl = `https://raw.githubusercontent.com/tbener/jira-extension/main`;
    zipUrl = `${baseUrl}/MDClone%20Jira%20Extension.zip`;
    manifestUrl = `${baseUrl}/manifest.json`;

    const checkLatestVersion = async (force = false) => {
        try {
            const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
            const now = Date.now();

            if (!force) {
                // Retrieve the last check time and result from chrome.storage.local
                const data = await new Promise((resolve) => {
                    chrome.storage.local.get(['lastVersionCheckTime', 'versionCheckLastResult', 'remoteVersion'], resolve);
                });
                const lastCheck = data.lastVersionCheckTime;
                const lastResult = data.versionCheckLastResult;
                let remoteVersion = data.remoteVersion;

                // If the last check was done within the last hour, return the last result
                if (lastCheck && (now - lastCheck <= oneHour)) {
                    console.debug('Returning last result');
                    return { isNewerVersion: lastResult, remoteVersion }
                }
            }
            console.debug('Checking latest version...');

            // Fetch the manifest.json file from GitHub
            const response = await fetch(manifestUrl);
            if (!response.ok) throw new Error('Failed to fetch manifest from GitHub');

            const remoteManifest = await response.json();
            remoteVersion = remoteManifest.version;
            console.log(`Jira Extension latest version: ${remoteVersion}`);

            // Compare versions and show update button if the GitHub version is newer
            const isNewerVersion = isVersionNewer(remoteVersion);

            await new Promise((resolve) => {
                chrome.storage.local.set({
                    lastVersionCheckTime: now,
                    versionCheckLastResult: isNewerVersion,
                    remoteVersion
                }, resolve);
            });

            return { isNewerVersion, remoteVersion };
        }
        catch (error) {
            console.log('Error checking for update:', error);
            return { isNewerVersion: false };
        }
    }

    const startUpdate = async () => {
        await openExtensionsPage();
        downloadZip();
    }

    const downloadZip = () => {
        const anchor = document.createElement('a');
        anchor.href = this.zipUrl;
        anchor.click();
    }

    const openExtensionsPage = () => {
        return new Promise((resolve) => {
            chrome.tabs.query({ currentWindow: true }, function (tabs) {
                const extensionTab = tabs.find(tab => tab.url === EXTENSIONS_PAGE_URL);
    
                if (extensionTab) {
                    // If found, bring the tab to focus
                    chrome.tabs.update(extensionTab.id, { active: true }, resolve);
                } else {
                    // If not found, open a new tab
                    chrome.tabs.create({ url: EXTENSIONS_PAGE_URL }, resolve);
                }
            });
        });
    };

    // Check if version is newer than the current version
    function isVersionNewer(version) {
        try {
            const currentVersion = chrome.runtime.getManifest().version;
            const [gMajor, gMinor, gPatch] = version.split('.').map(Number);
            const [lMajor, lMinor, lPatch] = currentVersion.split('.').map(Number);

            if (gMajor > lMajor) return true;
            if (gMajor === lMajor && gMinor > lMinor) return true;
            if (gMajor === lMajor && gMinor === lMinor && gPatch > lPatch) return true;

        } catch (error) {
            console.error(error);
        }

        return false;
    }

    return {
        checkLatestVersion,
        startUpdate
    }

})();


window.VersionService = VersionService;