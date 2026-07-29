import { JiraHttpService } from "./jira/jiraHttpService.js";

export class IssuesLists {
    issuesList = {};
    sortedIssuesList = [];
    favorites = new Set();

    jiraHttpService = new JiraHttpService();

    customProperties = {
        OpenTabs: { hasOpenTab: true },
        AssignedToMe: { assignedToMe: true },
    };

    init = async () => {
        console.debug('Initializing IssuesLists');

        await this.jiraHttpService.init();
        await this.loadFavorites();
        this.updateSortedList(); // Initialize sorted list even if empty
        console.debug('IssuesLists initialized!!!');
    }

    // newoOpenTabsKeys are the currently open tabs - merge them to the list without fetching from server
    // -----------
    // if a key from newoOpenTabsKeys is in this.issuesList, set hasOpenTab to true, isUpdated to false
    // if a key from newoOpenTabsKeys is NOT in this.issuesList, add it with hasOpenTab to true, isUpdated to false
    // if a key is in this.issuesList but not in newoOpenTabsKeys, if it's not assigned to me, remove it from the this.issuesList
    mergeOpenTabsIssues = (newoOpenTabsKeys) => {
        console.debug("Merging open tabs issues to list.", newoOpenTabsKeys, this.issuesList);
        const existingKeys = newoOpenTabsKeys.filter(key => this.issuesList[key]);
        console.debug("Existing keys:", existingKeys);
        const newKeys = newoOpenTabsKeys.filter(key => !existingKeys.includes(key));
        console.debug("New keys:", newKeys);

        const openTabField = { hasOpenTab: true, isUpdated: false };

        existingKeys.forEach(key => {
            // set hasOpenTab
            Object.assign(this.issuesList[key], openTabField);
        });
        console.debug("Existing keys updated.", this.issuesList);

        this._addIssues(newKeys.map(key => ({ key })), openTabField);
        console.debug("New keys added.", this.issuesList);

        // remove issues that are not in newoOpenTabsKeys and not assigned to me and not favorites
        Object.keys(this.issuesList).forEach(key => {
            if (!newoOpenTabsKeys.includes(key)) {
                if (this.issuesList[key].assignedToMe || this.isFavorite(key)) {
                    this.issuesList[key].hasOpenTab = false;
                } else {
                    delete this.issuesList[key];
                }
            }
        });

        console.debug("Open tabs issues merged to list (not updated from server).", this.issuesList);
        this.updateSortedList();
    }


    /**
     * Refreshes the issues list from the server.
     * Fetches my issues, open tabs issues, and favorite issues from the server and updates the list.
     */
    updateIssuesList = async () => {
        console.debug("Updating issues list from server. Current:", this.issuesList);
        const openTabsKeys = Object.keys(this.issuesList).filter(key => this.issuesList[key].hasOpenTab);
        const favoriteKeys = Array.from(this.favorites);
        
        // Create a single list of all keys to fetch, removing duplicates
        const allKeysToFetch = [...new Set([...openTabsKeys, ...favoriteKeys])];
        
        const [myIssues, additionalIssues] = await Promise.all([
            this.jiraHttpService.fetchMyIssues(),
            allKeysToFetch.length > 0 ? this.jiraHttpService.fetchByKeys(allKeysToFetch) : Promise.resolve([])
        ]);

        console.debug("Issues fetched from server.", { myIssues, additionalIssues });

        this.issuesList = {};
        this._addIssues(myIssues, this.customProperties.AssignedToMe);
        
        // Add additional issues with appropriate properties
        // Filter open tabs issues first
        const openTabsIssues = additionalIssues.filter(issue => openTabsKeys.includes(issue.key));
        const otherIssues = additionalIssues.filter(issue => !openTabsKeys.includes(issue.key));
        
        // Add open tabs issues with open tabs properties
        if (openTabsIssues.length > 0) {
            this._addIssues(openTabsIssues, this.customProperties.OpenTabs);
        }
        
        // Add remaining issues without special properties
        if (otherIssues.length > 0) {
            this._addIssues(otherIssues, {});
        }
        
        console.debug("Issues updated and stored.", this.issuesList);
        this.updateSortedList();
    }


    // addMyIssues = async () => {
    //     const issues = await this.jiraHttpService.fetchMyIssues();
    //     this._addIssues(issues, { assignedToMe: true });
    //     console.debug("Assigned issues fetched and stored.", this.issuesList);
    // }

    // addIssues = async (issueKeys, hasOpenTab) => {
    //     const issues = await this.jiraHttpService.fetchByKeys(issueKeys);
    //     const overrideFields = hasOpenTab ? { hasOpenTab: true } : {};
    //     this._addIssues(issues, overrideFields);
    //     console.debug("Issues fetched and stored.", this.issuesList);
    // }

