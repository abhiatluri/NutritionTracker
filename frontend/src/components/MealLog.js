import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Camera, Utensils, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
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

  // Purdue dining hall selection
  const [showPurdueModal, setShowPurdueModal] = useState(false);
  const [diningHalls, setDiningHalls] = useState([]);
  const [selectedHall, setSelectedHall] = useState(null);
  const [hallFoods, setHallFoods] = useState([]);
  const [loadingHalls, setLoadingHalls] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);
  
  // Drag and drop state
  const [draggedMeal, setDraggedMeal] = useState(null);
  
  // Serving size editing state
  const [editingServing, setEditingServing] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  
  // Meal type order: breakfast, lunch, snack, dinner
  const mealTypeOrder = ['breakfast', 'lunch', 'snack', 'dinner'];
  
  // Ref for modal scroll container
  const modalScrollRef = useRef(null);

  const [newMeal, setNewMeal] = useState({
    food_name: '',
    quantity_servings: 1,
    meal_type: 'snack',
    source: 'manual',
    calories_per_serving: 0,
    protein_g_per_serving: 0,
    carbs_g_per_serving: 0,
    fat_g_per_serving: 0,
    serving_size_value: 1,
    serving_size_unit: 'serving'
  });

  useEffect(() => {
    fetchMeals();
  }, [date]);

  const fetchMeals = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/meals/${user.id}/${date}`);
      if (response.data.success) {
        setMeals(response.data.meals || []);
      }
    } catch (error) {
      console.error('Error fetching meals:', error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    
    try {
      // 1) First, add the food to the database with nutrition data
      const foodPayload = {
        name: newMeal.food_name,
        serving_size_value: newMeal.serving_size_value || 1,
        serving_size_unit: newMeal.serving_size_unit || 'serving',
        calories_per_serving: newMeal.calories_per_serving || 0,
        protein_g_per_serving: newMeal.protein_g_per_serving || 0,
        carbs_g_per_serving: newMeal.carbs_g_per_serving || 0,
        fat_g_per_serving: newMeal.fat_g_per_serving || 0
      };
      
      try {
        await axios.post('/foods', foodPayload);
      } catch (e) {
        // If duplicate, continue (food already exists)
      }

      // 2) Then add the meal entry
      const mealPayload = {
        user_id: user.id,
        food_name: newMeal.food_name,
        quantity_servings: newMeal.quantity_servings,
        meal_type: newMeal.meal_type,
        source: newMeal.source
      };
      
      const response = await axios.post('/meals', mealPayload);
      
      if (response.data.success) {
        // Refetch meals to get complete data with nutrition
        await fetchMeals();
        setNewMeal({
          food_name: '',
          quantity_servings: 1,
          meal_type: 'snack',
          source: 'manual',
          calories_per_serving: 0,
          protein_g_per_serving: 0,
          carbs_g_per_serving: 0,
          fat_g_per_serving: 0,
          serving_size_value: 1,
          serving_size_unit: 'serving'
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
      // 1) First, ensure the food exists in DB with nutrition data
      const foodPayload = {
        name: food.name || 'Receipt Item',
        serving_size_value: food.serving_size_value || 1,
        serving_size_unit: food.serving_size_unit || 'serving',
        calories_per_serving: food.calories_per_serving || 0,
        protein_g_per_serving: food.protein_g_per_serving || 0,
        carbs_g_per_serving: food.carbs_g_per_serving || 0,
        fat_g_per_serving: food.fat_g_per_serving || 0
      };
      
      try {
        await axios.post('/foods', foodPayload);
      } catch (e) {
        // If duplicate, continue
      }

      // 2) Then add the meal entry
      const payload = {
        user_id: user.id,
        food_name: food.name || 'Receipt Item',
        quantity_servings: food.quantity || 1,
        meal_type: 'snack',
        source: 'receipt'
      };
      const response = await axios.post('/meals', payload);
      if (response.data.success) {
        // Refetch meals to get complete data with nutrition
        await fetchMeals();
      }
    } catch (e) {
      console.error('Error adding parsed food:', e);
    }
  };

  const openPurdueModal = async () => {
    setShowPurdueModal(true);
    setLoadingHalls(true);
    try {
      const resp = await axios.get('/purdue/dining-halls');
      if (resp.data.success) {
        setDiningHalls(resp.data.dining_halls || []);
      }
    } catch (e) {
      console.error('Error loading dining halls:', e);
    } finally {
      setLoadingHalls(false);
    }
  };

  const selectDiningHall = async (hallName) => {
    setSelectedHall(hallName);
    setLoadingFoods(true);
    try {
      const resp = await axios.get(`/purdue/dining-hall/${encodeURIComponent(hallName)}/foods`);
      if (resp.data.success) {
        setHallFoods(resp.data.foods || []);
      }
    } catch (e) {
      console.error('Error loading foods:', e);
      setHallFoods([]);
    } finally {
      setLoadingFoods(false);
    }
  };

  const addHallFoodAsMeal = async (food) => {
    if (!user || !user.id) {
      alert('Please log in to add meals');
      return;
    }

    // Use meal_type from food object (automatically detected from Purdue API)
    // Default to 'snack' if not provided
    const mealType = food.meal_type || 'snack';

    try {
      // 1) Ensure the food exists in DB
      const foodPayload = {
        name: food.name,
        serving_size_value: food.serving_size_value || 1,
        serving_size_unit: food.serving_size_unit || 'serving',
        calories_per_serving: food.calories_per_serving || 0,
        protein_g_per_serving: food.protein_g_per_serving || 0,
        carbs_g_per_serving: food.carbs_g_per_serving || 0,
        fat_g_per_serving: food.fat_g_per_serving || 0
      };
      
      // Add food (will return existing ID if duplicate)
      try {
        await axios.post('/foods', foodPayload);
      } catch (e) {
        // If error, log but continue - food might already exist
        if (e.response?.status !== 201) {
          console.warn('Food add warning:', e.response?.data || e.message);
        }
      }

      // 2) Add meal entry with automatically detected meal type
      const mealPayload = {
        user_id: user.id,
        food_name: food.name,
        quantity_servings: 1,
        meal_type: mealType,
        source: 'purdue_menu'
      };
      
      // Preserve scroll positions (both page and modal)
      const pageScrollY = window.scrollY;
      const pageScrollX = window.scrollX;
      const modalScrollTop = modalScrollRef.current?.scrollTop || 0;
      
      const response = await axios.post('/meals', mealPayload);
      
      if (response.data.success) {
        // Refetch meals to get complete data with nutrition
        await fetchMeals();
        // Restore scroll positions after update
        setTimeout(() => {
          window.scrollTo(pageScrollX, pageScrollY);
          if (modalScrollRef.current) {
            modalScrollRef.current.scrollTop = modalScrollTop;
          }
        }, 0);
        requestAnimationFrame(() => {
          window.scrollTo(pageScrollX, pageScrollY);
          if (modalScrollRef.current) {
            modalScrollRef.current.scrollTop = modalScrollTop;
          }
        });
      } else {
        alert(`Failed to add meal: ${response.data.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Error adding purdue item:', e);
      const errorMsg = e.response?.data?.error || e.message || 'Unknown error';
      alert(`Error adding meal: ${errorMsg}`);
    }
  };

  const handleDragStart = (e, meal) => {
    e.stopPropagation();
    setDraggedMeal(meal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedMeal(null);
  };

  const handleDrop = async (e, targetMealType) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedMeal) return;
    
    // Don't do anything if dropping in the same section
    if (draggedMeal.meal_type === targetMealType) {
      setDraggedMeal(null);
      return;
    }

    // Preserve scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    try {
      const response = await axios.patch(`/meals/${draggedMeal.id}`, {
        meal_type: targetMealType
      });
      
      if (response.data.success) {
        await fetchMeals();
        // Restore scroll position after update
        setTimeout(() => {
          window.scrollTo(scrollX, scrollY);
        }, 0);
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      } else {
        alert('Failed to update meal');
      }
    } catch (error) {
      console.error('Error updating meal:', error);
      alert('Failed to update meal');
    }
    
    setDraggedMeal(null);
  };

  const startEditingServing = (meal) => {
    setEditingServing(meal.id);
    setEditingValue(meal.quantity_servings.toString());
  };

  const cancelEditingServing = () => {
    setEditingServing(null);
    setEditingValue('');
  };

  const saveServingChange = async (mealId, newValue) => {
    const numValue = parseFloat(newValue);
    if (isNaN(numValue) || numValue <= 0) {
      alert('Please enter a valid number greater than 0');
      cancelEditingServing();
      return;
    }

    // Round to 2 decimal places
    const roundedValue = Math.round(numValue * 100) / 100;

    // Preserve scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    try {
      const response = await axios.patch(`/meals/${mealId}`, {
        quantity_servings: roundedValue
      });
      
      if (response.data.success) {
        await fetchMeals();
        cancelEditingServing();
        // Restore scroll position after update
        setTimeout(() => {
          window.scrollTo(scrollX, scrollY);
        }, 0);
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      } else {
        alert('Failed to update serving size');
      }
    } catch (error) {
      console.error('Error updating serving size:', error);
      alert('Failed to update serving size');
    }
  };

  const adjustServing = async (meal, delta, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent?.stopImmediatePropagation();
    }
    // Preserve scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // Round current value to 2 decimals, add delta, then round result to 2 decimals
    const currentRounded = Math.round(meal.quantity_servings * 100) / 100;
    const newValue = Math.max(0.1, Math.round((currentRounded + delta) * 100) / 100);
    
    try {
      await saveServingChange(meal.id, newValue.toString());
    } finally {
      // Restore scroll position after update - use multiple methods to ensure it works
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 0);
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    }
  };

  const handleServingInputKeyDown = (e, meal) => {
    if (e.key === 'Enter') {
      saveServingChange(meal.id, editingValue);
    } else if (e.key === 'Escape') {
      cancelEditingServing();
    }
  };

  const deleteMeal = async (mealId, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Preserve scroll position
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    try {
      const response = await axios.delete(`/meals/${mealId}`);
      
      if (response.data.success) {
        await fetchMeals();
        // Restore scroll position after update
        setTimeout(() => {
          window.scrollTo(scrollX, scrollY);
        }, 0);
        requestAnimationFrame(() => {
          window.scrollTo(scrollX, scrollY);
        });
      } else {
        alert('Failed to delete meal');
      }
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal');
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

            {/* Purdue dining hall lookup */}
            <button 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }} 
              onClick={openPurdueModal}
            >
              <Utensils size={18} />
              Purdue Menu
            </button>
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

      {/* Purdue Dining Hall Modal */}
      {showPurdueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => {
          setShowPurdueModal(false);
          setSelectedHall(null);
          setHallFoods([]);
        }}>
          <div className="card" style={{
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Purdue Dining Halls</h2>
              <button 
                onClick={() => {
                  setShowPurdueModal(false);
                  setSelectedHall(null);
                  setHallFoods([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {!selectedHall ? (
              // Show dining halls list
              <div>
                {loadingHalls ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Loading dining halls...</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {diningHalls.map((hall) => (
                      <button
                        key={hall}
                        className="btn btn-secondary"
                        onClick={() => selectDiningHall(hall)}
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      >
                        {hall}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Show foods for selected dining hall
              <div>
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => {
                      setSelectedHall(null);
                      setHallFoods([]);
                    }}
                    style={{
                      background: 'none',
                      border: '2px solid #e1e5e9',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    ← Back
                  </button>
                  <h3 style={{ margin: 0 }}>{selectedHall}</h3>
                </div>

                {loadingFoods ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>Loading foods...</div>
                ) : hallFoods.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    No foods found for this dining hall
                  </div>
                ) : (
                  <div ref={modalScrollRef} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {hallFoods.map((food, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid #e1e5e9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{food.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                            {Math.round(food.calories_per_serving || 0)} cal • {Math.round(food.protein_g_per_serving || 0)}g P • {Math.round(food.carbs_g_per_serving || 0)}g C • {Math.round(food.fat_g_per_serving || 0)}g F
                          </div>
                        </div>
                        <button
                          className="btn"
                          onClick={() => addHallFoodAsMeal(food)}
                          style={{ marginLeft: '16px' }}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            
            <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '1rem' }}>Nutrition Information (per serving)</h4>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Calories</label>
                  <input
                    type="number"
                    value={newMeal.calories_per_serving}
                    onChange={(e) => setNewMeal({...newMeal, calories_per_serving: parseInt(e.target.value) || 0})}
                    className="form-input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Protein (g)</label>
                  <input
                    type="number"
                    value={newMeal.protein_g_per_serving}
                    onChange={(e) => setNewMeal({...newMeal, protein_g_per_serving: parseInt(e.target.value) || 0})}
                    className="form-input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Carbs (g)</label>
                  <input
                    type="number"
                    value={newMeal.carbs_g_per_serving}
                    onChange={(e) => setNewMeal({...newMeal, carbs_g_per_serving: parseInt(e.target.value) || 0})}
                    className="form-input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Fat (g)</label>
                  <input
                    type="number"
                    value={newMeal.fat_g_per_serving}
                    onChange={(e) => setNewMeal({...newMeal, fat_g_per_serving: parseInt(e.target.value) || 0})}
                    className="form-input"
                    min="0"
                    step="1"
                    required
                  />
                </div>
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

      {/* Meals List - Grouped by Meal Type with Drag and Drop */}
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
            {mealTypeOrder.map((mealType) => {
              const mealsForType = filteredMeals.filter(meal => meal.meal_type === mealType);
              
              return (
                <div 
                  key={mealType} 
                  style={{ 
                    marginBottom: '30px',
                    minHeight: '100px',
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: mealsForType.length === 0 ? '#f8f9fa' : 'transparent',
                    border: draggedMeal && draggedMeal.meal_type !== mealType ? '2px dashed #667eea' : '1px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, mealType)}
                >
                  <h4 style={{ 
                    marginBottom: '16px',
                    color: getMealTypeColor(mealType),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {getMealTypeIcon(mealType)} {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    <span style={{ 
                      fontSize: '0.9rem', 
                      fontWeight: 'normal',
                      color: '#6c757d',
                      marginLeft: '8px'
                    }}>
                      ({mealsForType.length} {mealsForType.length === 1 ? 'item' : 'items'})
                    </span>
                  </h4>
                  
                  {mealsForType.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '20px',
                      color: '#6c757d',
                      fontStyle: 'italic',
                      fontSize: '0.9rem'
                    }}>
                      Drag meals here or add new meals
                    </div>
                  ) : (
                    mealsForType.map((meal) => (
                      <div 
                        key={meal.id} 
                        className="meal-item" 
                        style={{ 
                          marginBottom: '12px',
                          cursor: 'move',
                          opacity: draggedMeal?.id === meal.id ? 0.5 : 1,
                          transition: 'opacity 0.2s ease'
                        }}
                        draggable
                        onDragStart={(e) => handleDragStart(e, meal)}
                        onDragEnd={handleDragEnd}
                        onMouseDown={(e) => {
                          // Don't start drag if clicking on buttons or input
                          if (e.target.closest('button') || e.target.closest('input') || e.target.closest('span[onClick]')) {
                            e.stopPropagation();
                          }
                        }}
                      >
                      <div className="flex flex-between">
                          <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, marginBottom: '4px' }}>{meal.food_name}</h4>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              marginTop: '4px'
                            }}>
                              {editingServing === meal.id ? (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  backgroundColor: '#f0f4ff',
                                  borderRadius: '4px',
                                  padding: '2px'
                                }}>
                                  <input
                                    type="number"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={() => saveServingChange(meal.id, editingValue)}
                                    onKeyDown={(e) => handleServingInputKeyDown(e, meal)}
                                    style={{
                                      width: '70px',
                                      padding: '4px 6px',
                                      border: '1px solid #667eea',
                                      borderRadius: '4px',
                                      fontSize: '0.95rem',
                                      fontWeight: 600,
                                      color: '#667eea',
                                      textAlign: 'center'
                                    }}
                                    min="0.1"
                                    step="0.1"
                                    autoFocus
                                  />
                                  <span style={{ 
                                    fontSize: '0.9rem', 
                                    color: '#667eea',
                                    marginLeft: '4px'
                                  }}>
                                    {meal.quantity_servings === 1 ? 'serving' : 'servings'}
                                  </span>
                                </div>
                              ) : (
                                <div style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '4px',
                                  backgroundColor: '#f0f4ff',
                                  borderRadius: '4px',
                                  padding: '2px'
                                }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      adjustServing(meal, -0.1, e);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      color: '#667eea',
                                      outline: 'none'
                                    }}
                                    title="Decrease"
                                  >
                                    <ChevronDown size={16} />
                                  </button>
                                  <span 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      startEditingServing(meal);
                                    }}
                                    style={{ 
                                      fontSize: '0.95rem', 
                                      color: '#667eea',
                                      fontWeight: 600,
                                      padding: '4px 8px',
                                      cursor: 'text',
                                      minWidth: '60px',
                                      textAlign: 'center',
                                      display: 'inline-block'
                                    }}
                                    title="Click to edit"
                                  >
                                    {Math.round(meal.quantity_servings * 100) / 100} {meal.quantity_servings === 1 ? 'serving' : 'servings'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      adjustServing(meal, 0.1, e);
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      color: '#667eea',
                                      outline: 'none'
                                    }}
                                    title="Increase"
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                        </div>
                        
                        <div className="text-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={(e) => deleteMeal(meal.id, e)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#dc3545',
                              opacity: 0.7,
                              transition: 'opacity 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                            onMouseLeave={(e) => e.target.style.opacity = '0.7'}
                            title="Remove meal"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                              {Math.round(meal.calories || 0)} cal
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                              {Math.round(meal.protein_g || 0)}g P • {Math.round(meal.carbs_g || 0)}g C • {Math.round(meal.fat_g || 0)}g F
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MealLog;
