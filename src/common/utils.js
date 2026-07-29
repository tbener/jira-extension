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
 * Formats a date string into a readable format with optional relative indicators.
 * @param {string} dateStr - The date string to format.
 * @param {boolean} includeRelativeIndicators - Whether to include "(today)", "(tomorrow)", "(passed)" indicators. Default: false.
 * @returns {string} - The formatted date with optional indicators.
 */
function formatDate(dateStr, includeRelativeIndicators = false) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Reset time to compare only dates
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    
    const formattedDate = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
    
    if (includeRelativeIndicators) {
        if (dateOnly.getTime() === todayOnly.getTime()) {
            return `${formattedDate} (today)`;
        } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
            return `${formattedDate} (tomorrow)`;
        } else if (dateOnly < todayOnly) {
            return `${formattedDate} (overdue)`;
        }
    }
    
    return formattedDate;
}

export { fetchSettingsFromBackground, formatString, formatDate };