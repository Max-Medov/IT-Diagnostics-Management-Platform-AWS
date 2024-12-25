import axios from 'axios'; // Import axios

const caseService = axios.create({
  baseURL: process.env.REACT_APP_CASE_SERVICE_URL,
});

caseService.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Retrieve the token from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // Set the Authorization header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default caseService;

