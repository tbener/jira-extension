const VersionService = (() => {
    baseUrl = `https://raw.githubusercontent.com/tbener/jira-extension/main`;
    zipUrl = `${baseUrl}/MDClone%20Jira%20Extension.zip`;
    manifestUrl = `${baseUrl}/manifest.json`;

    const newerVersionExists = async () => {
        try {
            const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
            const now = Date.now();

            // Retrieve the last check time and result from chrome.storage.local
            const data = await new Promise((resolve) => {
                chrome.storage.local.get(['lastVersionCheckTime', 'versionCheckLastResult'], resolve);
            });
            const lastCheck = data.lastVersionCheckTime;
            const lastResult = data.versionCheckLastResult;

            // If the last check was done within the last hour, return the last result
            if (lastCheck && (now - lastCheck <= oneHour)) {
                console.log('Returning last result');
                return lastResult; // Return the last result
            }
            console.log('Checking latest version...');

            // Fetch the manifest.json file from GitHub
            const response = await fetch(manifestUrl);
            if (!response.ok) throw new Error('Failed to fetch manifest from GitHub');

            const githubManifest = await response.json();
            const githubVersion = githubManifest.version;

            // Get the local extension version
            const localVersion = chrome.runtime.getManifest().version;

            // Compare versions and show update button if the GitHub version is newer
            const isNewerVersion = isVersionNewer(githubVersion, localVersion);

            await new Promise((resolve) => {
                chrome.storage.local.set({
                    lastVersionCheckTime: now,
                    versionCheckLastResult: isNewerVersion
                }, resolve);
            });
    
            return isNewerVersion;
        }
        catch (error) {
            console.log('Error checking for update:', error);
            return false;
        }
    }

    const startUpdate = () => {
        downloadZip();
        // openExtensionsPage();
    }

    const downloadZip = () => {
        const anchor = document.createElement('a');
        anchor.href = this.zipUrl;
        anchor.click();
    }

    const openExtensionsPage = () => {
        chrome.tabs.create({ url: "chrome://extensions/" });
    }

    function isVersionNewer(githubVersion, localVersion) {
        try {
            const [gMajor, gMinor, gPatch] = githubVersion.split('.').map(Number);
            const [lMajor, lMinor, lPatch] = localVersion.split('.').map(Number);

            if (gMajor > lMajor) return true;
            if (gMajor === lMajor && gMinor > lMinor) return true;
            if (gMajor === lMajor && gMinor === lMinor && gPatch > lPatch) return true;

        } catch (error) {
            console.log(error);
        }

        return false;
    }

    return {
        newerVersionExists,
        startUpdate
    }

})();


window.VersionService = VersionService;