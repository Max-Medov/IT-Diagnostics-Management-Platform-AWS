import React, { useState } from 'react';
import authService from '../api/authService';
import { Container, TextField, Button, Typography, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';

function Login() {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await authService.post('/login', formData);
      if (response.status === 200) {
        localStorage.setItem('token', response.data.access_token);
        setMessage('Login successful!');
        if (response.data.password_change_required) {
          // Must change password
          navigate('/change-password');
        } else {
          const decoded = jwt_decode(response.data.access_token);
          if (decoded.is_admin) {
            if (formData.username === 'admin') {
              navigate('/change-username');
            } else {
              navigate('/admin-dashboard');
            }
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Login failed: ${error.response.data.message}`);
      } else {
        setMessage('Login failed: An unexpected error occurred.');
      }
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '50px' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Login
      </Typography>
      {message && (
        <Alert
          severity={message.startsWith('Login successful') ? 'success' : 'error'}
          style={{ marginBottom: '20px' }}
        >
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <Button variant="contained" color="primary" type="submit" fullWidth style={{ marginTop: '20px' }}>
          Login
        </Button>
      </form>
      <Typography variant="body1" style={{ marginTop: '20px' }}>
        Don't have an account? <Link to="/register">Register here</Link>.
      </Typography>
    </Container>
  );
}

export default Login;

