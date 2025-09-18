import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { authService } from './services/authService';
import './App.css';

function App() {
  useEffect(() => {
    // Initialize authentication when app loads
    authService.initialize();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Default route - redirect to dashboard if authenticated, otherwise to login */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public routes - redirect to dashboard if already authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          
          {/* Protected routes - require authentication */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all route - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
