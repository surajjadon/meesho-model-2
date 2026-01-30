import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Your API base URL
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  const selectedGstin = localStorage.getItem('selectedGstin');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (selectedGstin) {
    config.headers['x-gstin'] = selectedGstin;
  }
  return config;
});

export default api;