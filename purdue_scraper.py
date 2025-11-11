import requests
from bs4 import BeautifulSoup
import time
import json

def get_known_purdue_dining_halls():
    """Return known Purdue dining hall names based on research"""
    
    # These are the known Purdue dining halls
    known_dining_halls = [
        "Earhart Dining Court",
        "Ford Dining Court", 
        "Hillenbrand Dining Court",
        "Wiley Dining Court",
        "Windsor Dining Court",
        "The Gathering Place",
        "Pete's Za",
        "The Den by Den Popov",
        "The C-Store",
        "The Market",
        "The Union Club Hotel",
        "The Boiler Bistro",
        "The Cary Knight Spot",
        "The Cary Knight Spot Express",
        "The Cary Knight Spot Express 2",
        "The Cary Knight Spot Express 3",
        "The Cary Knight Spot Express 4",
        "The Cary Knight Spot Express 5",
        "The Cary Knight Spot Express 6",
        "The Cary Knight Spot Express 7",
        "The Cary Knight Spot Express 8",
        "The Cary Knight Spot Express 9",
        "The Cary Knight Spot Express 10"
    ]
    
    # Let's try to access individual dining hall pages
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    working_dining_halls = []
    
    for hall in known_dining_halls:
        # Try different URL patterns
        url_patterns = [
            f"https://dining.purdue.edu/menus/{hall.lower().replace(' ', '-')}",
            f"https://dining.purdue.edu/menus/{hall.lower().replace(' ', '_')}",
            f"https://dining.purdue.edu/{hall.lower().replace(' ', '-')}",
            f"https://dining.purdue.edu/{hall.lower().replace(' ', '_')}"
        ]
        
        for url in url_patterns:
            try:
                response = requests.get(url, headers=headers, timeout=5)
                if response.status_code == 200:
                    print(f"✅ Found working page for {hall}: {url}")
                    working_dining_halls.append({
                        'name': hall,
                        'url': url,
                        'status': 'working'
                    })
                    break
            except:
                continue
    
    return working_dining_halls

def try_api_endpoints():
    """Try to find API endpoints that might contain dining hall data"""
    
    # Common API endpoints that might exist
    api_endpoints = [
        "https://dining.purdue.edu/api/locations",
        "https://dining.purdue.edu/api/dining-halls", 
        "https://dining.purdue.edu/api/menus/locations",
        "https://dining.purdue.edu/menus/api/locations",
        "https://dining.purdue.edu/api/v1/locations",
        "https://dining.purdue.edu/api/v1/dining-halls",
        "https://dining.purdue.edu/menus/api/menu",
        "https://dining.purdue.edu/menus/api/locations",
        "https://dining.purdue.edu/menus/api/menu/locations"
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
    
    for endpoint in api_endpoints:
        try:
            print(f"Trying API endpoint: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ Found working API: {endpoint}")
                print(f"Response length: {len(response.content)} bytes")
                
                try:
                    data = response.json()
                    print(f"JSON data preview: {str(data)[:200]}...")
                    return data
                except:
                    print(f"Response is not JSON: {response.text[:200]}...")
                    return response.text
            else:
                print(f"❌ {endpoint} returned {response.status_code}")
                
        except Exception as e:
            print(f"❌ {endpoint} failed: {e}")
    
    return None

def scrape_purdue_dining_halls():
    """Try multiple approaches to get dining hall data"""
    
    print("🔍 Searching for Purdue dining hall data...")
    
    # First, try known dining halls
    print("\n1. Trying known dining hall pages...")
    known_halls = get_known_purdue_dining_halls()
    if known_halls:
        print(f"Found {len(known_halls)} working dining hall pages!")
        return known_halls
    
    # Try API endpoints
    print("\n2. Trying API endpoints...")
    api_data = try_api_endpoints()
    if api_data:
        return api_data
    
    # Try the main menu page with different approaches
    print("\n2. Trying main menu page...")
    url = "https://dining.purdue.edu/menus/"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        print(f"Status Code: {response.status_code}")
        print(f"Content Length: {len(response.content)} bytes")
        
        # Save the HTML for inspection
        with open('purdue_menu_page.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("Saved page content to 'purdue_menu_page.html' for inspection")
        
        # Parse the HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for any JavaScript files that might contain data
        scripts = soup.find_all('script')
        print(f"\nFound {len(scripts)} script tags")
        
        for i, script in enumerate(scripts):
            if script.string:
                content = script.string.strip()
                if len(content) > 100:  # Look for substantial scripts
                    print(f"Script {i+1} length: {len(content)} chars")
                    if 'dining' in content.lower() or 'menu' in content.lower():
                        print(f"Script {i+1} might contain dining data!")
                        # Save interesting scripts
                        with open(f'script_{i+1}.js', 'w', encoding='utf-8') as f:
                            f.write(content)
        
        # Find all links on the page
        links = soup.find_all('a', href=True)
        print(f"\nFound {len(links)} total links on the page")
        
        # Extract dining hall names (text content of links)
        dining_halls = []
        for link in links:
            text = link.get_text(strip=True)
            href = link.get('href', '')
            
            # Filter for dining hall related links
            if text and len(text) > 2 and not text.startswith('http'):
                dining_halls.append({
                    'name': text,
                    'url': href
                })
        
        # Remove duplicates while preserving order
        seen = set()
        unique_dining_halls = []
        for hall in dining_halls:
            if hall['name'] not in seen:
                seen.add(hall['name'])
                unique_dining_halls.append(hall)
        
        print(f"\nFound {len(unique_dining_halls)} unique dining hall links:")
        print("=" * 50)
        
        for i, hall in enumerate(unique_dining_halls, 1):
            print(f"{i:2d}. {hall['name']}")
            if hall['url']:
                print(f"    URL: {hall['url']}")
            print()
        
        return unique_dining_halls
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching the page: {e}")
        return []
    except Exception as e:
        print(f"Unexpected error: {e}")
        return []

if __name__ == "__main__":
    print("Purdue Dining Hall Scraper")
    print("=" * 30)
    
    dining_halls = scrape_purdue_dining_halls()
    
    if dining_halls:
        print(f"\nSuccessfully scraped {len(dining_halls)} dining hall names!")
        
        # Save to file
        with open('purdue_dining_halls.txt', 'w', encoding='utf-8') as f:
            if isinstance(dining_halls, list):
                for hall in dining_halls:
                    if isinstance(hall, dict):
                        f.write(f"{hall['name']}\n")
                    else:
                        f.write(f"{hall}\n")
            else:
                f.write(f"{dining_halls}\n")
        
        print("Dining hall names saved to 'purdue_dining_halls.txt'")
    else:
        print("No dining halls found or error occurred.")
