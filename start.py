#!/usr/bin/env python3
"""
Startup script for Nutrition Tracker
Runs both Flask backend and React frontend
"""

import subprocess
import sys
import os
import time
import threading
import webbrowser
from pathlib import Path

def run_flask():
    """Run Flask backend"""
    print("🚀 Starting Flask backend...")
    try:
        subprocess.run([sys.executable, "app.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Flask backend failed: {e}")
    except KeyboardInterrupt:
        print("🛑 Flask backend stopped")

def run_react():
    """Run React frontend"""
    print("⚛️  Starting React frontend...")
    frontend_dir = Path("frontend")
    
    if not frontend_dir.exists():
        print("❌ Frontend directory not found!")
        return
    
    try:
        # Check if node_modules exists, if not install dependencies
        if not (frontend_dir / "node_modules").exists():
            print("📦 Installing React dependencies...")
            subprocess.run(["npm", "install"], cwd=frontend_dir, check=True)
        
        # Start React development server
        subprocess.run(["npm", "start"], cwd=frontend_dir, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ React frontend failed: {e}")
    except KeyboardInterrupt:
        print("🛑 React frontend stopped")

def main():
    print("🍎 Nutrition Tracker Startup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("app.py").exists():
        print("❌ Please run this script from the NutritionProject directory")
        sys.exit(1)
    
    # Check if Node.js is installed
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js and npm are required but not installed")
        print("   Please install Node.js from https://nodejs.org/")
        sys.exit(1)
    
    # Check if Flask is installed
    try:
        import flask
        import flask_cors
    except ImportError:
        print("📦 Installing Python dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "Flask", "Flask-CORS"], check=True)
    
    print("✅ All dependencies ready!")
    print()
    
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Wait a moment for Flask to start
    time.sleep(3)
    
    # Open browser after a delay
    def open_browser():
        time.sleep(5)  # Wait for React to start
        print("🌐 Opening browser...")
        webbrowser.open("http://localhost:3000")
    
    browser_thread = threading.Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start React (this will block)
    try:
        run_react()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        print("✅ Nutrition Tracker stopped")

if __name__ == "__main__":
    main()
