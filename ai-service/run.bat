@echo off
REM AI Service Startup Script for Windows

echo.
echo ===============================================
echo  AI Nutrition Analysis Service - Startup
echo ===============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://www.python.org
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Check if virtual environment exists
if not exist venv (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    echo [OK] Virtual environment created
)

REM Activate virtual environment
echo [INFO] Activating virtual environment...
call venv\Scripts\activate.bat
echo [OK] Virtual environment activated

REM Install requirements
echo [INFO] Installing dependencies...
pip install -q -r requirements.txt
echo [OK] Dependencies installed

REM Start Flask server
echo.
echo ===============================================
echo  Starting Flask Server on http://localhost:5000
echo ===============================================
echo.
python app.py

pause
