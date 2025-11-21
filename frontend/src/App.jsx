import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import NotesPages from './pages/NotesPages';    
import AddNotePage from './pages/AddNotePage';  
import EditNotePage from './pages/EditNotePage';  // ✅ Import edit page
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
          {/* Default route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Public routes */}
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
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/add"
            element={
              <ProtectedRoute>
                <AddNotePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/edit/:id"
            element={
              <ProtectedRoute>
                <EditNotePage />
              </ProtectedRoute>
            }
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
