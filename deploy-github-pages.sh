#!/bin/bash
# Quick GitHub Pages Deployment Script (Unix/Mac/Linux)

echo ""
echo "========================================"
echo "  SLAM Simulation - GitHub Pages Setup"
echo "========================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    echo "Please install Git from: https://git-scm.com/"
    exit 1
fi

echo "Step 1: Initializing Git repository..."
if [ ! -d .git ]; then
    git init
    echo "✓ Git initialized"
else
    echo "✓ Git already initialized"
fi

echo ""
echo "Step 2: Adding files..."
git add .
echo "✓ Files added"

echo ""
echo "Step 3: Creating commit..."
git commit -m "SLAM Simulation with custom map naming and GitHub Pages support"
echo "✓ Commit created"

echo ""
echo "========================================"
echo "  MANUAL STEPS REQUIRED"
echo "========================================"
echo ""
echo "1. Go to GitHub and create a new repository named: SLAM-Proj"
echo "   URL: https://github.com/new"
echo ""
echo "2. Run these commands with YOUR username:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/SLAM-Proj.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Enable GitHub Pages:"
echo "   - Go to repo Settings"
echo "   - Click 'Pages' in sidebar"
echo "   - Source: main branch, /docs folder"
echo "   - Click Save"
echo ""
echo "4. Visit your site (wait 1-2 minutes):"
echo "   https://YOUR_USERNAME.github.io/SLAM-Proj/"
echo ""
echo "========================================"
echo ""
