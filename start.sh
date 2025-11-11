#!/bin/bash

# Nutrition Tracker Startup Script
echo "🍎 Nutrition Tracker Startup"
echo "================================"

# Check if we're in the right directory
if [ ! -f "app.py" ]; then
    echo "❌ Please run this script from the NutritionProject directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not installed"
    exit 1
fi

# Install Python dependencies if needed
echo "📦 Checking Python dependencies..."
python3 -c "import flask, flask_cors" 2>/dev/null || {
    echo "📦 Installing Python dependencies..."
    pip3 install Flask Flask-CORS
}

# Install React dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing React dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo "✅ All dependencies ready!"
echo ""

# Start Flask backend in background
echo "🚀 Starting Flask backend..."
python3 app.py &
FLASK_PID=$!

# Wait for Flask to start
sleep 3

# Start React frontend
echo "⚛️  Starting React frontend..."
cd frontend
npm start &
REACT_PID=$!

# Wait for React to start, then open browser
sleep 5
echo "🌐 Opening browser..."
if command -v open &> /dev/null; then
    open http://localhost:3000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
fi

# Wait for user to stop
echo ""
echo "✅ Nutrition Tracker is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    kill $FLASK_PID 2>/dev/null
    kill $REACT_PID 2>/dev/null
    echo "✅ Nutrition Tracker stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait
