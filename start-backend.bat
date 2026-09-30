@echo off
REM Quickstart script for Windows
cd /d "%~dp0backend"

echo ==========================================
echo   ⚡ Starting Code-to-LLM Local Backend
echo   URL: http://127.0.0.1:3387
echo ==========================================

if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate
echo Installing dependencies...
pip install -r requirements.txt

set WORKSPACE_PATH=%1
if "%WORKSPACE_PATH%"=="" set WORKSPACE_PATH=..

echo Active workspace: %WORKSPACE_PATH%
python main.py --workspace "%WORKSPACE_PATH%" --port 3387
pause
