import DB
from datetime import datetime, date

"""
Nutrition calculation functions for TDEE, macros, weight change, and deficiency analysis.
All functions use imperial units (pounds, inches) and return rounded integer values.
"""

def verify_login(username, password):
    """
    Verify user login credentials.
    
    Args:
        username (str): Username to verify
        password (str): Password to verify
        
    Returns:
        bool: True if credentials are valid, False otherwise
    """
    
    # TODO: Implement
    return DB.verify_login(username, password)

def addNutrition(nutrition_list):
    """
    Add nutrition data to the user's daily intake.
    
    Args:
        nutrition_list (list): List of nutrition values in order:
            [calories, protein_g, carbs_g, fat_g]
            
    Returns:
        bool: True if successfully added, False otherwise
    """
    try:
        if len(nutrition_list) != 4:
            return False
        
        calories, protein_g, carbs_g, fat_g = nutrition_list
        
        # Validate that all values are non-negative
        if any(val < 0 for val in nutrition_list):
            return False
        
        # For now, we'll just validate the data structure
        # In a full implementation, this would add to a daily tracking system
        # or database table for the current user's daily intake
        
        return True
        
    except Exception as e:
        print(f"Error adding nutrition data: {e}")
        return False

def getMacros(calories, protein, carbs, fats):
    """
    Calculate macro percentages from absolute values.
    
    Args:
        calories (int): Total calories
        protein (float): Protein in grams
        carbs (float): Carbs in grams  
        fats (float): Fats in grams
        
    Returns:
        list[float]: List of percentages [protein_pct, carbs_pct, fat_pct]
    """
    try:
        if calories <= 0:
            return [0.0, 0.0, 0.0]
        
        # Calculate calories from each macro
        # Protein: 4 calories per gram
        # Carbs: 4 calories per gram  
        # Fat: 9 calories per gram
        protein_calories = protein * 4
        carbs_calories = carbs * 4
        fats_calories = fats * 9
        
        # Calculate percentages
        protein_pct = round((protein_calories / calories) * 100, 1)
        carbs_pct = round((carbs_calories / calories) * 100, 1)
        fat_pct = round((fats_calories / calories) * 100, 1)
        
        return [protein_pct, carbs_pct, fat_pct]
        
    except Exception as e:
        print(f"Error calculating macros: {e}")
        return [0.0, 0.0, 0.0]

def calculateTDEE(weight_lbs, height_inches, age, sex, activity_level):
    """
    Calculate Total Daily Energy Expenditure using Mifflin-St Jeor equation.
    
    Args:
        weight_lbs (float): Weight in pounds
        height_inches (float): Height in inches
        age (int): Age in years
        sex (str): 'male' or 'female'
        activity_level (str): 'sedentary', 'light', 'moderate', 'active', 'very_active'
        
    Returns:
        int: TDEE in calories per day (rounded to nearest integer)
    """
    try:
        # Convert imperial to metric for Mifflin-St Jeor equation
        weight_kg = weight_lbs * 0.453592
        height_cm = height_inches * 2.54
        
        # Mifflin-St Jeor equation for BMR (Basal Metabolic Rate)
        if sex == 'male':
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
        else:  # female
            bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
        
        # Activity multipliers
        activity_multipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very_active': 1.9
        }
        
        multiplier = activity_multipliers.get(activity_level, 1.2)
        tdee = bmr * multiplier
        
        return int(round(tdee))
        
    except Exception as e:
        print(f"Error calculating TDEE: {e}")
        return 2000  # Default fallback

def getWeightChange(tdee, calorie_intake):
    """
    Estimate weight change in pounds per week based on calorie surplus/deficit.
    
    Args:
        tdee (int): Total Daily Energy Expenditure
        calorie_intake (int): Daily calorie intake
        
    Returns:
        float: Weight change in pounds per week (positive = gain, negative = loss)
    """
    try:
        # Calculate daily calorie difference
        daily_difference = calorie_intake - tdee
        
        # Convert to weekly difference
        weekly_difference = daily_difference * 7
        
        # 1 pound of fat = approximately 3500 calories
        # So weight change = weekly calorie difference / 3500
        weight_change = weekly_difference / 3500
        
        return round(weight_change, 2)
        
    except Exception as e:
        print(f"Error calculating weight change: {e}")
        return 0.0

