import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Save, CheckCircle } from 'lucide-react';
import axios from 'axios';

const Goals = ({ user }) => {
  const [goals, setGoals] = useState({
    goal_weight_change: '',
    goal_protein_g: '',
    goal_calories: '',
    goal_macros_pct: ['', '', '']
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [macroError, setMacroError] = useState('');

  const handleChange = (field, value) => {
    if (field === 'goal_macros_pct') {
      setGoals({
        ...goals,
        goal_macros_pct: value
      });
    } else {
      setGoals({
        ...goals,
        [field]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const response = await axios.post(`/goals/${user.id}`, goals);
      
      if (response.data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMacro = (index, value) => {
    const newMacros = [...goals.goal_macros_pct];
    newMacros[index] = value === '' ? '' : parseFloat(value);
    
    const total = newMacros.reduce((a, b) => a + (b || 0), 0);
    if (total !== 100 && total > 0) {
      setMacroError('Macros must add up to exactly 100%');
    } else {
      setMacroError('');
    }
    
    setGoals({
      ...goals,
      goal_macros_pct: newMacros
    });
  };

  useEffect(() => {
    const proteinPct = goals.goal_macros_pct[0] || 0;
    const calories = goals.goal_calories || 0;
    
    if (proteinPct > 0 && calories > 0) {
      const calculatedProtein = Math.round((calories * proteinPct / 100) / 4);
      setGoals(prev => ({
        ...prev,
        goal_protein_g: calculatedProtein
      }));
    } else {
      setGoals(prev => ({
        ...prev,
        goal_protein_g: ''
      }));
    }
  }, [goals.goal_calories, goals.goal_macros_pct[0]]);

  return (
    <div className="container">
      <div className="flex flex-between mb-4">
        <h1 style={{ 
          color: '#ffffff',
          backgroundColor: '#ff6b35',
          margin: 0,
          fontWeight: 'bold',
          fontSize: '2rem',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          Nutrition Goals
        </h1>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} />
            Set Your Goals
          </h3>

          {saved && (
            <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <CheckCircle size={18} />
              Goals saved successfully!
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <TrendingUp size={18} style={{ marginRight: '8px', display: 'inline' }} />
                Weight Change Goal (lbs per week)
              </label>
              <input
                type="number"
                value={goals.goal_weight_change}
                onChange={(e) => handleChange('goal_weight_change', e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="form-input"
                step="0.1"
                min="-5"
                max="5"
                placeholder="Enter weight change goal"
              />
              <small className="text-muted">
                Negative values for weight loss, positive for weight gain. Recommended: -0.5 to -1.0 lbs/week for healthy weight loss
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Calorie Goal</label>
              <input
                type="number"
                value={goals.goal_calories}
                onChange={(e) => {
                  const calories = e.target.value === '' ? '' : parseFloat(e.target.value);
                  handleChange('goal_calories', calories);
                }}
                className="form-input"
                min="0"
                step="50"
                placeholder="Enter daily calorie goal"
              />
              <small className="text-muted">
                Enter your target daily calorie intake
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Daily Protein Goal (grams)</label>
              <input
                type="number"
                value={goals.goal_protein_g}
                readOnly
                className="form-input"
                style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                placeholder="Calculated from protein %"
              />
              <small className="text-muted">
                Automatically calculated from protein percentage and calorie goal
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Macro Distribution (%)</label>
              <div className="grid grid-3">
                <div>
                  <label className="form-label">Protein</label>
                  <input
                    type="number"
                    value={goals.goal_macros_pct[0]}
                    onChange={(e) => updateMacro(0, e.target.value)}
                    className="form-input"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="25"
                  />
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>10-35%</small>
                </div>
                <div>
                  <label className="form-label">Carbs</label>
                  <input
                    type="number"
                    value={goals.goal_macros_pct[1]}
                    onChange={(e) => updateMacro(1, e.target.value)}
                    className="form-input"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="45"
                  />
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>45-65%</small>
                </div>
                <div>
                  <label className="form-label">Fat</label>
                  <input
                    type="number"
                    value={goals.goal_macros_pct[2]}
                    onChange={(e) => updateMacro(2, e.target.value)}
                    className="form-input"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="30"
                  />
                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>20-35%</small>
                </div>
              </div>
              <small className="text-muted">
                Total: {goals.goal_macros_pct.reduce((a, b) => a + (b || 0), 0)}% (should equal 100%)
              </small>
              {macroError && (
                <div style={{
                  color: '#dc3545',
                  fontSize: '0.875rem',
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#f8d7da',
                  borderRadius: '4px',
                  border: '1px solid #f5c6cb'
                }}>
                  {macroError}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn" 
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              disabled={loading || macroError !== ''}
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Goals'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Goal Summary</h3>
          
          <div className="nutrition-card mb-4">
            <div className="nutrition-value">
              {goals.goal_weight_change === '' ? '--' : (goals.goal_weight_change > 0 ? '+' : '') + goals.goal_weight_change}
            </div>
            <div className="nutrition-label">lbs per week</div>
          </div>

          <div className="nutrition-card mb-4">
            <div className="nutrition-value">{goals.goal_protein_g === '' ? '--' : goals.goal_protein_g}g</div>
            <div className="nutrition-label">Daily Protein</div>
          </div>

          <div>
            <h4>Macro Targets</h4>
            <div className="grid grid-3">
              <div className="text-center">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
                  {goals.goal_macros_pct[0] === '' ? '--' : goals.goal_macros_pct[0]}%
                </div>
                <div className="text-muted">Protein</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#764ba2' }}>
                  {goals.goal_macros_pct[1] === '' ? '--' : goals.goal_macros_pct[1]}%
                </div>
                <div className="text-muted">Carbs</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f093fb' }}>
                  {goals.goal_macros_pct[2] === '' ? '--' : goals.goal_macros_pct[2]}%
                </div>
                <div className="text-muted">Fat</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4>Healthy Macro Ranges</h4>
            <ul style={{ paddingLeft: '20px', color: '#6c757d' }}>
              <li><strong>Protein:</strong> 10-35% of calories</li>
              <li><strong>Carbs:</strong> 45-65% of calories</li>
              <li><strong>Fat:</strong> 20-35% of calories</li>
              <li><strong>Weight Loss:</strong> Aim for -0.5 to -1.0 lbs per week</li>
              <li><strong>Protein Intake:</strong> 0.8-1.2g per lb of body weight</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Goals;
