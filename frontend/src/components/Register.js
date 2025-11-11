import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { User, Lock, Scale, Ruler, Activity, AlertCircle, CheckCircle } from 'lucide-react';

const Register = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    weight_lbs: '',
    height_inches: '',
    sex: '',
    activity_level: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side validation
    if (!formData.sex) {
      setError('Please select your sex');
      setLoading(false);
      return;
    }
    
    if (!formData.activity_level) {
      setError('Please select your activity level');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/register', formData);
      
      if (response.data.success) {
        setSuccess('Account created successfully! Signing you in...');
        
        // Auto-login after successful registration
        setTimeout(async () => {
          try {
            const loginResponse = await axios.post('/login', {
              username: formData.username,
              password: formData.password
            });
            
            if (loginResponse.data.success) {
              const userData = {
                id: 1, // This would come from the API
                username: formData.username
              };
              onLogin(userData);
            }
          } catch (loginErr) {
            setError('Account created but login failed. Please sign in manually.');
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
        <div className="text-center mb-4">
          <h1 style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px'
          }}>
            Create Account
          </h1>
          <p className="text-muted">Start tracking your nutrition today</p>
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>* Required fields</p>
        </div>

        {error && (
          <div style={{
            background: '#f8d7da',
            color: '#721c24',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
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
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={18} style={{ marginRight: '8px', display: 'inline' }} />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={18} style={{ marginRight: '8px', display: 'inline' }} />
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Create a password"
              required
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <Scale size={18} style={{ marginRight: '8px', display: 'inline' }} />
                Weight (lbs)
              </label>
              <input
                type="number"
                name="weight_lbs"
                value={formData.weight_lbs}
                onChange={handleChange}
                className="form-input"
                placeholder="150"
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Ruler size={18} style={{ marginRight: '8px', display: 'inline' }} />
                Height (inches)
              </label>
              <input
                type="number"
                name="height_inches"
                value={formData.height_inches}
                onChange={handleChange}
                className="form-input"
                placeholder="70"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Sex *</label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select sex</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Activity size={18} style={{ marginRight: '8px', display: 'inline' }} />
                Activity Level *
              </label>
              <select
                name="activity_level"
                value={formData.activity_level}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-muted">
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: '#667eea', 
                textDecoration: 'none',
                fontWeight: '600'
              }}
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
