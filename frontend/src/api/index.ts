/// <reference types="vite/client" />
import axios from 'axios'
import { message, notification } from 'antd'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (status === 400) {
        message.warning(data.detail || 'Invalid request parameters');
      } else if (status === 401) {
        message.error('Session expired');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setTimeout(() => { window.location.href = '/login'; }, 2000);
      } else if (status === 403) {
        message.error('Access Denied: You do not have permission to perform this action.', 3);
        // Do not redirect for 403, just block action.
      } else if (status === 404) {
        message.error('Requested resource not found');
      } else if (status >= 500) {
        notification.error({
          message: 'System Error',
          description: 'Internal system error or AI Agent failure. Please try again later.',
        });
      }
    } else {
      message.error('Network error or server is unreachable');
    }
    return Promise.reject(error);
  }
)

export default apiClient
