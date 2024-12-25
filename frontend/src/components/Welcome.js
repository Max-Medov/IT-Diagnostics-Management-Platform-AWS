import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Button } from '@mui/material';

function Welcome() {
  return (
    <Container maxWidth="sm" style={{ textAlign: 'center', marginTop: '50px' }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Welcome to the IT Diagnostics Management Platform
      </Typography>
      <Typography variant="body1" gutterBottom>
        This platform allows IT professionals to create diagnostic cases, collect system diagnostics, and analyze results to troubleshoot issues efficiently.
      </Typography>
      <Button variant="contained" color="primary" component={Link} to="/login" style={{ marginRight: '10px' }}>
        Login
      </Button>
      <Button variant="outlined" color="primary" component={Link} to="/register">
        Register
      </Button>
    </Container>
  );
}

export default Welcome;

