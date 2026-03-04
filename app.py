"""
Flask API for Nutrition Tracker
Integrates with DB.py and function templates from Tanish and Karthik
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import DB
import json
import os
from datetime import datetime, date
import chatbot

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
            weight_lbs=data.get('weight_lbs'),
            sex=data.get('sex'),
            activity_level=data.get('activity_level'),
            height_inches=data.get('height_inches')
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
        
        # Get individual meal entries
        meals = DB.get_user_daily_meals(user_id, target_date)
        
        # Get total nutrition
        nutrition = DB.get_user_daily_nutrition(user_id, target_date)
        
        return jsonify({
            'success': True,
            'date': date_str,
            'meals': meals,
            'nutrition': nutrition
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meals/<int:meal_id>', methods=['PATCH'])
def update_meal(meal_id):
    """Update a meal entry (meal_type and/or quantity_servings)"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        meal_type = data.get('meal_type')
        quantity_servings = data.get('quantity_servings')
        
        if meal_type is None and quantity_servings is None:
            return jsonify({'error': 'Must provide meal_type or quantity_servings to update'}), 400
        
        success = DB.update_meal_entry(meal_id, meal_type=meal_type, quantity_servings=quantity_servings)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Meal updated successfully'
            }), 200
        else:
            return jsonify({'error': 'Meal not found or no changes made'}), 404
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/meals/<int:meal_id>', methods=['DELETE'])
def delete_meal(meal_id):
    """Delete a meal entry"""
    try:
        success = DB.delete_meal_entry(meal_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Meal deleted successfully'
            }), 200
        else:
            return jsonify({'error': 'Meal not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== FOOD MANAGEMENT ENDPOINTS ====================

@app.route('/api/foods', methods=['POST'])
def add_food():
    """Add a new food item to the database (or return existing food ID if duplicate)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'serving_size_value', 'serving_size_unit', 
                          'calories_per_serving', 'protein_g_per_serving', 
                          'carbs_g_per_serving', 'fat_g_per_serving']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'All nutrition fields required'}), 400
        
        # Add food (will return existing ID if food already exists)
        food_id = DB.add_food(
            name=data['name'],
            serving_size_value=data['serving_size_value'],
            serving_size_unit=data['serving_size_unit'],
            calories_per_serving=data['calories_per_serving'],
            protein_g_per_serving=data['protein_g_per_serving'],
            carbs_g_per_serving=data['carbs_g_per_serving'],
            fat_g_per_serving=data['fat_g_per_serving']
        )
        
        if food_id:
            return jsonify({
                'success': True,
                'food_id': food_id,
                'message': 'Food added successfully'
            }), 201
        else:
            return jsonify({'error': 'Failed to add food'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== RECEIPT PROCESSING ENDPOINTS ====================

@app.route('/api/receipt/process', methods=['POST'])
def process_receipt():
    """Process a receipt image upload and extract nutrition data"""
    try:
        # Support both multipart form-data file uploads and JSON { image_path }
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400

            # Save to a temp file
            import os, uuid
            tmp_dir = 'uploads'
            os.makedirs(tmp_dir, exist_ok=True)
            tmp_path = os.path.join(tmp_dir, f"receipt_{uuid.uuid4().hex}.jpg")
            file.save(tmp_path)
            image_path = tmp_path
        else:
            data = request.get_json(silent=True) or {}
            image_path = data.get('image_path')
            if not image_path:
                return jsonify({'error': 'Upload a file via form-data with key "file" or provide image_path in JSON'}), 400

        result = receipt.process_receipt_image(image_path)

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

@app.route('/api/purdue/dining-halls', methods=['GET'])
def get_dining_halls():
    """Get list of all available dining halls"""
    try:
        json_path = 'purdue_nutrition_data.json'
        if not os.path.exists(json_path):
            return jsonify({'error': 'Nutrition data file not found'}), 404
        
        with open(json_path, 'r') as f:
            data = json.load(f)
        
        dining_halls = list(data.get('nutrition_dictionary', {}).keys())
        
        return jsonify({
            'success': True,
            'dining_halls': dining_halls
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/purdue/dining-hall/<hall_name>/foods', methods=['GET'])
def get_dining_hall_foods(hall_name):
    """Get all foods available at a specific dining hall with meal type information"""
    try:
        # Load nutrition data from static JSON (fast)
        json_path = 'purdue_nutrition_data.json'
        if not os.path.exists(json_path):
            return jsonify({'error': 'Nutrition data file not found'}), 404
        
        with open(json_path, 'r') as f:
            static_data = json.load(f)
        
        nutrition_dict = static_data.get('nutrition_dictionary', {})
        if hall_name not in nutrition_dict:
            return jsonify({'error': f'Dining hall "{hall_name}" not found'}), 404
        
        # Build food list with nutrition from static JSON
        foods_dict = {}
        for food_name, nutrition_array in nutrition_dict[hall_name].items():
            # nutrition_array format: [calories, carbs, protein, fat]
            foods_dict[food_name] = {
                'name': food_name,
                'calories_per_serving': int(round(nutrition_array[0] if len(nutrition_array) > 0 else 0)),
                'carbs_g_per_serving': int(round(nutrition_array[1] if len(nutrition_array) > 1 else 0)),
                'protein_g_per_serving': int(round(nutrition_array[2] if len(nutrition_array) > 2 else 0)),
                'fat_g_per_serving': int(round(nutrition_array[3] if len(nutrition_array) > 3 else 0)),
                'serving_size_value': 1.0,
                'serving_size_unit': 'serving',
                'meal_type': 'snack'  # Default, will be updated if API call succeeds
            }
        
        # Try to get meal types from live API (one call, fast)
        try:
            import requests
            from datetime import date
            today = date.today()
            # Purdue API expects MM-DD-YYYY format
            date_str = today.strftime("%m-%d-%Y")
            base = "https://api.hfs.purdue.edu/menus/v2/locations"
            menu_url = f"{base}/{hall_name}/{date_str}"
            response = requests.get(menu_url, timeout=5)
            
            if response.status_code == 200:
                api_data = response.json()
                # Create a mapping of food names to meal types
                meal_type_map = {}
                
                for meal in api_data.get("Meals", []):
                    meal_name = meal.get("Name", "").lower()
                    # Map meal names to our meal types
                    meal_type = "snack"  # default
                    if "breakfast" in meal_name:
                        meal_type = "breakfast"
                    elif "lunch" in meal_name:
                        meal_type = "lunch"
                    elif "dinner" in meal_name:
                        meal_type = "dinner"
                    
                    for station in meal.get("Stations", []):
                        for item in station.get("Items", []):
                            food_name = item["Name"]
                            meal_type_map[food_name] = meal_type
                
                # Update meal types for foods that were found in API
                for food_name, meal_type in meal_type_map.items():
                    if food_name in foods_dict:
                        foods_dict[food_name]['meal_type'] = meal_type
        except:
            # If API call fails, just use default 'snack' - not a big deal
            pass
        
        # Convert dict to list
        foods = list(foods_dict.values())
        
        return jsonify({
            'success': True,
            'dining_hall': hall_name,
            'foods': foods
        }), 200
        
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
        
        required_fields = ['weight_lbs', 'height_inches', 'age', 'sex', 'activity_level']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'All user metrics required'}), 400
        
        tdee = calc.calculateTDEE(
            data['weight_lbs'],
            data['height_inches'],
            data['age'],
            data['sex'],
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


# ==================== CHATBOT ENDPOINT ====================

@app.route('/api/chatbot', methods=['POST'])
def chat_with_bot():
    """
    Conversational nutrition assistant endpoint.

    Delegates to chatbot.answer_question, which can be implemented using
    a RAG pipeline over the user's meal history.
    """
    try:
        data = request.get_json() or {}
        user_id = data.get('user_id')
        question = (data.get('question') or '').strip()

        if not user_id or not question:
            return jsonify({'error': 'user_id and question required'}), 400

        result = chatbot.answer_question(user_id=user_id, question=question) or {}
        answer = result.get('answer', '')
        sources = result.get('sources', [])

        return jsonify({
            'success': True,
            'answer': answer,
            'sources': sources
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

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
    print("  GET  /api/purdue/dining-halls - Get list of dining halls")
    print("  GET  /api/purdue/dining-hall/<hall_name>/foods - Get foods for a dining hall")
    print("  POST /api/calculations/macros - Calculate macro percentages")
    print("  POST /api/calculations/tdee - Calculate TDEE")
    print("  POST /api/goals/<user_id> - Set user goals")
    print("  POST /api/chatbot - Chat with nutrition assistant")
    print("  GET  /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5001)

