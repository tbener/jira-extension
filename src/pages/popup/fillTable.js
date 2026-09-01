export function fillIssuesTable(issuesList, containerElement, mode = 'refresh') {
    console.debug("Filling issues table with:", issuesList, "Mode:", mode);
    console.debug("Container element:", containerElement);

    const tbody = containerElement.querySelector("tbody");

    const issueTemplate = tbody.querySelector(".jira-issue[data-template]");
    if (!issueTemplate) {
        console.error("Issue template row not found!");
        return;
    }

    if (mode === 'init') {
        // INIT MODE: Remove all existing rows and create fresh ones in correct order
        const existingRows = tbody.querySelectorAll(".jira-issue:not([data-template])");
        existingRows.forEach(row => row.remove());

        // Create all rows fresh in the correct order
        issuesList.forEach(issue => {
            const issueElement = createIssueElement(issueTemplate);
            issueElement.setAttribute("data-issue-key", issue.key);
            tbody.appendChild(issueElement);
            updateIssueElement(issueElement, issue);
        });
    } else {
        // REFRESH MODE: Update existing rows, add new ones, remove missing ones
        const existingRows = tbody.querySelectorAll(".jira-issue:not([data-template])");
        existingRows.forEach(row => {
            const issueKey = row.getAttribute("data-issue-key");
            if (!issuesList.some(issue => issue.key === issueKey)) {
                row.remove();
            }
        });

        issuesList.forEach(issue => {
            let issueElement = tbody.querySelector(`[data-issue-key="${issue.key}"]`);

            if (!issueElement) {
                issueElement = createIssueElement(issueTemplate);
                issueElement.setAttribute("data-issue-key", issue.key);
            }
            // Re-appending an already-attached node moves it rather than duplicating it -
            // doing this unconditionally (not just for new rows) keeps the DOM order in
            // sync with issuesList's order every refresh, instead of leaving previously-
            // rendered rows stuck wherever they first appeared.
            tbody.appendChild(issueElement);
            updateIssueElement(issueElement, issue);
        });
    }
    
    console.debug("Issues table filled.");
}

function updateIssueElement(issueElement, issue) {
    issueElement.querySelector(".jira-key").textContent = issue.key;
    issueElement.querySelector(".jira-summary").textContent = issue.summary;
    issueElement.querySelector(".jira-status").textContent = issue.status;

    const assigneeElement = issueElement.querySelector(".jira-assignee img");
    if (issue.assigneeIconUrl) {
        assigneeElement.src = issue.assigneeIconUrl;
        assigneeElement.alt = issue.assignee;
        assigneeElement.title = issue.assignee;
        assigneeElement.classList.remove("d-none");
    }

    const titleTags = [];

    if (issue.isActiveTab) {
        issueElement.classList.add("is-active-tab");
        titleTags.push("Currently viewing");
    } else {
        issueElement.classList.remove("is-active-tab");
    }

    if (issue.assignedToMe) {
        issueElement.classList.add("jira-my-issue");
        titleTags.push("Assigned to you");
    } else {
        issueElement.classList.remove("jira-my-issue");
    }

    if (issue.hasOpenTab) {
        issueElement.classList.add("has-open-tab");
    } else {
        issueElement.classList.remove("has-open-tab");
    }

    issueElement.setAttribute("title", titleTags.length ? `${issue.summary} | (${titleTags.join(", ")})` : issue.summary);

    // Handle favorite icon
    const favoriteElement = issueElement.querySelector(".favorite-icon");
    if (favoriteElement) {
        if (issue.isFavorite) {
            favoriteElement.classList.add("is-favorite");
        } else {
            favoriteElement.classList.remove("is-favorite");
        }
    }
}

function createIssueElement(templateElement) {
    const issueElement = templateElement.cloneNode(true);
    issueElement.classList.remove("d-none");
    issueElement.removeAttribute("data-template");
    return issueElement;
}
