DEFAULT_CUSTOM_DOMAIN = 'mdclone';
DEFAULT_PROJECT_KEY = 'adams';

chrome.runtime.onInstalled.addListener(function (details) {
    // Check if the extension is newly installed
    if (details.reason === "install") {
        // Save default settings or perform any necessary setup
        saveDefaultSettings();
    }
});

function saveDefaultSettings() {
    const customDomain = DEFAULT_CUSTOM_DOMAIN;
    const defaultProjectKey = DEFAULT_PROJECT_KEY;

    chrome.storage.sync.set(
        { customDomain, defaultProjectKey },
        () => {
            console.log(`Default settings saved: ${customDomain}, ${defaultProjectKey}`);
        }
    );
}

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    // This function will be called when the user types in the omnibox
    // Here you can handle the text input and provide suggestions if needed
    // For simplicity, we'll just log the input for now
    console.log('Input changed:', text);
    // appendLog('✏️ onInputChanged: ' + text);
});

chrome.omnibox.onInputEntered.addListener((text) => {
    // This function will be called when the user hits Enter after typing in the omnibox
    // Here you can handle the entered text and perform a redirect or other action
    // For example, redirect to a Google search for the entered text
    // const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
    // chrome.tabs.update({ url: searchUrl });
    console.log('Input entered:', text);
});
