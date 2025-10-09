import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Calendar, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = ({ user }) => {
  const [nutrition, setNutrition] = useState({
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0
  });
  const [goals, setGoals] = useState({
    goal_protein_g: 120,
    goal_macros_pct: [25, 50, 25]
  });
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchDailyNutrition();
  }, [date]);

  const fetchDailyNutrition = async () => {
    try {
      const response = await axios.get(`/meals/${user.id}/${date}`);
      if (response.data.success) {
        setNutrition(response.data.nutrition);
      }
    } catch (error) {
      console.error('Error fetching nutrition:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMacros = () => {
    const totalCalories = nutrition.calories;
    if (totalCalories === 0) return [0, 0, 0];
    
    const proteinCal = nutrition.protein_g * 4;
    const carbsCal = nutrition.carbs_g * 4;
    const fatCal = nutrition.fat_g * 9;
    
    return [
      Math.round((proteinCal / totalCalories) * 100),
      Math.round((carbsCal / totalCalories) * 100),
      Math.round((fatCal / totalCalories) * 100)
    ];
  };

  const macroData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: calculateMacros(),
      backgroundColor: ['#667eea', '#764ba2', '#f093fb'],
      borderWidth: 0
    }]
  };

  const macroOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: {
            size: 14
          }
        }
      }
    }
  };

  const getProgressPercentage = (current, goal) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  const getDeficiencies = () => {
    const deficiencies = [];
    const proteinPct = getProgressPercentage(nutrition.protein_g, goals.goal_protein_g);
    
    if (proteinPct < 80) {
      deficiencies.push('Add more protein to meet your goals!');
    }
    
    return deficiencies;
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
          Dashboard
        </h1>
        
        <div className="flex gap-4" style={{ alignItems: 'center' }}>
          <Calendar size={20} />
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
        </div>
      </div>

      {/* Nutrition Overview */}
      <div className="grid grid-3 mb-4">
        <div className="nutrition-card">
          <div className="nutrition-value">{Math.round(nutrition.calories)}</div>
          <div className="nutrition-label">Calories</div>
        </div>
        
        <div className="nutrition-card">
          <div className="nutrition-value">{Math.round(nutrition.protein_g)}g</div>
          <div className="nutrition-label">Protein</div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercentage(nutrition.protein_g, goals.goal_protein_g)}%` }}
            />
          </div>
        </div>
        
        <div className="nutrition-card">
          <div className="nutrition-value">{Math.round(nutrition.carbs_g)}g</div>
          <div className="nutrition-label">Carbs</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Macro Breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} />
            Macro Breakdown
          </h3>
          
          <div style={{ height: '300px', marginBottom: '20px' }}>
            <Pie data={macroData} options={macroOptions} />
          </div>
          
          <div className="grid grid-3">
            {['Protein', 'Carbs', 'Fat'].map((macro, index) => (
              <div key={macro} className="text-center">
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: macroData.datasets[0].backgroundColor[index] }}>
                  {calculateMacros()[index]}%
                </div>
                <div className="text-muted">{macro}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="card">
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} />
            Recommendations
          </h3>
          
          {getDeficiencies().length > 0 ? (
            <div>
              {getDeficiencies().map((deficiency, index) => (
                <div key={index} style={{
                  background: '#fff3cd',
                  color: '#856404',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle size={18} />
                  {deficiency}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: '#d4edda',
              color: '#155724',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <CheckCircle size={24} style={{ marginBottom: '8px' }} />
              <div>Great job! You're meeting your nutrition goals.</div>
            </div>
          )}
          
          <div className="mt-4">
            <h4>Today's Summary</h4>
            <p className="text-muted">
              You've consumed {Math.round(nutrition.calories)} calories today.
              {nutrition.protein_g > 0 && (
                <span> Your protein intake is {Math.round((nutrition.protein_g / goals.goal_protein_g) * 100)}% of your goal.</span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
