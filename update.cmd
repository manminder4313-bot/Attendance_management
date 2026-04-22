@echo off
echo ========================================
echo Updating GitHub Repository...
echo ========================================

echo [1/3] Staging all changes...
git add .

echo [2/3] Committing changes...
git commit -m "Update Attendance Management System"

echo [3/3] Pushing to remote repository...
git push origin main

echo ========================================
echo Update Completed Successfully!
echo ========================================
pause