def checkDeficiencies(daily_nutrition, goals):
    """
    Check for nutritional deficiencies and provide recommendations.
    
    Args:
        daily_nutrition (dict): Daily nutrition totals
            {'calories': int, 'protein_g': float, 'carbs_g': float, 'fat_g': float}
        goals (dict): User's nutrition goals
            {'goal_protein_g': float, 'goal_macros_pct': list[float]}
            
    Returns:
        list[str]: List of deficiency warnings/recommendations
    """
    try:
        recommendations = []
        
        # Extract values with defaults
        calories = daily_nutrition.get('calories', 0)
        protein = daily_nutrition.get('protein_g', 0)
        carbs = daily_nutrition.get('carbs_g', 0)
        fat = daily_nutrition.get('fat_g', 0)
        
        goal_protein = goals.get('goal_protein_g', 0)
        goal_macros = goals.get('goal_macros_pct', [0, 0, 0])
        
        # Check protein deficiency
        if goal_protein > 0 and protein < goal_protein * 0.8:  # Less than 80% of goal
            recommendations.append(f"Add more protein to meet your goals! You need {goal_protein - protein:.1f}g more.")
        
        # Check macro distribution
        if calories > 0 and len(goal_macros) >= 3:
            current_macros = getMacros(calories, protein, carbs, fat)
            goal_protein_pct, goal_carbs_pct, goal_fat_pct = goal_macros
            
            # Check if macros are significantly off target (more than 10% difference)
            if abs(current_macros[0] - goal_protein_pct) > 10:
                if current_macros[0] < goal_protein_pct:
                    recommendations.append(f"Your protein intake is {current_macros[0]:.1f}% but your goal is {goal_protein_pct:.1f}%. Consider adding more protein-rich foods.")
                else:
                    recommendations.append(f"Your protein intake is {current_macros[0]:.1f}% but your goal is {goal_protein_pct:.1f}%. Consider reducing protein and increasing other macros.")
            
            if abs(current_macros[1] - goal_carbs_pct) > 10:
                if current_macros[1] < goal_carbs_pct:
                    recommendations.append(f"Your carb intake is {current_macros[1]:.1f}% but your goal is {goal_carbs_pct:.1f}%. Consider adding more complex carbohydrates.")
                else:
                    recommendations.append(f"Your carb intake is {current_macros[1]:.1f}% but your goal is {goal_carbs_pct:.1f}%. Consider reducing carbs and increasing other macros.")
            
            if abs(current_macros[2] - goal_fat_pct) > 10:
                if current_macros[2] < goal_fat_pct:
                    recommendations.append(f"Your fat intake is {current_macros[2]:.1f}% but your goal is {goal_fat_pct:.1f}%. Consider adding healthy fats like nuts, avocado, or olive oil.")
                else:
                    recommendations.append(f"Your fat intake is {current_macros[2]:.1f}% but your goal is {goal_fat_pct:.1f}%. Consider reducing fats and increasing other macros.")
        
        # Check for extremely low calorie intake
        if calories < 1200:
            recommendations.append("Your calorie intake is very low. Consider adding more nutrient-dense foods to meet your body's needs.")
        
        # Check for extremely high calorie intake
        if calories > 4000:
            recommendations.append("Your calorie intake is very high. Consider reducing portion sizes or choosing lower-calorie options.")
        
        # Check for very low fat intake (less than 20g)
        if fat < 20:
            recommendations.append("Your fat intake is very low. Consider adding healthy fats for proper hormone function and nutrient absorption.")
        
        return recommendations
        
    except Exception as e:
        print(f"Error checking deficiencies: {e}")
        return ["Error analyzing nutrition data. Please try again."]

