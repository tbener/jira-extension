const fetchSettingsFromBackground = async () => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getSettings" }, response => {
            if (chrome.runtime.lastError) {
                console.warn("Background script returned chrome.runtime.lastError:", chrome.runtime.lastError);
                reject(new Error("Failed to fetch settings"));
                return;
            }
            if (!response || !response.settings) {
                console.warn("Invalid response from background getSettings:", response);
                reject(new Error("Invalid settings response"));
                return;
            }
            resolve(response.settings);
        });
    });
};

const formatString = (str, ...args) => {
    return str.replace(/{(\d+)}/g, (match, number) => {
        return typeof args[number] !== 'undefined' ? args[number] : match;
    });
};

export { fetchSettingsFromBackground, formatString };