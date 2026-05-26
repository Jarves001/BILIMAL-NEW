import axios from 'axios';
import { auth } from '../lib/firebase';

const api = axios.create({
  baseURL: '/api'
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
      console.error('Failed to get Firebase token in interceptor:', err);
    }
  }
  return config;
});

export default api;
