@echo off
echo Starting PortofelVirtual FastAPI Server...
echo.
echo Make sure you have installed the requirements:
echo   pip install -r requirements.txt
echo.
echo Server will start on http://localhost:8000
echo Documentation available at:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc: http://localhost:8000/redoc
echo.
cd /d "%~dp0"
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000