import axios from 'axios'; // Import axios

const diagnosticService = axios.create({
  baseURL: process.env.REACT_APP_DIAGNOSTIC_SERVICE_URL || 'http://diagnostic.local',
  headers: {
    'Content-Type': 'application/json',
  },
});

diagnosticService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Set the Authorization header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default diagnosticService;

