# Releasing

Steps to ship a new version of the extension.

1. Switch to `develop` and merge the updated code into it.
2. Bump the version in `src/manifest.json`.
3. Add an entry describing the change under "Versions details" in `src/pages/options/options.html`.
4. Verify `create_zip.py`:
   - **Folder Structure**: make sure all necessary folders are listed in the script.
   - **Root Files**: make sure all updated root files are listed in the script.
5. Run `create_zip.py` to generate `TalTool Jira Extension.zip`.
   - **Test (important!)**: drag the new zip into `chrome://extensions/` and verify it works as expected before publishing.
6. Merge `develop` into `main` to keep it up to date. `main` isn't the source of truth for distribution anymore (the extension is distributed via the Chrome Web Store, not self-hosted updates), but it's worth keeping in sync in case it's useful for automating this process later.
7. Upload the zip via the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole): select the extension, go to Package, upload the new zip, and submit.

## Future automation

The Chrome Web Store has a Publish API that could automate step 7 (uploading and submitting the package) instead of doing it manually through the dashboard. Not implemented yet — tracked as a follow-up.