def get_goals(goal_weight_change, goal_protein, goal_macros):
    """
    Set and store user's nutrition goals.
    
    Args:
        goal_weight_change (float): Target weight change in lbs per week
        goal_protein (float): Target protein in grams per day
        goal_macros (list[float]): Target macro percentages [protein_pct, carbs_pct, fat_pct]
        
    Returns:
        bool: True if goals set successfully, False otherwise
    """
    try:
        # Validate input parameters
        if not isinstance(goal_macros, list) or len(goal_macros) != 3:
            return False
        
        # Validate macro percentages add up to approximately 100%
        total_macros = sum(goal_macros)
        if abs(total_macros - 100) > 5:  # Allow 5% tolerance
            return False
        
        # Validate individual macro percentages are reasonable (10-60% range)
        for macro in goal_macros:
            if macro < 10 or macro > 60:
                return False
        
        # Validate weight change goal is reasonable (-2 to +2 lbs per week)
        if goal_weight_change < -2 or goal_weight_change > 2:
            return False
        
        # Validate protein goal is reasonable (50-300g per day)
        if goal_protein < 50 or goal_protein > 300:
            return False
        
        # In a full implementation, this would store the goals in the database
        # For now, we'll just validate the data structure
        
        return True
        
    except Exception as e:
        print(f"Error setting goals: {e}")
        return False

# Example usage and testing:
if __name__ == "__main__":
    print("🧮 Nutrition Calculations Module - Ready for Testing!")
    print("=" * 60)
    
    # Test macro calculations
    print("\n🔍 Testing macro calculations...")
    try:
        macros = getMacros(2000, 150, 200, 80)
        print(f"✅ Macros for 2000 cal, 150g protein, 200g carbs, 80g fat:")
        print(f"   Protein: {macros[0]}%, Carbs: {macros[1]}%, Fat: {macros[2]}%")
    except Exception as e:
        print(f"❌ Error testing macros: {e}")
    
    # Test TDEE calculation
    print("\n🔍 Testing TDEE calculation...")
    try:
        tdee = calculateTDEE(150, 70, 25, "male", "moderate")
        print(f"✅ TDEE for 150 lbs, 70 inches, 25yo male, moderate activity: {tdee} calories")
    except Exception as e:
        print(f"❌ Error testing TDEE: {e}")
    
    # Test weight change calculation
    print("\n🔍 Testing weight change calculation...")
    try:
        weight_change = getWeightChange(2200, 2000)
        print(f"✅ Weight change for 2200 TDEE, 2000 intake: {weight_change} lbs/week")
    except Exception as e:
        print(f"❌ Error testing weight change: {e}")
    
    # Test deficiency checking
    print("\n🔍 Testing deficiency checking...")
    try:
        daily_nutrition = {'calories': 1800, 'protein_g': 100, 'carbs_g': 200, 'fat_g': 60}
        goals = {'goal_protein_g': 120, 'goal_macros_pct': [25, 50, 25]}
        deficiencies = checkDeficiencies(daily_nutrition, goals)
        print(f"✅ Deficiency analysis:")
        for rec in deficiencies:
            print(f"   • {rec}")
    except Exception as e:
        print(f"❌ Error testing deficiencies: {e}")
    
    # Test goal validation
    print("\n🔍 Testing goal validation...")
    try:
        valid_goals = get_goals(-1.0, 120, [25, 50, 25])
        invalid_goals = get_goals(-5.0, 50, [10, 10, 10])
        print(f"✅ Valid goals (-1.0 lbs/week, 120g protein, 25/50/25%): {valid_goals}")
        print(f"✅ Invalid goals (-5.0 lbs/week, 50g protein, 10/10/10%): {invalid_goals}")
    except Exception as e:
        print(f"❌ Error testing goals: {e}")
    
    print("\n📋 Available functions:")
    print("  • verify_login(username, password)")
    print("  • addNutrition(nutrition_list)")
    print("  • getMacros(calories, protein, carbs, fats)")
    print("  • calculateTDEE(weight_lbs, height_inches, age, gender, activity_level)")
    print("  • getWeightChange(tdee, calorie_intake)")
    print("  • checkDeficiencies(daily_nutrition, goals)")
    print("  • get_goals(goal_weight_change, goal_protein, goal_macros)")
