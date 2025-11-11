# Nutrition Tracker

A full-stack nutrition tracking application with Flask backend and React frontend.

## Features

- **User Authentication**: Register and login system
- **Meal Logging**: Track daily meals and nutrition
- **Receipt Processing**: OCR to extract food items from receipts
- **Purdue Menu Integration**: Scrape dining hall nutrition data
- **Goal Setting**: Set and track nutrition goals
- **Dashboard**: Visual nutrition tracking with charts
- **Macro Calculations**: Calculate TDEE and weight change predictions

## Project Structure

```
NutritionProject/
├── DB.py                          # Database schema and functions
├── app.py                         # Flask API server
├── nutrition_calculations.py      # Template for Tanish's functions
├── food_input.py                  # Template for Karthik's functions
├── requirements.txt               # Python dependencies
├── frontend/                      # React frontend
│   ├── package.json
│   ├── src/
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── Dashboard.js
│   │   │   ├── MealLog.js
│   │   │   ├── Goals.js
│   │   │   └── Navbar.js
│   │   └── index.css
└── README.md
```

## How to Run

### Backend (Flask API)

1. **Install Python dependencies:**
   ```bash
   pip install Flask Flask-CORS
   ```

2. **Run the Flask server:**
   ```bash
   python app.py
   ```
   
   The API will be available at `http://localhost:5000`

### Frontend (React App)

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Start the React development server:**
   ```bash
   npm start
   ```
   
   The app will open at `http://localhost:3000`

## API Endpoints

- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/meals` - Add meal entry
- `GET /api/meals/<user_id>/<date>` - Get daily meals
- `POST /api/foods` - Add food item
- `POST /api/receipt/process` - Process receipt image
- `GET /api/purdue/menu/<date>` - Get Purdue menu
- `POST /api/calculations/macros` - Calculate macro percentages
- `POST /api/goals/<user_id>` - Set user goals

## Database

SQLite database with tables:
- `users` - User profiles and authentication
- `foods` - Master list of food items with nutrition
- `meal_entries` - Individual meal logs
- `user_goals` - User nutrition goals

## Development Status

- ✅ Database schema and functions
- ✅ Flask API with all endpoints
- ✅ React frontend with modern UI
- ⏳ Tanish's nutrition calculation functions
- ⏳ Karthik's receipt processing functions

## Requirements

- Python 3.7+
- Node.js 14+
- npm or yarn

## Notes

- The app uses mock data for demonstration
- Function templates are provided for team members to implement
- CORS is enabled for frontend-backend communication
- Database auto-initializes on first run
