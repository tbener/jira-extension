# Chrome Jira Extension Installation Guide

## Installation Steps

### Step 1: Download the Extension
1. [Download the extension zip file](https://github.com/tbener/jira-extension/raw/develop/MDClone%20Jira%20Extension.zip).

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome.
2. Navigate to the extensions page by entering `chrome://extensions/` in the address bar.

### Step 3: Enable Developer Mode
1. Switch to Developer Mode by toggling the switch at the top right corner of the extensions page.

![image](https://github.com/user-attachments/assets/5a18db38-6623-4571-b95e-af63620bbf71)

### Step 4: Install the Extension
1. Drag and drop the downloaded zip file onto the extensions page to install it.
   
### Step 5: Pin the Extension
1. Click the pin icon next to the installed extension to pin it to your toolbar for easy access.
   
   ![image](https://github.com/user-attachments/assets/9c1e64e2-26c2-4c84-b610-19632e9c5cc6)


## Features

### Quick Navigation
1. Click the extension icon or press `Alt+J` to open the quick navigation popup.
2. Type a full issue key or just a number to quickly navigate to the issue.

   ![image](https://github.com/user-attachments/assets/8ddcaf94-9070-4783-b220-cb32e922263a)


### Freeze Title
1. When viewing an issue, the title will remain visible as you scroll down, ensuring you always know which issue you're working on.
   
### Copy Issue Link with Title
1. Hover over the issue key.
2. Next to the link icon, you'll see another icon with a yellow star.
   
   ![image](https://github.com/user-attachments/assets/1a9d9512-561f-4140-b04e-eadfe76fe9ae)

3. Click the yellow star icon to copy the issue key as a link followed by the issue title.
   - Example: `[ADAMS-2175](https://mdclone.atlassian.net/browse/ADAMS-2175) - Data Prep- Merge from DISCOVER WEB (UI)`

# Dev Instructions
## Steps to upgrade
1. Switch to branch '***develop***' and merge updated code to it
2. Update new version in manifest 
3. Update necessary information in options.html ("Versions details" section)
4. Verify `create_zip.py`
   - **Folder Structure**: Ensure all necessary folders are included in the script.
   - **Root Files**: Confirm that all updated root files are listed in the script.
5. Run `create_zip.py`
   - **Run the Script**: Execute the `create_zip.py` script to generate the updated zip file.
   - **Validate Output**: Verify that the generated zip file contains all required files and folders.
   - **Test (Important!!)**: drag the new zip file and verify it works as expected.
6. Switch to branch '***main***'. This is the actual download branch. Merge to this branch ***both*** manifest.json and zip file 

## Additional Information
For more details and updates, visit the [GitHub repository](https://github.com/tbener/jira-extension).

---

Thank you for using the MDClone Chrome Jira Extension! If you encounter any issues or have suggestions, please don't hesitate to contact me.
