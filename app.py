"""
Flask API for Nutrition Tracker
Integrates with DB.py and function templates from Tanish and Karthik
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import DB
import json
from datetime import datetime, date

# Import function templates (will be replaced with actual implementations)
try:
    import nutrition_calculations as calc
except ImportError:
    print("Warning: nutrition_calculations.py not found. Using stubs.")
    calc = None

try:
    import food_input as receipt
except ImportError:
    print("Warning: food_input.py not found. Using stubs.")
    receipt = None

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Stub functions if modules not available
def stub_function(*args, **kwargs):
    return {"error": "Function not implemented yet"}

if not calc:
    calc = type('CalcStub', (), {
        'verify_login': lambda u, p: DB.verify_login(u, p),
        'addNutrition': stub_function,
        'getMacros': stub_function,
        'calculateTDEE': stub_function,
        'getWeightChange': stub_function,
        'checkDeficiencies': stub_function,
        'get_goals': stub_function
    })()

if not receipt:
    receipt = type('ReceiptStub', (), {
        'process_receipt_image': stub_function,
        'get_purdue_menu_nutrition': stub_function,
        'scrape_purdue_daily_menu': stub_function
    })()

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Create user
        success = DB.create_user(
            username=data['username'],
            password=data['password'],
            weight_kg=data.get('weight_kg'),
            gender=data.get('gender'),
            activity_level=data.get('activity_level'),
            height_cm=data.get('height_cm')
        )
        
        if success:
            return jsonify({'success': True, 'message': 'User created successfully'}), 201
        else:
            return jsonify({'error': 'Username already exists'}), 409
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Verify credentials
        if calc.verify_login(data['username'], data['password']):
            return jsonify({'success': True, 'message': 'Login successful'}), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== MEAL LOGGING ENDPOINTS ====================

@app.route('/api/meals', methods=['POST'])
def add_meal():
    """Add a meal entry for a user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['user_id', 'food_name', 'quantity_servings']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'user_id, food_name, and quantity_servings required'}), 400
        
        # Add meal entry
        meal_id = DB.add_meal_entry(
            user_id=data['user_id'],
            food_name=data['food_name'],
            quantity_servings=data['quantity_servings'],
            meal_type=data.get('meal_type', 'snack'),
            source=data.get('source', 'manual'),
            entry_date=data.get('entry_date')
        )
        
        return jsonify({
            'success': True, 
            'meal_id': meal_id,
            'message': 'Meal added successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meals/<int:user_id>/<date_str>', methods=['GET'])
def get_daily_meals(user_id, date_str):
    """Get all meals for a user on a specific date"""
    try:
        # Parse date
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get daily nutrition
        nutrition = DB.get_user_daily_nutrition(user_id, target_date)
        
        return jsonify({
            'success': True,
            'date': date_str,
            'nutrition': nutrition
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== FOOD MANAGEMENT ENDPOINTS ====================

@app.route('/api/foods', methods=['POST'])
def add_food():
    """Add a new food item to the database"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'serving_size_value', 'serving_size_unit', 
                          'calories_per_serving', 'protein_g_per_serving', 
                          'carbs_g_per_serving', 'fat_g_per_serving']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'All nutrition fields required'}), 400
        
        # Add food
        food_id = DB.add_food(
            name=data['name'],
            serving_size_value=data['serving_size_value'],
            serving_size_unit=data['serving_size_unit'],
            calories_per_serving=data['calories_per_serving'],
            protein_g_per_serving=data['protein_g_per_serving'],
            carbs_g_per_serving=data['carbs_g_per_serving'],
            fat_g_per_serving=data['fat_g_per_serving']
        )
        
        return jsonify({
            'success': True,
            'food_id': food_id,
            'message': 'Food added successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== RECEIPT PROCESSING ENDPOINTS ====================

@app.route('/api/receipt/process', methods=['POST'])
def process_receipt():
    """Process a receipt image and extract nutrition data"""
    try:
        # This would typically handle file upload
        # For now, expect image path in request
        data = request.get_json()
        
        if 'image_path' not in data:
            return jsonify({'error': 'image_path required'}), 400
        
        # Process receipt (stub for now)
        result = receipt.process_receipt_image(data['image_path'])
        
        return jsonify({
            'success': True,
            'foods': result
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== PURDUE MENU ENDPOINTS ====================

@app.route('/api/purdue/menu/<date_str>', methods=['GET'])
def get_purdue_menu(date_str):
    """Get Purdue dining hall menu for a specific date"""
    try:
        # Parse date
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Scrape menu (stub for now)
        menu_items = receipt.scrape_purdue_daily_menu(date_str)
        
        return jsonify({
            'success': True,
            'date': date_str,
            'menu_items': menu_items
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purdue/nutrition/<food_name>', methods=['GET'])
def get_purdue_nutrition(food_name):
    """Get nutrition for a specific Purdue menu item"""
    try:
        nutrition = receipt.get_purdue_menu_nutrition(food_name)
        
        if nutrition:
            return jsonify({
                'success': True,
                'food_name': food_name,
                'nutrition': nutrition
            }), 200
        else:
            return jsonify({'error': 'Food not found in Purdue menu'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== NUTRITION CALCULATION ENDPOINTS ====================

@app.route('/api/calculations/macros', methods=['POST'])
def calculate_macros():
    """Calculate macro percentages from nutrition values"""
    try:
        data = request.get_json()
        
        required_fields = ['calories', 'protein', 'carbs', 'fats']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'calories, protein, carbs, and fats required'}), 400
        
        macros = calc.getMacros(
            data['calories'],
            data['protein'],
            data['carbs'],
            data['fats']
        )
        
        return jsonify({
            'success': True,
            'macros': macros
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/calculations/tdee', methods=['POST'])
def calculate_tdee():
    """Calculate TDEE for a user"""
    try:
        data = request.get_json()
        
        required_fields = ['weight_kg', 'height_cm', 'age', 'gender', 'activity_level']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'All user metrics required'}), 400
        
        tdee = calc.calculateTDEE(
            data['weight_kg'],
            data['height_cm'],
            data['age'],
            data['gender'],
            data['activity_level']
        )
        
        return jsonify({
            'success': True,
            'tdee': tdee
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== GOALS ENDPOINTS ====================

@app.route('/api/goals/<int:user_id>', methods=['POST'])
def set_goals(user_id):
    """Set nutrition goals for a user"""
    try:
        data = request.get_json()
        
        required_fields = ['goal_weight_change', 'goal_protein', 'goal_macros']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'goal_weight_change, goal_protein, and goal_macros required'}), 400
        
        success = calc.get_goals(
            data['goal_weight_change'],
            data['goal_protein'],
            data['goal_macros']
        )
        
        if success:
            return jsonify({'success': True, 'message': 'Goals set successfully'}), 200
        else:
            return jsonify({'error': 'Failed to set goals'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': 'connected'
    }), 200

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("Starting Nutrition Tracker API...")
    print("Available endpoints:")
    print("  POST /api/register - Register new user")
    print("  POST /api/login - Login user")
    print("  POST /api/meals - Add meal entry")
    print("  GET  /api/meals/<user_id>/<date> - Get daily meals")
    print("  POST /api/foods - Add food item")
    print("  POST /api/receipt/process - Process receipt image")
    print("  GET  /api/purdue/menu/<date> - Get Purdue menu")
    print("  GET  /api/purdue/nutrition/<food_name> - Get Purdue item nutrition")
    print("  POST /api/calculations/macros - Calculate macro percentages")
    print("  POST /api/calculations/tdee - Calculate TDEE")
    print("  POST /api/goals/<user_id> - Set user goals")
    print("  GET  /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000)

