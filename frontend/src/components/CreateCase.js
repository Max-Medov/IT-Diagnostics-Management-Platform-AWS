import React, { useState } from 'react';
import caseService from '../api/caseService';
import { Container, TextField, Button, Typography, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function CreateCase() {
  const [formData, setFormData] = useState({ description: '', platform: 'Linux Machine' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await caseService.post('/cases', formData);
      if (response.status === 201) {
        setMessage('Case created successfully!');
        navigate(`/cases/${response.data.case_id}`);
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Error creating case: ${error.response.data.message}`);
      } else {
        setMessage('Error creating case: An unexpected error occurred.');
      }
    }
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: '50px' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Create a New Case
      </Typography>
      {message && (
        <Alert severity={message.startsWith('Case created successfully') ? 'success' : 'error'} style={{ marginBottom: '20px' }}>
          {message}
        </Alert>
      )}
      <form onSubmit={handleSubmit}>
        <TextField
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          fullWidth
          margin="normal"
        />
        <FormControl variant="outlined" fullWidth margin="normal">
          <InputLabel>Platform</InputLabel>
          <Select
            name="platform"
            value={formData.platform}
            onChange={handleChange}
            label="Platform"
          >
            <MenuItem value="Linux Machine">Linux Machine</MenuItem>
            {/* Future platforms:
            <MenuItem value="Cisco">Cisco</MenuItem>
            <MenuItem value="Fortigate">Fortigate</MenuItem>
            <MenuItem value="F5">F5</MenuItem>
            */}
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" type="submit" fullWidth style={{ marginTop: '20px' }}>
          Create Case
        </Button>
      </form>
    </Container>
  );
}

export default CreateCase;

