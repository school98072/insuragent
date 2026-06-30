import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authApi, UserProfile } from '@/api/auth'

interface AuthState {
  user: UserProfile | null
  token: string | null
  loading: boolean
  error: string | null
}

const storedToken = localStorage.getItem('access_token')
const storedUser = localStorage.getItem('demo_user')

const initialState: AuthState = {
  user: storedUser ? JSON.parse(storedUser) : null,
  token: storedToken,
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials)
      const { access_token, refresh_token } = response.data
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      const me = await authApi.getMe()
      return { token: access_token, user: me.data }
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.detail) {
          return rejectWithValue(err.response.data.detail)
      }
      return rejectWithValue('Invalid email or password')
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
})

// Demo users for frontend-only testing (no backend needed)
export const DEMO_USERS: Record<string, UserProfile & { password: string }> = {
  'admin@kaggle.com': {
    id: 'demo-admin', email: 'admin@kaggle.com', full_name: 'System Admin',
    role: 'ROLE_ADMIN', is_active: true,
    created_at: new Date().toISOString(), password: 'AdminPassword123',
  },
  'adjuster@kaggle.com': {
    id: 'demo-adjuster', email: 'adjuster@kaggle.com', full_name: 'Loss Adjuster',
    role: 'ROLE_ADJUSTER', is_active: true,
    created_at: new Date().toISOString(), password: 'AdjusterPassword123',
  },
  'broker@kaggle.com': {
    id: 'demo-broker', email: 'broker@kaggle.com', full_name: 'Broker Desk',
    role: 'ROLE_BROKER', is_active: true,
    created_at: new Date().toISOString(), password: 'BrokerPassword123',
  },
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null },
    demoLogin: (state, action: PayloadAction<UserProfile>) => {
      const token = `demo-token-${action.payload.role}`
      localStorage.setItem('access_token', token)
      localStorage.setItem('demo_user', JSON.stringify(action.payload))
      state.token = token
      state.user = action.payload
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.user = action.payload.user
        localStorage.setItem('demo_user', JSON.stringify(action.payload.user))
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || action.error.message || 'Login failed'
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.token = null
        localStorage.removeItem('demo_user')
      })
  },
})

export const { clearError, demoLogin } = authSlice.actions
export default authSlice.reducer
