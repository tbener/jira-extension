export function fillIssuesTable(issuesList, containerElement) {
    console.debug("Filling issues table with:", issuesList);

    if (!containerElement) {
        console.error("Container element not found!");
        return;
    }

    const tbody = containerElement.querySelector("tbody");
    if (!tbody) {
        console.error("Tbody not found in table!");
        return;
    }

    const issueTemplate = tbody.querySelector(".jira-issue");
    if (!issueTemplate) {
        console.error("Issue template row not found!");
        return;
    }

    const existingRows = tbody.querySelectorAll(".jira-issue");
    existingRows.forEach(row => {
        const issueKey = row.getAttribute("data-issue-key");
        if (!issuesList.some(issue => issue.key === issueKey)) {
            row.remove();
        }
    });

    issuesList.forEach(issue => {
        let issueElement = tbody.querySelector(`[data-issue-key="${issue.key}"]`);
        
        if (!issueElement) {
            issueElement = issueTemplate.cloneNode(true);
            issueElement.classList.remove("d-none");
            issueElement.setAttribute("data-issue-key", issue.key);
            tbody.appendChild(issueElement);
        }

        issueElement.querySelector(".jira-key").textContent = issue.key;
        issueElement.querySelector(".jira-summary").textContent = issue.summary;
        issueElement.querySelector(".jira-status").textContent = issue.status;

        if (issue.assignedToMe) {
            issueElement.classList.add("jira-my-issue");
            issueElement.setAttribute("title", "Assigned to you");
            tbody.insertBefore(issueElement, tbody.firstChild);
        } else {
            issueElement.classList.remove("jira-my-issue");
            issueElement.removeAttribute("title");
        }

        if (issue.hasOpenTab) {
            issueElement.classList.add("has-open-tab");
        } else {
            issueElement.classList.remove("has-open-tab");
        }
    });
    console.debug("Issues table filled.");
}
