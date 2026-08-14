#!/bin/bash

set -e

PROJECT_DIR="/var/www/psm"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "======================================"
echo "       PSM DEPLOYMENT STARTING"
echo "======================================"

cd "$PROJECT_DIR"

echo ""
echo "[1/6] Pulling latest code..."
git pull origin main

echo ""
echo "[2/6] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm ci

echo ""
echo "[3/6] Installing frontend dependencies..."
cd "$FRONTEND_DIR"
npm ci

echo ""
echo "[4/6] Building frontend..."
npm run build

if [ ! -f "$FRONTEND_DIR/build/index.html" ]; then
    echo ""
    echo "ERROR: Frontend build failed - build/index.html not found."
    exit 1
fi

echo ""
echo "[5/6] Restarting backend..."
pm2 restart psm-backend

echo ""
echo "[6/6] Checking deployment..."
pm2 status

echo ""
echo "======================================"
echo "       PSM DEPLOYMENT COMPLETE"
echo "======================================"
echo ""
echo "Frontend:"
echo "https://psm.perpetualsolutions.co.in"
echo ""
echo "Backend:"
echo "https://api.perpetualsolutions.co.in"
echo ""
