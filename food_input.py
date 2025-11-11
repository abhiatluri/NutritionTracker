"""
Template for Karthik's receipt processing and nutrition scraping functions.
Implement these functions with the exact signatures shown below.
Let me know if you have any questions or add any other methods.
DELETE THIS COMMENT AFTER IMPLEMENTING THE FUNCTIONS.
"""

import cv2
import pytesseract
import re
from bs4 import BeautifulSoup
import requests
from datetime import date as dt
from collections import defaultdict

def extract_text_from_receipt(image_path):
    """
    Extract text from a receipt image using OCR.
    
    Args:
        image_path (str): Path to the receipt image file
        
    Returns:
        str: Extracted text from the receipt, or None if extraction fails
    """

    try:
        img = cv2.imread(image_path)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.medianBlur(gray, 3)
        
        text = pytesseract.image_to_string(gray)
        return text.strip()
    except Exception as e:
        print(f"OCR error: {e}")
        return None
    
    # TODO: Implement OCR text extraction
    # Use OpenCV, Tesseract, or other OCR library
    pass

def parse_receipt_items(receipt_text):
    """
    Parse receipt text to extract food items and quantities.
    
    Args:
        receipt_text (str): Raw text extracted from receipt
        
    Returns:
        list[dict]: List of food items with quantities
            [{'name': 'apple', 'quantity': 2, 'unit': 'each'}, ...]
    """

    items = []
    lines = receipt_text.splitlines()
    for line in lines:
        match = re.match(r"([A-Za-z ]+)\s+([\d\.]+)", line)
        if match:
            name = match.group(1).strip().lower()
            quantity = float(match.group(2))
            items.append({"name": name, "quantity": quantity, "unit": "each"})
    return items
    # TODO: Implement text parsing to identify food items
    # Handle different receipt formats and extract item names/quantities

def get_nutrition_from_web(food_name):
    """
    Scrape nutrition information for a food item from a nutrition database website.
    
    Args:
        food_name (str): Name of the food item
        
    Returns:
        dict: Nutrition information per serving
            {
                'serving_size_value': 1.0,
                'serving_size_unit': 'apple',
                'calories_per_serving': 80,
                'protein_g_per_serving': 0.3,
                'carbs_g_per_serving': 21.0,
                'fat_g_per_serving': 0.2
            }
            Returns None if nutrition not found
    """

    query = food_name.replace(" ", "+")
    url = f"https://www.nutritionvalue.org/search.php?food_query={query}"

    res = requests.get(url)
    if res.status_code != 200:
        return None
    
    soup = BeautifulSoup(res.text, "html.parser")
    first_link = soup.select_one("a[href*='/foods/']")
    if not first_link:
        return None

    food_url = "https://www.nutritionvalue.org" + first_link["href"]
    page = requests.get(food_url)
    soup = BeautifulSoup(page.text, "html.parser")

    def safe_get(label):
        cell = soup.find("td", string=lambda s: s and label in s)
        if cell and cell.find_next_sibling("td"):
            return float(cell.find_next_sibling("td").text.split()[0])
        return 0.0

    return {
        "serving_size_value": 1.0,
        "serving_size_unit": food_name,
        "calories_per_serving": safe_get("Calories"),
        "protein_g_per_serving": safe_get("Protein"),
        "carbs_g_per_serving": safe_get("Carbohydrate"),
        "fat_g_per_serving": safe_get("Total Fat")
    }
    
    # TODO: Implement web scraping from nutrition database
    # Use BeautifulSoup to scrape from USDA, MyFitnessPal, or similar site

def process_receipt_image(image_path):
    """
    Complete pipeline: extract text, parse items, get nutrition for each item.
    
    Args:
        image_path (str): Path to the receipt image file
        
    Returns:
        list[dict]: Complete nutrition data for all items found
            [
                {
                    'name': 'apple',
                    'quantity': 2,
                    'unit': 'each',
                    'serving_size_value': 1.0,
                    'serving_size_unit': 'apple',
                    'calories_per_serving': 80,
                    'protein_g_per_serving': 0.3,
                    'carbs_g_per_serving': 21.0,
                    'fat_g_per_serving': 0.2
                },
                ...
            ]
            Returns empty list if processing fails
    """

    text = extract_text_from_receipt(image_path)
    if not text:
        return []
    
    items = parse_receipt_items(text)
    if not items:
        return []

    results = []
    for item in items:
        nutrition = get_nutrition_from_web(item["name"])
        if nutrition:
            results.append({**item, **nutrition})
    
    return results
    # TODO: Implement complete pipeline
    # 1. Extract text from image
    # 2. Parse food items from text
    # 3. Get nutrition for each item
    # 4. Return combined data
    pass

