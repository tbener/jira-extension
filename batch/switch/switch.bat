@echo off
setlocal enabledelayedexpansion

REM Checking if an argument is supplied
if "%~1" neq "" (
    REM Check the first letter of the argument to toggle between 'mdclone' and 'tbener'
    set "key=%~1"
    if /i "!key:~0,1!"=="m" (
        set "key=mdclone"
    ) else if /i "!key:~0,1!"=="t" (
        set "key=tbener"
    ) else (
        echo Invalid argument. Please start with 'm' or 't'.
        exit /b 1
    )
) else (
    REM If no argument is supplied, toggle based on the content of status.txt
    set "key=mdclone"
    if exist status.txt (
        set /p prev=<status.txt
        if /i "!prev:~0,1!"=="m" (
            set "key=tbener"
        )
    ) 
)

echo Copying !key! files...
xcopy /s /y "files\manifest_!key!.json" "../../manifest.json"
xcopy /s /y "files\options_!key!.js" "../../pages/options/options.js"
xcopy /s /y "files\popup_!key!.js" "../../pages/popup/popup.js"

echo !key! > status.txt
echo.
echo Done. Set to !key!

set prev=
set key=
pause
