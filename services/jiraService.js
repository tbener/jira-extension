// // import { SettingsService } from "./settingsService";
// import { fetchSettingsFromBackground } from "../common/utils.js";

// const JiraService = (async () => {
//     const username = 'tbener@gmail.com';
//     const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

//     let abortController = null
//     const settings = await fetchSettingsFromBackground();

//     // SettingsHandler.getSettings().then(sett => {
//     //     this.settings = sett;
//     // });

//     // settingsService = new SettingsService();

//     const getIssueKey = (issueNumberOrKey) => {
//         if (issueNumberOrKey === '') return '';

//         if (/^[A-Za-z]+-\d+$/.test(issueNumberOrKey)) {
//             // the input is in full format, return it as is
//             return issueNumberOrKey
//         }

//         if (isNaN(issueNumberOrKey)) {
//             // not a number and not in key format
//             return ''
//         }

//         // input is only the number
//         return `${this.settings.defaultProjectKey}-${issueNumberOrKey}`;
//     }

//     // const getBoardLink = () => {
//     //     const r = guessBoardLink(this.settings.defaultProjectKey);
//     //     console.debug('getBoardLink', r);
//     //     return `https://${this.settings.customDomain}.atlassian.net/jira/software/c/projects/${this.settings.defaultProjectKey}/boards/183`
//     // }

//     const guessBoardLink = async (domain, projectKey) => {
//         const baseUrl = `https://${domain}.atlassian.net`;
//         const apiGetPath = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${projectKey}`;

//         try {
//             const response = await fetch(apiGetPath, {
//                 credentials: 'include',
//                 headers: {
//                     'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
//                 }
//             });

//             if (!response.ok) {
//                 console.debug(`Failed to fetch boards: HTTP ${response.status} ${response.statusText}`);
//                 return baseUrl;
//             }

//             const data = await response.json();
//             const boards = data.values;
//             let board;
//             if (boards?.length > 0) {
//                 if (boards.length === 1) {
//                     board = boards[0];
//                 } else {
//                     board = boards.find(b => b.type === 'kanban' && b.location.projectKey === projectKey);
//                     if (!board) {
//                         board = boards.find(b => b.location.projectKey === projectKey);
//                     }
//                 }
//             }

//             if (board) {
//                 return `${baseUrl}/jira/software/c/projects/${projectKey}/boards/${board.id}`;
//             }

//             // we couldn't find a relevant board
//             return baseUrl;

//         } catch (error) {
//             console.debug(`Error fetching board:`, error);
//             return baseUrl; // If fetch throws an error, return base URL silently
//         }
//     };


//     const getIssueLink = (issueKey) => {
//         return `https://${this.settings.customDomain}.atlassian.net/browse/${issueKey}`;
//     }

//     const fetchIssue = (issueKey) => {
//         if (this.abortController) {
//             this.abortController.abort();
//         }

//         abortController = new AbortController();
//         const signal = abortController.signal;

//         const apiGetPath = `https://${this.settings.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;

//         const responsePromise = fetch(apiGetPath, {
//             credentials: 'include',
//             headers: {
//                 'Authorization': 'Basic ' + btoa(`${this.username}:${this.password}`)
//             },
//             signal: signal
//         });

//         return responsePromise
//             .then(response => {
//                 return getIssueFromResponse(response);
//             })
//             .catch(error => {
//                 if (error.name === 'AbortError') {
//                     console.debug('Fetch aborted');
//                 } else {
//                     console.log('Fetch error:', apiGetPath, error.message || error.toString());
//                 }
//             });
//     }

//     const abort = () => {
//         if (this.abortController) {
//             this.abortController.abort();
//         }
//     }

//     const getIssueFromResponse = async (response) => {
//         if (!response.ok) {
//             if (response.status === 404) {
//                 return {
//                     error: 'Not found'
//                 }
//             } else {
//                 return {
//                     error: `Status ${response.status}`
//                 }
//             }
//         }
//         const data = await response.json();
//         return {
//             key: data.key,
//             summary: data.fields.summary,
//             link: getIssueLink(data.key)
//         }
//     }

//     return {
//         getIssueKey,
//         getIssueLink,
//         fetchIssue,
//         abort,
//         guessBoardLink
//     }

// })();


// window.JiraService = JiraService;