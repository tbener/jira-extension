export function fillIssuesTable(issuesList, containerElement) {
    if (!containerElement) {
        console.error("Container element not found!");
        return;
    }

    // Get the template issue element
    const issueTemplate = containerElement.querySelector(".jira-issue");
    if (!issueTemplate) {
        console.error("Issue template not found!");
        return;
    }

    // Clear existing issues (except the template)
    containerElement.innerHTML = "";

    issuesList.forEach(issue => {
        // Clone the issue template
        const issueElement = issueTemplate.cloneNode(true);

        // Store issue key in a data attribute
        issueElement.setAttribute("data-issue-key", issue.key);

        // Fill the issue data
        issueElement.querySelector(".jira-key").textContent = issue.key;
        issueElement.querySelector(".jira-summary").textContent = issue.summary;
        issueElement.querySelector(".jira-status").textContent = issue.status;

        // Add class if assigned to the user
        if (issue.assignedToMe) {
            issueElement.classList.add("jira-my-issue");
            issueElement.setAttribute("title", "Assigned to you");
        }

        // If the issue has an open tab, add the class
        if (issue.hasOpenTab) {
            issueElement.classList.add("has-open-tab");
        }

        // Append to container
        containerElement.appendChild(issueElement);
    });
}
