#!/bin/bash

# AI Service Startup Script for Unix/Linux/Mac

echo "==============================================="
echo "  AI Nutrition Analysis Service - Startup"
echo "==============================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python3 is not installed"
    echo "Please install Python 3.7+ from https://www.python.org"
    exit 1
fi

echo "[OK] Python3 found: $(python3 --version)"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "[INFO] Creating virtual environment..."
    python3 -m venv venv
    echo "[OK] Virtual environment created"
fi

# Activate virtual environment
echo "[INFO] Activating virtual environment..."
source venv/bin/activate
echo "[OK] Virtual environment activated"

# Install requirements
echo "[INFO] Installing dependencies..."
pip install -q -r requirements.txt
echo "[OK] Dependencies installed"

# Start Flask server
echo ""
echo "==============================================="
echo "  Starting Flask Server on http://localhost:5000"
echo "==============================================="
echo ""

python app.py
