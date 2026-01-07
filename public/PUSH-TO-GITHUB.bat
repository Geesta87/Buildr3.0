@echo off
echo.
echo ========================================
echo    BUILDR 3.0 - Push to GitHub
echo ========================================
echo.

:: Check if git is installed
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo.
    echo Please download and install Git from:
    echo https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

:: Navigate to script directory
cd /d "%~dp0"

:: Check if this is a git repo
if not exist ".git" (
    echo Setting up Git repository for the first time...
    echo.
    
    git init
    git add .
    git commit -m "Initial commit - Buildr 3.0"
    git branch -M main
    
    echo.
    echo ========================================
    echo FIRST TIME SETUP - Follow these steps:
    echo ========================================
    echo.
    echo 1. Go to github.com and create a new repository called "buildr-3"
    echo 2. Copy your repository URL (looks like: https://github.com/USERNAME/buildr-3.git)
    echo 3. Run this script again and paste the URL when asked
    echo.
    
    set /p REPO_URL="Paste your GitHub repository URL: "
    
    if "%REPO_URL%"=="" (
        echo No URL provided. Exiting.
        pause
        exit /b 1
    )
    
    git remote add origin %REPO_URL%
    git push -u origin main
    
    echo.
    echo SUCCESS! Your code is now on GitHub.
    echo Vercel will automatically deploy any future changes.
    echo.
) else (
    echo Pushing updates to GitHub...
    echo.
    
    git add .
    
    set /p COMMIT_MSG="Enter a short description of your changes (or press Enter for default): "
    
    if "%COMMIT_MSG%"=="" (
        set COMMIT_MSG=Update Buildr 3.0
    )
    
    git commit -m "%COMMIT_MSG%"
    git push
    
    echo.
    echo ========================================
    echo SUCCESS! Changes pushed to GitHub.
    echo Vercel will auto-deploy in ~60 seconds.
    echo ========================================
    echo.
)

pause
