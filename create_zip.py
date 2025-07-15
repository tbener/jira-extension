import os
import zipfile


def zip_folders_and_files(zip_filename, folders, files, base_folder):
    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add files in the root
        for file in files:
            file_path = os.path.join(base_folder, file)
            if os.path.isfile(file_path):
                zipf.write(file_path, file)

        # Add folders and their contents
        for folder in folders:
            folder_path = os.path.join(base_folder, folder)
            if os.path.isdir(folder_path):
                for root, _, filenames in os.walk(folder_path):
                    for filename in filenames:
                        file_path = os.path.join(root, filename)
                        # Remove the base_folder from the archive path
                        arcname = os.path.relpath(file_path, start=base_folder)
                        zipf.write(file_path, arcname)


if __name__ == "__main__":
    # Define your folders and files (relative to base_folder)
    folders_to_zip = ['common', 'enum', 'images', 'jira-pages', 'models', 'pages', 'services']
    files_to_zip = ['manifest.json', 'background.js', 'config.js']

    # Define the base folder
    base_folder = 'src'

    # Define the output zip file name
    output_zip = 'TalTool Jira Extension.zip'

    # Call the function
    zip_folders_and_files(output_zip, folders_to_zip, files_to_zip, base_folder)

    print(f"Created {output_zip} successfully.")
