import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import CreateCase from './components/CreateCase';
import CaseDetails from './components/CaseDetails';
import Logout from './components/Logout';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import ChangePassword from './components/ChangePassword';
import ChangeUsername from './components/ChangeUsername';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-case"
          element={
            <PrivateRoute>
              <CreateCase />
            </PrivateRoute>
          }
        />
        <Route
          path="/cases/:caseId"
          element={
            <PrivateRoute>
              <CaseDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/logout"
          element={
            <PrivateRoute>
              <Logout />
            </PrivateRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <ChangePassword />
            </PrivateRoute>
          }
        />
        <Route
          path="/change-username"
          element={
            <PrivateRoute>
              <ChangeUsername />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

