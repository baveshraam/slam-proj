@echo off
REM Quick GitHub Pages Deployment Script

echo.
echo ========================================
echo   SLAM Simulation - GitHub Pages Setup
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/
    pause
    exit /b 1
)

echo Step 1: Initializing Git repository...
if not exist .git (
    git init
    echo ✓ Git initialized
) else (
    echo ✓ Git already initialized
)

echo.
echo Step 2: Adding files...
git add .
echo ✓ Files added

echo.
echo Step 3: Creating commit...
git commit -m "SLAM Simulation with custom map naming and GitHub Pages support"
echo ✓ Commit created

echo.
echo ========================================
echo   MANUAL STEPS REQUIRED
echo ========================================
echo.
echo 1. Go to GitHub and create a new repository named: SLAM-Proj
echo    URL: https://github.com/new
echo.
echo 2. Run these commands with YOUR username:
echo.
echo    git remote add origin https://github.com/YOUR_USERNAME/SLAM-Proj.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Enable GitHub Pages:
echo    - Go to repo Settings
echo    - Click "Pages" in sidebar
echo    - Source: main branch, /docs folder
echo    - Click Save
echo.
echo 4. Visit your site (wait 1-2 minutes):
echo    https://YOUR_USERNAME.github.io/SLAM-Proj/
echo.
echo ========================================

pause
