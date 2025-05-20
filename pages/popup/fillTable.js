export function fillIssuesTable(issuesList, containerElement) {
    console.debug("Filling issues table with:", issuesList);
    console.debug("Container element:", containerElement);

    const tbody = containerElement.querySelector("tbody");

    const issueTemplate = tbody.querySelector(".jira-issue[data-template]");
    if (!issueTemplate) {
        console.error("Issue template row not found!");
        return;
    }

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
            tbody.appendChild(issueElement);
        }

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

        if (issue.assignedToMe) {
            issueElement.classList.add("jira-my-issue");
            issueElement.setAttribute("title", `${issue.summary} | (Assigned to you)`);
            tbody.insertBefore(issueElement, tbody.firstChild);
        } else {
            issueElement.classList.remove("jira-my-issue");
            issueElement.setAttribute("title", issue.summary);
        }

        if (issue.hasOpenTab) {
            issueElement.classList.add("has-open-tab");
        } else {
            issueElement.classList.remove("has-open-tab");
        }
    });
    console.debug("Issues table filled.");
}

function createIssueElement(templateElement) {
    const issueElement = templateElement.cloneNode(true);
    issueElement.classList.remove("d-none");
    issueElement.removeAttribute("data-template");
    return issueElement;
}
