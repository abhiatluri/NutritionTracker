import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LogOut, Home, Utensils, Target } from 'lucide-react';

const Navbar = ({ user, onLogout }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav style={{
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: '16px 0',
      marginBottom: '32px'
    }}>
      <div className="container">
        <div className="flex flex-between">
          <div className="flex gap-4" style={{ alignItems: 'center' }}>
            <h2 style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              Nutrition Tracker
            </h2>
            
            <div className="flex gap-4">
              <Link 
                to="/dashboard" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/dashboard') ? '#667eea' : '#6c757d',
                  background: isActive('/dashboard') ? '#f8f9ff' : 'transparent',
                  fontWeight: isActive('/dashboard') ? '600' : '400'
                }}
              >
                <Home size={18} />
                Dashboard
              </Link>
              
              <Link 
                to="/meals" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/meals') ? '#667eea' : '#6c757d',
                  background: isActive('/meals') ? '#f8f9ff' : 'transparent',
                  fontWeight: isActive('/meals') ? '600' : '400'
                }}
              >
                <Utensils size={18} />
                Meals
              </Link>
              
              <Link 
                to="/goals" 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: isActive('/goals') ? '#667eea' : '#6c757d',
                  background: isActive('/goals') ? '#f8f9ff' : 'transparent',
                  fontWeight: isActive('/goals') ? '600' : '400'
                }}
              >
                <Target size={18} />
                Goals
              </Link>
            </div>
          </div>
          
          <div className="flex gap-4" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} />
              <span style={{ fontWeight: '600' }}>{user?.username}</span>
            </div>
            
            <button 
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                background: '#dc3545',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
