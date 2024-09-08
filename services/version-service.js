const VersionService = (() => {
    branch = 'develop';
    zipUrl = `https://github.com/tbener/jira-extension/raw/${branch}/MDClone%20Jira%20Extension.zip`

    const newerVersionExists = () => {
        return true;
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

    return {
        newerVersionExists,
        startUpdate
    }

})();


window.VersionService = VersionService;