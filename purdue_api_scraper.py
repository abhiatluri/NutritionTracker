import requests
import json
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

class PurdueAPIScraper:
    def __init__(self):
        self.base_url = "https://api.hfs.purdue.edu/menus/v2/locations"
        self.dining_halls = ["Earhart", "Ford", "Hillenbrand", "Wiley", "Windsor"]
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/plain, */*'
        })
    
    def get_date_string(self, date=None):
        """Get date in MM-DD-YYYY format"""
        if date is None:
            date = datetime.now()
        return date.strftime("%m-%d-%Y")
    
    def scrape_dining_hall(self, hall_name, date=None):
        """Scrape a single dining hall's menu for a specific date"""
        date_str = self.get_date_string(date)
        url = f"{self.base_url}/{hall_name}/{date_str}/"
        
        try:
            print(f"🔍 Scraping {hall_name} for {date_str}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract food items with nutrition data
            food_items = {}
            
            if 'Meals' in data:
                for meal in data['Meals']:
                    if 'Stations' in meal:
                        for station in meal['Stations']:
                            if 'Items' in station:
                                for item in station['Items']:
                                    if item.get('NutritionReady', False):
                                        food_name = item['Name']
                                        
                                        # Get nutrition data (we'll need to make another API call)
                                        nutrition_data = self.get_nutrition_data(item['ID'])
                                        
                                        if nutrition_data:
                                            food_items[food_name] = nutrition_data
            
            print(f"  ✅ Found {len(food_items)} food items with nutrition data")
            return {
                'dining_hall': hall_name,
                'date': date_str,
                'food_items': food_items,
                'status': 'success'
            }
            
        except Exception as e:
            print(f"  ❌ Error scraping {hall_name}: {e}")
            return {
                'dining_hall': hall_name,
                'date': date_str,
                'food_items': {},
                'status': 'error',
                'error': str(e)
            }
    
    def get_nutrition_data(self, item_id):
        """Get nutrition data for a specific food item"""
        # The correct nutrition API endpoint
        nutrition_url = f"https://api.hfs.purdue.edu/menus/v2/items/{item_id}"
        
        try:
            response = self.session.get(nutrition_url, timeout=5)
            if response.status_code == 200:
                nutrition_data = response.json()
                
                # Extract the nutrition values we need from the Nutrition array
                calories = 0
                carbs = 0
                protein = 0
                fat = 0
                
                if 'Nutrition' in nutrition_data:
                    for nutrient in nutrition_data['Nutrition']:
                        name = nutrient.get('Name', '')
                        value = nutrient.get('Value', 0)
                        
                        if name == 'Calories':
                            calories = value
                        elif name == 'Total Carbohydrate':
                            carbs = value
                        elif name == 'Protein':
                            protein = value
                        elif name == 'Total fat':
                            fat = value
                
                return [calories, carbs, protein, fat]
        except Exception as e:
            print(f"    Error getting nutrition for {item_id}: {e}")
        
        return None
    
    def scrape_all_dining_halls(self, date=None, max_workers=5):
        """Scrape all dining halls concurrently"""
        print(f"🚀 Starting fast API scrape of {len(self.dining_halls)} dining halls...")
        print(f"Using {max_workers} concurrent workers")
        
        start_time = time.time()
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_hall = {
                executor.submit(self.scrape_dining_hall, hall, date): hall 
                for hall in self.dining_halls
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_hall):
                hall = future_to_hall[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    print(f"❌ {hall} failed: {e}")
                    results.append({
                        'dining_hall': hall,
                        'food_items': {},
                        'status': 'error',
                        'error': str(e)
                    })
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print(f"\n⏱️  Total scraping time: {total_time:.2f} seconds")
        print(f"📊 Average time per dining hall: {total_time/len(self.dining_halls):.2f} seconds")
        
        return results
    
    def create_nutrition_dictionary(self, results):
        """Create the nested dictionary structure as requested"""
        nutrition_dict = {}
        
        for result in results:
            if result['status'] == 'success':
                hall_name = result['dining_hall']
                nutrition_dict[hall_name] = {}
                
                for food_name, nutrition_data in result['food_items'].items():
                    if nutrition_data:  # Only include items with nutrition data
                        nutrition_dict[hall_name][food_name] = nutrition_data
        
        return nutrition_dict
    
    def save_results(self, results, nutrition_dict, filename='purdue_nutrition_data.json'):
        """Save scraping results to JSON file"""
        total_foods = sum(len(result['food_items']) for result in results)
        
        data = {
            'scrape_timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_dining_halls': len(results),
            'total_food_items': total_foods,
            'nutrition_dictionary': nutrition_dict,
            'detailed_results': results
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Saved results to {filename}")
        print(f"📈 Total food items found: {total_foods}")
        
        return data

def main():
    scraper = PurdueAPIScraper()
    
    # Scrape all dining halls for today
    results = scraper.scrape_all_dining_halls()
    
    # Create the nutrition dictionary
    nutrition_dict = scraper.create_nutrition_dictionary(results)
    
    # Save results
    data = scraper.save_results(results, nutrition_dict)
    
    # Print summary
    print("\n📋 NUTRITION DICTIONARY SUMMARY:")
    print("=" * 50)
    
    for hall_name, foods in nutrition_dict.items():
        print(f"\n🏢 {hall_name}:")
        for food_name, nutrition in foods.items():
            calories, carbs, protein, fat = nutrition
            print(f"  🍽️  {food_name}: {calories} cal, {carbs}g carbs, {protein}g protein, {fat}g fat")
    
    print(f"\n🎯 Total: {data['total_food_items']} food items from {data['total_dining_halls']} dining halls")

if __name__ == "__main__":
    main()
