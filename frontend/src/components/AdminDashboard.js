import React, { useEffect, useState } from 'react';
import caseService from '../api/caseService';
import { Container, Typography, Table, TableHead, TableRow, TableCell, TableBody, Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../api/authService';

function AdminDashboard() {
  const [cases, setCases] = useState([]);
  const [message, setMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const response = await caseService.get('/admin/cases');
        setCases(response.data);
      } catch (error) {
        if (error.response && error.response.data) {
          setMessage(`Error fetching admin cases: ${error.response.data.message}`);
        } else {
          setMessage('Error fetching admin cases.');
        }
      }
    };
    fetchCases();
  }, []);

  const handleCreateAdminClick = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewAdminUsername('');
    setNewAdminPassword('');
  };

  const handleCreateAdminSubmit = async () => {
    if (!newAdminUsername || !newAdminPassword) {
      setMessage('Please enter a username and password for the new admin user.');
      return;
    }

    try {
      const response = await authService.post('/admin/create_admin_user', {
        username: newAdminUsername,
        password: newAdminPassword
      });
      if (response.status === 201) {
        setMessage('Admin user created successfully.');
        handleCloseDialog();
      }
    } catch (error) {
      if (error.response && error.response.data) {
        setMessage(`Error creating admin user: ${error.response.data.message}`);
      } else {
        setMessage('Error creating admin user: An unexpected error occurred.');
      }
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Container maxWidth="md" style={{ marginTop: '50px' }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard - All Cases
      </Typography>
      {message && <Alert severity={message.startsWith('Error') ? 'error' : 'success'} style={{ marginBottom: '20px' }}>{message}</Alert>}

      <Button variant="outlined" color="primary" onClick={handleCreateAdminClick} style={{ marginBottom: '20px', marginRight: '10px' }}>
        Create Admin User
      </Button>
      <Button variant="outlined" color="secondary" onClick={handleBackToDashboard} style={{ marginBottom: '20px' }}>
        Back to Dashboard
      </Button>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Case ID</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Platform</TableCell>
            <TableCell>User</TableCell>
            <TableCell>Analysis</TableCell>
            <TableCell>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {cases.map(c => (
            <TableRow key={c.id}>
              <TableCell>{c.id}</TableCell>
              <TableCell>{c.description}</TableCell>
              <TableCell>{c.platform}</TableCell>
              <TableCell>{c.username}</TableCell>
              <TableCell>{c.analysis || 'No analysis'}</TableCell>
              <TableCell>
                <Link to={`/cases/${c.id}`}>View</Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Create a New Admin User</DialogTitle>
        <DialogContent>
          <TextField
            label="New Admin Username"
            value={newAdminUsername}
            onChange={(e) => setNewAdminUsername(e.target.value)}
            fullWidth
            margin="normal"
          />
          <TextField
            label="New Admin Password"
            type="password"
            value={newAdminPassword}
            onChange={(e) => setNewAdminPassword(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleCreateAdminSubmit} color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminDashboard;

