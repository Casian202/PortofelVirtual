#!/bin/bash
# Script pentru pornirea aplicației FastAPI

# Încarcă variabilele de mediu
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Setează valori implicite
export FASTAPI_HOST=${FASTAPI_HOST:-0.0.0.0}
export FASTAPI_PORT=${FASTAPI_PORT:-8000}

echo "Starting PortofelVirtual FastAPI server..."
echo "Host: $FASTAPI_HOST"
echo "Port: $FASTAPI_PORT"
echo ""
echo "Documentation available at:"
echo "  - Swagger UI: http://localhost:$FASTAPI_PORT/docs"
echo "  - ReDoc:      http://localhost:$FASTAPI_PORT/redoc"
echo ""

# Pornește serverul
uvicorn main:app --host $FASTAPI_HOST --port $FASTAPI_PORT --reload