import os
import zipfile

def zip_folders_and_files(zip_filename, folders, files):
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add files in the root
        for file in files:
            if os.path.isfile(file):
                zipf.write(file, os.path.basename(file))

        # Add folders and their contents
        for folder in folders:
            if os.path.isdir(folder):
                for root, _, filenames in os.walk(folder):
                    for filename in filenames:
                        file_path = os.path.join(root, filename)
                        arcname = os.path.relpath(file_path, start=os.path.dirname(folder))
                        zipf.write(file_path, arcname)

if __name__ == "__main__":
    # Define your folders and files
    folders_to_zip = ['common', 'images', 'jira-pages', 'pages', 'services']
    files_to_zip = ['manifest.json', 'background.js']

    # Define the output zip file name
    output_zip = 'MDClone Jira Extension.zip'

    # Call the function
    zip_folders_and_files(output_zip, folders_to_zip, files_to_zip)

    print(f"Created {output_zip} successfully.")
