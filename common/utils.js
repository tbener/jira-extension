const fetchSettingsFromBackground = async () => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "getSettings" }, response => {
            if (chrome.runtime.lastError) {
                console.log("Background script returned chrome.runtime.lastError:", chrome.runtime.lastError);
                reject(new Error("Failed to fetch settings"));
                return;
            }
            if (!response || !response.settings) {
                console.log("Invalid response from background getSettings:", response);
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

/**
 * Formats a date string into a readable format (e.g., "Apr 20, 2025").
 * @param {string} dateStr - The date string to format.
 * @returns {string} - The formatted date.
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export { fetchSettingsFromBackground, formatString, formatDate };