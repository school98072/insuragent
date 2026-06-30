import apiClient from './index'

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { email: string; password: string; full_name: string; phone?: string }
export interface TokenResponse { access_token: string; refresh_token: string; token_type: string }
export interface UserProfile {
  id: string; email: string; full_name: string; phone?: string;
  role: string; is_active: boolean; created_at: string
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<TokenResponse>('/auth/login', data),

  register: (data: RegisterRequest) =>
    apiClient.post<UserProfile>('/auth/register', data),

  getMe: () =>
    apiClient.get<UserProfile>('/auth/me'),
}
