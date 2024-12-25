import React from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Button } from '@mui/material';
import jwt_decode from 'jwt-decode';

function Navbar() {
  const token = localStorage.getItem('token');
  let isAdmin = false;
  if (token) {
    const decoded = jwt_decode(token);
    isAdmin = decoded.is_admin;
  }

  return (
    <AppBar position="static">
      <Toolbar>
        <Button color="inherit" component={Link} to="/dashboard">
          Dashboard
        </Button>
        <Button color="inherit" component={Link} to="/create-case">
          Create Case
        </Button>
        {isAdmin && (
          <Button color="inherit" component={Link} to="/admin-dashboard">
            Admin Dashboard
          </Button>
        )}
        <Button color="inherit" component={Link} to="/logout">
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;