    // addOpenTabsIssues = async () => {
    //     const { issueKeys } = await new Promise((resolve, reject) => {
    //         chrome.runtime.sendMessage({ action: "getOpenTabsIssues" }, response => {
    //             if (chrome.runtime.lastError) {
    //                 reject(chrome.runtime.lastError);
    //             } else {
    //                 resolve(response);
    //             }
    //         });
    //     });

    //     // remove existing keys from issuekeys
    //     const existingKeys = issueKeys.filter(key => this.issuesList[key]);
    //     const newKeys = issueKeys.filter(key => !existingKeys.includes(key));

    //     const openTabField = { hasOpenTab: true };

    //     existingKeys.forEach(key => {
    //         // set hasOpenTab
    //         Object.assign(this.issuesList[key], openTabField);
    //     });

    //     const issues = await this.jiraHttpService.fetchByKeys(newKeys);
    //     this._addIssues(issues, openTabField);
    //     console.debug("Open tabs issues fetched and stored.", this.issuesList);
    // }

    getList = () => this.sortedIssuesList;

    updateSortedList = () => {
        const issues = Object.values(this.issuesList);
        this.sortedIssuesList = this.sortIssues(issues);
        console.debug("Sorted issues list updated:", this.sortedIssuesList.map(i => `${i.key}(F:${i.isFavorite},M:${i.assignedToMe})`));
    }

    sortIssues = (issues) => {
        return issues.sort((a, b) => {
            // Priority 1: Assigned to me first
            if (a.assignedToMe && !b.assignedToMe) return -1;
            if (!a.assignedToMe && b.assignedToMe) return 1;
            
            // Priority 2: Within same assignment status, favorites first
            if (a.assignedToMe === b.assignedToMe) {
                if (a.isFavorite && !b.isFavorite) return -1;
                if (!a.isFavorite && b.isFavorite) return 1;
            }
            
            // Priority 3: Within same category, maintain original order (by key)
            return a.key.localeCompare(b.key);
        });
    }

    // Favorites methods
    loadFavorites = async () => {
        return new Promise((resolve) => {
            chrome.storage.sync.get({ favorites: [] }, (items) => {
                this.favorites = new Set(items.favorites);
                console.debug("Favorites loaded from storage:", Array.from(this.favorites));
                resolve(this.favorites);
            });
        });
    }

    saveFavorites = async () => {
        return new Promise((resolve, reject) => {
            const favoritesArray = Array.from(this.favorites);
            chrome.storage.sync.set({ favorites: favoritesArray }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error saving favorites:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.debug('Favorites saved to storage:', favoritesArray);
                    resolve(favoritesArray);
                }
            });
        });
    }

    toggleFavorite = async (issueKey) => {
        const wasFavorite = this.favorites.has(issueKey);
        
        if (wasFavorite) {
            this.favorites.delete(issueKey);
            console.debug(`Removed ${issueKey} from favorites`);
        } else {
            this.favorites.add(issueKey);
            console.debug(`Added ${issueKey} to favorites`);
        }

        // Update the issue in the list if it exists
        if (this.issuesList[issueKey]) {
            this.issuesList[issueKey].isFavorite = !wasFavorite;
        }

        await this.saveFavorites();
        this.updateSortedList();
        return !wasFavorite;
    }

    isFavorite = (issueKey) => {
        return this.favorites.has(issueKey);
    }

    getFavoritesList = () => {
        return this.sortedIssuesList.filter(issue => issue.isFavorite);
    }

    _addIssues(issues, overrideFields) {
        issues.forEach(issue => {
            this._setIssue(issue, overrideFields);
        });
    }

    _setIssue(issue, overrideFields = {}) {
        console.debug("Saving issue in issueList.","issue:" , issue, "overrideFields:", overrideFields);
        if (this.issuesList[issue.key]) {
            console.debug("Issue already exists, updating.");
            this.issuesList[issue.key] = {
                ...this.issuesList[issue.key],
                ...issue,
                ...overrideFields,
            };
        } else {
            console.debug("Issue is new, adding.");
            this.issuesList[issue.key] = this._mapIssue(issue, overrideFields);
        }
        console.debug("Issue saved:", this.issuesList[issue.key]);
    }

    _mapIssue(issue, overrideFields) {
        const { id = '', key, assignedToMe = false, hasOpenTab = false, fields = {} } = issue;
        const { summary = '', status = null, assignee = null, created = null, updated = null } = fields;

        return {
            id,
            key,
            summary,
            status: status?.name ?? "---",
            statusCategory: status?.statusCategory?.name ?? null,
            assignee: assignee?.displayName,
            assigneeIconUrl: assignee?.avatarUrls?.["16x16"],
            created,
            updated,
            assignedToMe,
            hasOpenTab,
            isFavorite: this.isFavorite(key),
            isUpdated: true,

            ...overrideFields,
        };
    }
}