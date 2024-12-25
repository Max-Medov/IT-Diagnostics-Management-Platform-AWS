import React, { useEffect, useState } from 'react';
import caseService from '../api/caseService';
import { Container, Typography, Button, List, ListItem, ListItemText, Divider, Alert } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';

function Dashboard() {
  const [cases, setCases] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  let isAdmin = false;
  if (token) {
    const decoded = jwt_decode(token);
    isAdmin = decoded.is_admin;
  }

  useEffect(() => {
    let isMounted = true;
    const fetchCases = async () => {
      try {
        const response = await caseService.get('/cases');
        if (isMounted) {
          setCases(response.data);
        }
      } catch (error) {
        if (isMounted) {
          if (error.response && error.response.data) {
            setMessage(`Error fetching cases: ${error.response.data.message}`);
          } else {
            setMessage('Error fetching cases.');
          }
        }
      }
    };

    fetchCases();
    const intervalId = setInterval(fetchCases, 10000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const handleBackToAdmin = () => {
    if (isAdmin) {
      navigate('/admin-dashboard');
    }
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '50px' }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Dashboard
      </Typography>
      {message && (
        <Alert severity="error" style={{ marginBottom: '20px' }}>
          {message}
        </Alert>
      )}
      {isAdmin && (
        <Button variant="outlined" color="primary" onClick={handleBackToAdmin} style={{ marginBottom: '20px' }}>
          Back to Admin Dashboard
        </Button>
      )}
      <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/create-case"
        style={{ marginBottom: '20px', marginLeft: isAdmin ? '20px' : '0px' }}
      >
        Create a New Case
      </Button>
      <List>
        {cases.map((caseItem) => (
          <div key={caseItem.id}>
            <ListItem button component={Link} to={`/cases/${caseItem.id}`}>
              <ListItemText
                primary={caseItem.description}
                secondary={`Analysis: ${caseItem.analysis || 'Pending Analysis'}`}
              />
            </ListItem>
            <Divider />
          </div>
        ))}
      </List>
    </Container>
  );
}

export default Dashboard;

