#!/bin/bash

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$PROJECT_DIR"

echo "======================================"
echo "       BANKSHIELD AI"
echo "       Starting Application..."
echo "======================================"

if [ ! -d "$PROJECT_DIR/.venv" ]; then
    echo "ERROR: Python virtual environment not found."
    exit 1
fi

if [ ! -d "$PROJECT_DIR/frontend" ]; then
    echo "ERROR: Frontend folder not found."
    exit 1
fi

if [ ! -f "$PROJECT_DIR/frontend/package.json" ]; then
    echo "ERROR: frontend/package.json not found."
    exit 1
fi

source "$PROJECT_DIR/.venv/bin/activate"

echo ""
echo "Checking BankShield Backend..."

if curl -s http://127.0.0.1:8000/docs > /dev/null 2>&1; then
    echo "Backend is already running."
else
    echo "Starting BankShield Backend..."

    PYTHONPATH="$PROJECT_DIR/backend" \
    "$PROJECT_DIR/.venv/bin/uvicorn" app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    > "$PROJECT_DIR/backend.log" 2>&1 &

    BACKEND_PID=$!

    echo "Backend PID: $BACKEND_PID"
    echo "Waiting for backend..."

    BACKEND_READY=false

    for i in {1..30}; do
        if curl -s http://127.0.0.1:8000/docs > /dev/null 2>&1; then
            BACKEND_READY=true
            break
        fi
        sleep 1
    done

    if [ "$BACKEND_READY" = false ]; then
        echo ""
        echo "ERROR: Backend failed to start."
        echo ""
        echo "Check backend.log:"
        cat "$PROJECT_DIR/backend.log"
        exit 1
    fi

    echo "Backend is ready."
fi

echo ""
echo "Starting BankShield Frontend..."

cd "$PROJECT_DIR/frontend"

npm run dev -- --host 127.0.0.1 > "$PROJECT_DIR/frontend.log" 2>&1 &

FRONTEND_PID=$!

echo "Frontend PID: $FRONTEND_PID"
echo "Waiting for frontend..."

FRONTEND_READY=false

for i in {1..30}; do
    if curl -s http://127.0.0.1:5173 > /dev/null 2>&1; then
        FRONTEND_READY=true
        break
    fi
    sleep 1
done

if [ "$FRONTEND_READY" = false ]; then
    echo ""
    echo "ERROR: Frontend failed to start."
    echo ""
    echo "Check frontend.log:"
    cat "$PROJECT_DIR/frontend.log"
    exit 1
fi

echo "Frontend is ready."

echo ""
echo "======================================"
echo "      BANKSHIELD AI IS RUNNING"
echo "======================================"
echo ""
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:5173"
echo ""

open "http://127.0.0.1:5173"

echo "Browser opened automatically."
echo ""
echo "Keep this window open while presenting."
echo ""

wait $FRONTEND_PID
