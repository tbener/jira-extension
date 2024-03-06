const breadcrumbs = document.querySelector('div[data-component-selector="breadcrumbs-wrapper"] > nav > ol > div:last-child');

const newElement = document.createElement('span');
newElement.classList.add('copy-icon')

const button = `<div class="_tzy4idpf _v5641n2p _t9ecs3yl _19bv1b66 _1e0c1txw _4cvresu3 _1h7hkb7n _1bvq1xty _ca0qv77o issue_view_permalink_button_wrapper" data-testid="issue.common.component.permalink-button.button.copy-link-button-wrapper"><div class="sc-1g0si8d-0 llvtxA"><div class="sc-1g0si8d-1 ezniiT"><div role="presentation" data-ds--text-field--container="true" class="css-1s25hsw"><input aria-hidden="true" id="BreadcrumbCurrentIssue" label="Copy link to issue" tabindex="-1" data-ds--text-field--input="true" name="field-copy-text" readonly="" class="css-1cab8vv" value=""></div></div><span role="presentation"><button class="css-yjb2hd" tabindex="0" type="button" aria-describedby="99val-tooltip"><span class="css-18kgcs9"><span data-testid="issue.common.component.permalink-button.button.link-icon" role="img" aria-label="Copy link to issue" class="css-1wits42" style="--icon-primary-color: currentColor; --icon-secondary-color: var(--ds-surface, #FFFFFF);"><svg width="24" height="24" viewBox="0 0 24 24" role="presentation"><g fill="currentColor" fill-rule="evenodd"><path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path><path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path></g></svg></span></span></button></span></div></div>`
// const button = `<div class="issue_view_permalink_button_wrapper"><div><div>
// <div role="presentation">
// <input aria-hidden="true" id="BreadcrumbCurrentIssue1" label="Copy link to issue" tabindex="-1" name="field-copy-text" readonly="" value="">
// </div></div>
// <span role="presentation"><button tabindex="0" type="button" aria-describedby="99val-tooltip">
// <span><span role="img" aria-label="Copy link to issue" style="--icon-primary-color: currentColor; --icon-secondary-color: var(--ds-surface, #FFFFFF);">
// <svg width="24" height="24" viewBox="0 0 24 24" role="presentation">
// <g fill="currentColor" fill-rule="evenodd">
// <path d="M12.856 5.457l-.937.92a1.002 1.002 0 000 1.437 1.047 1.047 0 001.463 0l.984-.966c.967-.95 2.542-1.135 3.602-.288a2.54 2.54 0 01.203 3.81l-2.903 2.852a2.646 2.646 0 01-3.696 0l-1.11-1.09L9 13.57l1.108 1.089c1.822 1.788 4.802 1.788 6.622 0l2.905-2.852a4.558 4.558 0 00-.357-6.82c-1.893-1.517-4.695-1.226-6.422.47"></path><path d="M11.144 19.543l.937-.92a1.002 1.002 0 000-1.437 1.047 1.047 0 00-1.462 0l-.985.966c-.967.95-2.542 1.135-3.602.288a2.54 2.54 0 01-.203-3.81l2.903-2.852a2.646 2.646 0 013.696 0l1.11 1.09L15 11.43l-1.108-1.089c-1.822-1.788-4.802-1.788-6.622 0l-2.905 2.852a4.558 4.558 0 00.357 6.82c1.893 1.517 4.695 1.226 6.422-.47"></path></g></svg></span></span></button></span></div></div>`



//newElement.innerHTML = button;
newElement.appendChild(document.createTextNode('Copy'))

breadcrumbs.appendChild(newElement);

newElement.addEventListener('click', () => {
    const issueKey = window.location.pathname.split('/').pop();
    console.log('issue: ', issueKey);
    
    chrome.storage.sync.get(
        { customDomain: 'mdclone' },
        (items) => {
            
            const username = 'tbener@gmail.com'
            const password = 'ATATT3xFfGF0GblxeqLm1syJGUrwfMFvTGQI7tViD01Fa03VungyrybBy8tE076aBAaaoBCGQb9zPY9Zgk13WUaZrZScodXk7vuuyNWGpYF7N332Bwxt6Jbc0UFxhyjJgKZzLAoh21mnJj8VW7FXNHvHokdwm_M2KL_487AYNaBqD095css7nr0=A52A0BB9';

            const apiGetPath = `https://${items.customDomain}.atlassian.net/rest/api/3/issue/${issueKey}`;
            
            fetch(apiGetPath, {
                headers: {
                    'Authorization': 'Basic ' + btoa(`${username}:${password}`) // Replace with your Jira username and password or API token
                }
            })
                .then(response => response.json())
                .then(data => {
                    // Handle the response data and display it in your extension UI
                    console.log('DATA: ', data);
                    const issueSummary = data.fields.summary;
                    const issueLink = `https://${items.customDomain}.atlassian.net/browse/${issueKey}`;
                    const htmlContent = `<a href="${issueLink}">${issueKey}</a>: ${issueSummary}`;

                    const copySpan = document.createElement('span');
                    copySpan.innerHTML = htmlContent;
                    console.log(copySpan);

                    // const range = document.createRange();
                    // breadcrumbs.appendChild(copySpan);
                    // range.selectNode(copySpan);
                    // const selection = window.getSelection();
                    // selection.removeAllRanges();
                    // selection.addRange(range);

                    // document.execCommand('copy');
                    // selection.removeAllRanges();
                    // breadcrumbs.removeChild(copySpan);

                    navigator.clipboard.write([
                        new ClipboardItem({
                            'text/html': new Blob([htmlContent], { type: 'text/html' })
                          })
                    ])
                        .then(() => {
                            console.log('HTML content copied to clipboard:', htmlContent);
                        })
                        .catch(error => {
                            console.error('Error copying HTML content to clipboard:', error);
                        });


                })
                .catch(error => {
                    console.error('Error fetching issue details:', error);
                });
        }
    );
})