def get_purdue_menu_nutrition(menu_item_name):
    """
    Get nutrition information for a Purdue dining hall menu item.
    
    Args:
        menu_item_name (str): Name of the menu item from Purdue dining
        
    Returns:
        dict: Nutrition information per serving (same format as get_nutrition_from_web)
            Returns None if item not found
    """

    base = "https://api.hfs.purdue.edu/menus/v2/items/"
    item_name = menu_item_name.replace(" ", "%20")
    url = base + item_name

    res = requests.get(url)
    if res.status_code != 200:
        return None

    data = res.json()
    return {
        "serving_size_value": 1.0,
        "serving_size_unit": "serving",
        "calories_per_serving": data.get("Calories", 0),
        "protein_g_per_serving": data.get("Protein", 0),
        "carbs_g_per_serving": data.get("Carbohydrates", 0),
        "fat_g_per_serving": data.get("TotalFat", 0)
    }
    # TODO: Implement Purdue dining hall menu scraping
    # Scrape from Purdue's dining website for specific menu items

def scrape_purdue_daily_menu(date=None):
    """
    Scrape the daily menu from Purdue dining halls.
    
    Args:
        date (str, optional): Date in YYYY-MM-DD format. If None, use today.
        
    Returns:
        list[dict]: List of available menu items with nutrition
            [
                {
                    'name': 'Grilled Chicken Breast',
                    'serving_size_value': 1.0,
                    'serving_size_unit': 'serving',
                    'calories_per_serving': 200,
                    'protein_g_per_serving': 30.0,
                    'carbs_g_per_serving': 0.0,
                    'fat_g_per_serving': 8.0
                },
                ...
            ]
    """

    if date is None:
        date = dt.today().isoformat()

    base = "https://api.hfs.purdue.edu/menus/v2/locations"
    halls = requests.get(base).json()["Location"]

    all_items = []

    for hall in halls:
        loc = hall["Location"]
        menu_url = f"https://api.hfs.purdue.edu/menus/v2/locations/{loc}/{date}"
        data = requests.get(menu_url).json()

        for meal in data.get("Meals", []):
            for station in meal.get("Stations", []):
                for item in station.get("Items", []):
                    name = item["Name"]
                    all_items.append({
                        "name": name,
                        **(get_purdue_menu_nutrition(name) or {})
                    })
    return all_items
    # TODO: Implement Purdue menu scraping
    # Scrape daily menu and get nutrition for all available items

# Example usage and expected return values:
if __name__ == "__main__":
    # Test function signatures
    print("Function signatures defined. Implement the TODO sections.")
    
    # Example expected returns (use as test cases):
    # extract_text_from_receipt("receipt.jpg") -> "STORE NAME\nApple 2.00\nOrange 1.50\n..."
    # parse_receipt_items("Apple 2.00\nOrange 1.50") -> [{'name': 'apple', 'quantity': 2, 'unit': 'each'}, {'name': 'orange', 'quantity': 1, 'unit': 'each'}]
    # get_nutrition_from_web("apple") -> {'serving_size_value': 1.0, 'serving_size_unit': 'apple', 'calories_per_serving': 80, 'protein_g_per_serving': 0.3, 'carbs_g_per_serving': 21.0, 'fat_g_per_serving': 0.2}
    # process_receipt_image("receipt.jpg") -> [{'name': 'apple', 'quantity': 2, 'unit': 'each', 'serving_size_value': 1.0, 'serving_size_unit': 'apple', 'calories_per_serving': 80, 'protein_g_per_serving': 0.3, 'carbs_g_per_serving': 21.0, 'fat_g_per_serving': 0.2}]
    # get_purdue_menu_nutrition("Grilled Chicken") -> {'serving_size_value': 1.0, 'serving_size_unit': 'serving', 'calories_per_serving': 200, 'protein_g_per_serving': 30.0, 'carbs_g_per_serving': 0.0, 'fat_g_per_serving': 8.0}
    # scrape_purdue_daily_menu("2024-01-15") -> [list of menu items with nutrition]
