@echo off
REM Script pentru pornirea aplicatiei FastAPI pe Windows

REM Incarca variabilele de mediu din .env daca exista
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            set %%a=%%b
        )
    )
)

REM Seteaza valori implicite
if not defined FASTAPI_HOST set FASTAPI_HOST=0.0.0.0
if not defined FASTAPI_PORT set FASTAPI_PORT=8000

echo Starting PortofelVirtual FastAPI server...
echo Host: %FASTAPI_HOST%
echo Port: %FASTAPI_PORT%
echo.
echo Documentation available at:
echo   - Swagger UI: http://localhost:%FASTAPI_PORT%/docs
echo   - ReDoc:      http://localhost:%FASTAPI_PORT%/redoc
echo.

REM Porneste serverul
uvicorn main:app --host %FASTAPI_HOST% --port %FASTAPI_PORT% --reload