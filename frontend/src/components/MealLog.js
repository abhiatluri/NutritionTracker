import React, { useState, useEffect } from 'react';
import { Plus, Search, Camera, Utensils } from 'lucide-react';
import axios from 'axios';

const MealLog = ({ user }) => {
  const [meals, setMeals] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0
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
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Camera size={18} />
              Receipt
            </button>
            <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Utensils size={18} />
              Purdue Menu
            </button>
          </div>
        </div>
      </div>

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
