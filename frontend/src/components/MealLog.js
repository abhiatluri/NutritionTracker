import React, { useState, useEffect } from 'react';
import { Plus, Search, Camera, Utensils } from 'lucide-react';
import axios from 'axios';

const MealLog = ({ user }) => {
  const [meals, setMeals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Receipt upload & parsed foods
  const [receiptFile, setReceiptFile] = useState(null);
  const [parsedFoods, setParsedFoods] = useState([]);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Purdue search quick lookup
  const [purdueQuery, setPurdueQuery] = useState('');
  const [purdueResult, setPurdueResult] = useState(null);

  const [newMeal, setNewMeal] = useState({
    food_name: '',
    quantity_servings: 1,
    meal_type: 'snack',
    source: 'manual'
  });

  useEffect(() => {
    fetchMeals();
  }, [date]);

  const fetchMeals = async () => {
    try {
      const response = await axios.get(`/meals/${user.id}/${date}`);
      if (response.data.success) {
        // For demo purposes, we'll create mock meal data
        // In a real app, this would come from the API
        setMeals([
          {
            id: 1,
            food_name: 'Apple',
            quantity_servings: 1,
            meal_type: 'snack',
            source: 'manual',
            calories: 80,
            protein_g: 0.3,
            carbs_g: 21,
            fat_g: 0.2
          },
          {
            id: 2,
            food_name: 'Grilled Chicken Breast',
            quantity_servings: 1,
            meal_type: 'lunch',
            source: 'purdue_menu',
            calories: 200,
            protein_g: 30,
            carbs_g: 0,
            fat_g: 8
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('/meals', {
        user_id: user.id,
        ...newMeal
      });
      
      if (response.data.success) {
        setMeals([...meals, { id: response.data.meal_id, ...newMeal }]);
        setNewMeal({
          food_name: '',
          quantity_servings: 1,
          meal_type: 'snack',
          source: 'manual'
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleReceiptUpload = async () => {
    if (!receiptFile) return;
    setUploadingReceipt(true);
    try {
      const form = new FormData();
      form.append('file', receiptFile);
      const resp = await axios.post('/receipt/process', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (resp.data.success) {
        setParsedFoods(resp.data.foods || []);
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const addParsedFoodAsMeal = async (food) => {
    try {
      const payload = {
        user_id: user.id,
        food_name: food.name || 'Receipt Item',
        quantity_servings: food.quantity || 1,
        meal_type: 'snack',
        source: 'receipt'
      };
      const response = await axios.post('/meals', payload);
      if (response.data.success) {
        setMeals([...meals, { id: response.data.meal_id, ...payload }]);
      }
    } catch (e) {
      console.error('Error adding parsed food:', e);
    }
  };

  const handlePurdueLookup = async () => {
    if (!purdueQuery) return;
    try {
      const resp = await axios.get(`/purdue/nutrition/${encodeURIComponent(purdueQuery)}`);
      if (resp.data.success) {
        setPurdueResult(resp.data.nutrition);
      } else {
        setPurdueResult(null);
      }
    } catch (e) {
      console.error('Purdue lookup error:', e);
      setPurdueResult(null);
    }
  };

  const addPurdueAsMeal = async () => {
    if (!purdueResult) return;
    try {
      // 1) Ensure the food exists in DB (add or reuse)
      const foodPayload = {
        name: purdueQuery,
        serving_size_value: 1,
        serving_size_unit: 'serving',
        calories_per_serving: purdueResult.calories_per_serving,
        protein_g_per_serving: purdueResult.protein_g_per_serving,
        carbs_g_per_serving: purdueResult.carbs_g_per_serving,
        fat_g_per_serving: purdueResult.fat_g_per_serving
      };
      try {
        await axios.post('/foods', foodPayload);
      } catch (e) {
        // If duplicate, backend may error; continue to meal add
      }

      // 2) Add meal using that food name
      const mealPayload = {
        user_id: user.id,
        food_name: purdueQuery,
        quantity_servings: 1,
        meal_type: 'lunch',
        source: 'purdue_menu'
      };
      const response = await axios.post('/meals', mealPayload);
      if (response.data.success) {
        setMeals([...meals, { id: response.data.meal_id, ...mealPayload }]);
      }
    } catch (e) {
      console.error('Error adding purdue item:', e);
    }
  };

  const filteredMeals = meals.filter(meal =>
    meal.food_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMealTypeIcon = (mealType) => {
    const icons = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🍎'
    };
    return icons[mealType] || '🍽️';
  };

  const getMealTypeColor = (mealType) => {
    const colors = {
      breakfast: '#ffc107',
      lunch: '#28a745',
      dinner: '#6f42c1',
      snack: '#17a2b8'
    };
    return colors[mealType] || '#6c757d';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="text-center" style={{ padding: '60px 0' }}>
          <div className="nutrition-value">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex flex-between mb-4">
        <h1 style={{ 
          color: '#ffffff',
          backgroundColor: '#28a745',
          margin: 0,
          fontWeight: 'bold',
          fontSize: '2rem',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          Meal Log
        </h1>
        
        <div className="flex gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              fontSize: '16px'
            }}
          />
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={18} />
            Add Meal
          </button>
        </div>
      </div>

      {/* Search and Quick Actions */}
      <div className="card mb-4">
        <div className="flex flex-between">
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={20} style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#6c757d'
            }} />
            <input
              type="text"
              placeholder="Search meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '2px solid #e1e5e9',
                borderRadius: '8px',
                fontSize: '16px'
              }}
            />
          </div>
          
          <div className="flex gap-4">
            {/* Receipt upload */}
            <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <Camera size={18} />
              {uploadingReceipt ? 'Uploading...' : 'Receipt'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
            </label>
            <button className="btn btn-secondary" onClick={handleReceiptUpload} disabled={!receiptFile || uploadingReceipt}>
              Process
            </button>

            {/* Purdue quick lookup */}
            <div className="flex" style={{ gap: '8px' }}>
              <input
                type="text"
                placeholder="Purdue item..."
                value={purdueQuery}
                onChange={(e) => setPurdueQuery(e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handlePurdueLookup}>
                <Utensils size={18} />
                Lookup
              </button>
            </div>
          </div>
        </div>
      </div>

      {(parsedFoods.length > 0) && (
        <div className="card mb-4">
          <h3 style={{ marginBottom: '12px' }}>Receipt Items</h3>
          {parsedFoods.map((f, idx) => (
            <div key={idx} className="flex flex-between" style={{ padding: '8px 0' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{f.name || 'Unknown Item'}</div>
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>Qty: {f.quantity || 1} {f.unit || ''}</div>
              </div>
              <button className="btn" onClick={() => addParsedFoodAsMeal(f)}>Add</button>
            </div>
          ))}
        </div>
      )}

      {(parsedFoods.length === 0 && receiptFile && !uploadingReceipt) && (
        <div className="card mb-4">
          <div style={{ 
            color: '#856404', 
            backgroundColor: '#fff3cd', 
            padding: '12px', 
            borderRadius: '8px',
            border: '1px solid #ffc107'
          }}>
            No items detected from receipt. This could be due to:
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Poor image quality or unclear text</li>
              <li>Receipt format not recognized</li>
              <li>OCR processing error</li>
            </ul>
            Try uploading a clearer image or manually add items.
          </div>
        </div>
      )}

      {purdueResult && (
        <div className="card mb-4">
          <h3 style={{ marginBottom: '12px' }}>Purdue Nutrition</h3>
          <div className="flex flex-between">
            <div>
              <div style={{ fontWeight: 600 }}>{purdueQuery}</div>
              <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                {purdueResult.calories_per_serving} cal • {purdueResult.protein_g_per_serving}g P • {purdueResult.carbs_g_per_serving}g C • {purdueResult.fat_g_per_serving}g F
              </div>
            </div>
            <button className="btn" onClick={addPurdueAsMeal}>Add</button>
          </div>
        </div>
      )}

      {/* Add Meal Form */}
      {showAddForm && (
        <div className="card mb-4">
          <h3 style={{ marginBottom: '20px' }}>Add New Meal</h3>
          <form onSubmit={handleAddMeal}>
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Food Name</label>
                <input
                  type="text"
                  value={newMeal.food_name}
                  onChange={(e) => setNewMeal({...newMeal, food_name: e.target.value})}
                  className="form-input"
                  placeholder="e.g., Apple, Grilled Chicken"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Quantity (servings)</label>
                <input
                  type="number"
                  value={newMeal.quantity_servings}
                  onChange={(e) => setNewMeal({...newMeal, quantity_servings: parseFloat(e.target.value)})}
                  className="form-input"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  value={newMeal.meal_type}
                  onChange={(e) => setNewMeal({...newMeal, meal_type: e.target.value})}
                  className="form-select"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              
              <div className="form-group">
                <label className="form-label">Source</label>
                <select
                  value={newMeal.source}
                  onChange={(e) => setNewMeal({...newMeal, source: e.target.value})}
                  className="form-select"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="purdue_menu">Purdue Menu</option>
                  <option value="receipt">Receipt</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <button type="submit" className="btn">Add Meal</button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meals List */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Today's Meals</h3>
        
        {filteredMeals.length === 0 ? (
          <div className="text-center" style={{ padding: '40px 0' }}>
            <div className="text-muted">No meals logged for this date</div>
            <button 
              onClick={() => setShowAddForm(true)}
              className="btn mt-4"
            >
              Add Your First Meal
            </button>
          </div>
        ) : (
          <div>
            {filteredMeals.map((meal) => (
              <div key={meal.id} className="meal-item">
                <div className="flex flex-between">
                  <div>
                    <h4>{meal.food_name}</h4>
                    <p>
                      {meal.quantity_servings} serving{meal.quantity_servings !== 1 ? 's' : ''} • 
                      <span style={{ 
                        color: getMealTypeColor(meal.meal_type),
                        fontWeight: '600',
                        marginLeft: '8px'
                      }}>
                        {getMealTypeIcon(meal.meal_type)} {meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1)}
                      </span>
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {meal.calories} cal
                    </div>
                    <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                      {meal.protein_g}g protein
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealLog;
