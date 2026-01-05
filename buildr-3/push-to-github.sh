#!/bin/bash

echo ""
echo "========================================"
echo "   BUILDR 3.0 - Push to GitHub"
echo "========================================"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    echo ""
    echo "Please install Git:"
    echo "  Mac: brew install git"
    echo "  Linux: sudo apt install git"
    echo ""
    exit 1
fi

# Check if this is a git repo
if [ ! -d ".git" ]; then
    echo "Setting up Git repository for the first time..."
    echo ""
    
    git init
    git add .
    git commit -m "Initial commit - Buildr 3.0"
    git branch -M main
    
    echo ""
    echo "========================================"
    echo "FIRST TIME SETUP - Follow these steps:"
    echo "========================================"
    echo ""
    echo "1. Go to github.com and create a new repository called 'buildr-3'"
    echo "2. Copy your repository URL (looks like: https://github.com/USERNAME/buildr-3.git)"
    echo ""
    
    read -p "Paste your GitHub repository URL: " REPO_URL
    
    if [ -z "$REPO_URL" ]; then
        echo "No URL provided. Exiting."
        exit 1
    fi
    
    git remote add origin "$REPO_URL"
    git push -u origin main
    
    echo ""
    echo "SUCCESS! Your code is now on GitHub."
    echo "Vercel will automatically deploy any future changes."
    echo ""
else
    echo "Pushing updates to GitHub..."
    echo ""
    
    git add .
    
    read -p "Enter a short description of your changes (or press Enter for default): " COMMIT_MSG
    
    if [ -z "$COMMIT_MSG" ]; then
        COMMIT_MSG="Update Buildr 3.0"
    fi
    
    git commit -m "$COMMIT_MSG"
    git push
    
    echo ""
    echo "========================================"
    echo "SUCCESS! Changes pushed to GitHub."
    echo "Vercel will auto-deploy in ~60 seconds."
    echo "========================================"
    echo ""
fi
