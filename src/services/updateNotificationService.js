export class UpdateNotificationService {
    constructor() {
        this.currentVersion = chrome.runtime.getManifest().version;
        this.storageKey = 'lastSeenVersion';
        this.badgeKey = 'showUpdateBadge';
        this.lastShownMessageVersionKey = 'lastShownMessageVersion';
    }

    init = async () => {
        console.debug('Initializing UpdateNotificationService');
        await this.checkForNewVersion();
    }

    checkForNewVersion = async () => {
        return new Promise(async (resolve) => {
            chrome.storage.sync.get([this.storageKey, this.badgeKey, this.lastShownMessageVersionKey], async (items) => {
                const lastSeenVersion = items[this.storageKey];
                const showBadge = items[this.badgeKey] !== false; // default to true if not set
                const lastShownMessageVersion = items[this.lastShownMessageVersionKey];
                
                // Get the update message to check its version
                const updateMessage = await this.getUpdateMessage();
                const messageVersion = updateMessage.version;
                
                console.debug('Version check:', {
                    current: this.currentVersion,
                    lastSeen: lastSeenVersion,
                    messageVersion: messageVersion,
                    lastShownMessageVersion: lastShownMessageVersion,
                    showBadge: showBadge
                });

                // Check if we should show notification based on message version
                const shouldShowNotification = messageVersion && 
                    (!lastShownMessageVersion || this.isNewerVersion(messageVersion, lastShownMessageVersion));

                if (shouldShowNotification) {
                    this.setUpdateBadge(true);
                } else if (showBadge) {
                    // Keep badge if it was already set (message shown but popup not opened)
                    this.setUpdateBadge(true);
                } else {
                    this.setUpdateBadge(false);
                }
                
                resolve({
                    isNewVersion: !lastSeenVersion || this.isNewerVersion(this.currentVersion, lastSeenVersion),
                    currentVersion: this.currentVersion,
                    lastSeenVersion: lastSeenVersion,
                    shouldShowNotification: shouldShowNotification || showBadge,
                    messageVersion: messageVersion,
                    lastShownMessageVersion: lastShownMessageVersion
                });
            });
        });
    }

    isNewerVersion = (current, last) => {
        if (!last) return true;
        
        const currentParts = current.split('.').map(Number);
        const lastParts = last.split('.').map(Number);
        
        for (let i = 0; i < Math.max(currentParts.length, lastParts.length); i++) {
            const currentPart = currentParts[i] || 0;
            const lastPart = lastParts[i] || 0;
            
            if (currentPart > lastPart) return true;
            if (currentPart < lastPart) return false;
        }
        
        return false;
    }

    setUpdateBadge = (show) => {
        if (show) {
            // Use update icon with notification indicator
            chrome.action.setIcon({ path: 'images/icon-16-upd.png' });
        } else {
            // Use normal icon
            chrome.action.setIcon({ path: 'images/icon-16.png' });
        }
        
        // Store badge state
        chrome.storage.sync.set({ [this.badgeKey]: show });
    }

    markVersionAsSeen = async () => {
        return new Promise(async (resolve) => {
            // Get the current message version to mark it as shown
            const updateMessage = await this.getUpdateMessage();
            const messageVersion = updateMessage.version;
            
            chrome.storage.sync.set({
                [this.storageKey]: this.currentVersion,
                [this.badgeKey]: false,
                [this.lastShownMessageVersionKey]: messageVersion
            }, () => {
                this.setUpdateBadge(false);
                console.debug(`Version ${this.currentVersion} marked as seen, message version ${messageVersion} marked as shown`);
                resolve();
            });
        });
    }

    shouldShowUpdateMessage = async () => {
        return new Promise(async (resolve) => {
            chrome.storage.sync.get([this.badgeKey, this.lastShownMessageVersionKey], async (items) => {
                const showBadge = items[this.badgeKey] !== false;
                const lastShownMessageVersion = items[this.lastShownMessageVersionKey];
                
                // Get the update message to check its version
                const updateMessage = await this.getUpdateMessage();
                const messageVersion = updateMessage.version;
                
                // Show message if:
                // 1. There's a message version and it's newer than what we've shown before, OR
                // 2. Badge is set (message was shown but popup not opened yet)
                const hasNewMessage = messageVersion && 
                    (!lastShownMessageVersion || this.isNewerVersion(messageVersion, lastShownMessageVersion));
                
                const shouldShow = hasNewMessage || showBadge;
                
                console.debug('Should show update message:', {
                    messageVersion,
                    lastShownMessageVersion,
                    hasNewMessage,
                    showBadge,
                    shouldShow
                });
                
                resolve(shouldShow);
            });
        });
    }

    getUpdateMessage = async () => {
        try {
            const response = await fetch(chrome.runtime.getURL('update-messages.json'));
            const messages = await response.json();
            
            // Always use latest message
            const latestMessage = messages.latest;
            
            return {
                version: latestMessage?.version || this.currentVersion, // Use message version or fallback to current
                title: latestMessage?.title || "What's New",
                message: latestMessage?.message || "New features and improvements available!",
                features: latestMessage?.features || []
            };
        } catch (error) {
            console.warn('Could not load update messages:', error);
            return {
                version: this.currentVersion,
                title: "What's New",
                message: "New features and improvements available!",
                features: []
            };
        }
    }
}
