import sqlite3
import hashlib
from datetime import datetime

# Database connection with threading support
conn = sqlite3.connect('nutrition_tracker.db', check_same_thread=False)
cursor = conn.cursor()

def init_database():
    """Initialize all database tables"""
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            weight_lbs REAL,
            sex TEXT CHECK(sex IN ('male', 'female')),
            activity_level TEXT CHECK(activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
            height_inches REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Foods table (master list of unique food items)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            serving_size_value REAL NOT NULL,  -- e.g., 1.0
            serving_size_unit TEXT NOT NULL,   -- e.g., "slice", "sandwich", "cup"
            calories_per_serving REAL NOT NULL,
            protein_g_per_serving REAL NOT NULL,
            carbs_g_per_serving REAL NOT NULL,
            fat_g_per_serving REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Meal entries table (individual food servings with quantities)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS meal_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            food_id INTEGER NOT NULL,
            quantity_servings REAL NOT NULL,  -- number of servings consumed
            meal_type TEXT CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
            source TEXT CHECK(source IN ('purdue_menu', 'receipt', 'manual')),
            entry_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (food_id) REFERENCES foods(id)
        )
    ''')
    
    # User goals table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            goal_weight_change_lbs_per_week REAL NOT NULL,
            goal_protein_g REAL NOT NULL,
            goal_carbs_pct REAL NOT NULL,
            goal_fat_pct REAL NOT NULL,
            goal_protein_pct REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    print("Database initialized successfully!")

def hash_password(password):
    """Hash password using SHA-256 (simplified, no salt)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, stored_hash):
    """Verify password against stored hash"""
    return hash_password(password) == stored_hash

def create_user(username, password, weight_lbs=None, sex=None, activity_level=None, height_inches=None):
    """Create a new user. Returns True if successful, False if username already exists."""
    # Check if username already exists
    cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
    if cursor.fetchone():
        return False
    
    password_hash = hash_password(password)
    
    cursor.execute('''
        INSERT INTO users (username, password_hash, weight_lbs, sex, activity_level, height_inches)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (username, password_hash, weight_lbs, sex, activity_level, height_inches))
    
    conn.commit()
    return True

def verify_login(username, password):
    """Verify user login credentials"""
    cursor.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    
    if result:
        return verify_password(password, result[0])
    return False

def add_food(name, serving_size_value, serving_size_unit, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving):
    """Add a new food item to the master foods table (per serving)"""
    cursor.execute('''
        INSERT INTO foods (name, serving_size_value, serving_size_unit, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (name, serving_size_value, serving_size_unit, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving))
    
    conn.commit()
    return cursor.lastrowid

def add_meal_entry(user_id, food_name, quantity_servings, meal_type='snack', source='receipt', entry_date=None):
    """Add a meal entry for a user (quantity in servings)"""
    if entry_date is None:
        entry_date = datetime.now().date()
    
    # First, find or create the food item
    cursor.execute('SELECT id FROM foods WHERE name = ?', (food_name,))
    food_result = cursor.fetchone()
    
    if food_result:
        food_id = food_result[0]
    else:
        # Food doesn't exist, we'll need nutrition data to create it
        # For now, return error - this should be handled by the receipt reader
        raise ValueError(f"Food '{food_name}' not found in database. Please add nutrition data first.")
    
    cursor.execute('''
        INSERT INTO meal_entries (user_id, food_id, quantity_servings, meal_type, source, entry_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, food_id, quantity_servings, meal_type, source, entry_date))
    
    conn.commit()
    return cursor.lastrowid

def get_user_daily_nutrition(user_id, date=None):
    """Get total nutrition for a user on a specific date"""
    if date is None:
        date = datetime.now().date()
    
    cursor.execute('''
        SELECT 
            SUM(me.quantity_servings * f.calories_per_serving) as total_calories,
            SUM(me.quantity_servings * f.protein_g_per_serving) as total_protein,
            SUM(me.quantity_servings * f.carbs_g_per_serving) as total_carbs,
            SUM(me.quantity_servings * f.fat_g_per_serving) as total_fat
        FROM meal_entries me
        JOIN foods f ON me.food_id = f.id
        WHERE me.user_id = ? AND me.entry_date = ?
    ''', (user_id, date))
    
    result = cursor.fetchone()
    if result and result[0] is not None:
        return {
            'calories': result[0],
            'protein_g': result[1],
            'carbs_g': result[2],
            'fat_g': result[3]
        }
    return {'calories': 0, 'protein_g': 0, 'carbs_g': 0, 'fat_g': 0}

def close_connection():
    """Close database connection"""
    conn.close()

# Initialize database when module is imported
init_database()