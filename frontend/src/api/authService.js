import axios from 'axios';

const authService = axios.create({
  baseURL: process.env.REACT_APP_AUTH_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

authService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Set the Authorization header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default authService;

