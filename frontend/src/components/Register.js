import React, { useState } from 'react';
import authService from '../api/authService';
import { Container, TextField, Button, Typography, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate(); // Hook to programmatically navigate

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Simple client-side validation
    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    try {
      const { confirmPassword, ...submitData } = formData; // Exclude confirmPassword
      const response = await authService.post('/register', submitData);
      if (response.status === 201) {
        setMessage('Registration successful! Redirecting to login...');
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Registration failed: ${error.response.data.message}`);
      } else {
        setMessage('Registration failed: An unexpected error occurred.');
      }
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '50px' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Register
      </Typography>
      {message && (
        <Alert
          severity={message.startsWith('Registration successful') ? 'success' : 'error'}
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
        <TextField
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <Button variant="contained" color="primary" type="submit" fullWidth style={{ marginTop: '20px' }}>
          Register
        </Button>
      </form>
      <Typography variant="body1" style={{ marginTop: '20px' }}>
        Already have an account? <Link to="/login">Login here</Link>.
      </Typography>
    </Container>
  );
}

export default Register;

