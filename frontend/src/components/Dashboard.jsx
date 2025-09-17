import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Dashboard.css';

const Dashboard = () => {
  const [authState, setAuthState] = useState(authService.getAuthState());
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Initialize auth if not already done
    if (!authState.isAuthenticated && !authState.loading) {
      authService.initialize();
    }

    // Redirect to login if not authenticated
    if (!authState.loading && !authState.isAuthenticated) {
      navigate('/login');
    }

    return unsubscribe;
  }, [navigate, authState.isAuthenticated, authState.loading]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Show loading while checking authentication
  if (authState.loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // Don't render if not authenticated
  if (!authState.isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Cryptospirosis Notes</h1>
          <div className="header-actions">
            <span className="user-greeting">
              Welcome, {authState.user?.username || 'User'}!
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <div className="welcome-card">
            <h2>Welcome to your Dashboard</h2>
            <p>Hello <strong>{authState.user?.username}</strong>, you have successfully logged in!</p>
            
            <div className="user-info">
              <h3>Your Account Information:</h3>
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{authState.user?.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{authState.user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">User ID:</span>
                <span className="info-value">{authState.user?.userId}</span>
              </div>
            </div>

            <div className="dashboard-actions">
              <div className="action-card">
                <h4>🗒️ Notes</h4>
                <p>Manage your personal notes (Coming Soon)</p>
                <button className="action-button" disabled>
                  View Notes
                </button>
              </div>
              
              <div className="action-card">
                <h4>👤 Profile</h4>
                <p>Update your profile information (Coming Soon)</p>
                <button className="action-button" disabled>
                  Edit Profile
                </button>
              </div>
              
              <div className="action-card">
                <h4>⚙️ Settings</h4>
                <p>Customize your experience (Coming Soon)</p>
                <button className="action-button" disabled>
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>&copy; 2025 Cryptospirosis Notes. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Dashboard;
