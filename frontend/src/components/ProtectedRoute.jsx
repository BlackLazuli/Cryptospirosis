import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

// Component to protect routes that require authentication
const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState(authService.getAuthState());
  const location = useLocation();

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Initialize auth if not already done
    if (!authState.isAuthenticated && !authState.loading) {
      authService.initialize();
    }

    return unsubscribe;
  }, [authState.isAuthenticated, authState.loading]);

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

  // If not authenticated, redirect to login with return url
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

// Component to redirect authenticated users away from auth pages
const PublicRoute = ({ children }) => {
  const [authState, setAuthState] = useState(authService.getAuthState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe(setAuthState);
    
    // Initialize auth if not already done
    if (!authState.isAuthenticated && !authState.loading) {
      authService.initialize();
    }

    return unsubscribe;
  }, [authState.isAuthenticated, authState.loading]);

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

  // If authenticated, redirect to dashboard
  if (authState.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not authenticated, render the public component
  return children;
};

export { ProtectedRoute, PublicRoute };
