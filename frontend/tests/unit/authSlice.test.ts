import { describe, it, expect, beforeEach, beforeAll } from 'vitest'

// 1. Mock localStorage first before importing authSlice
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString() },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} }
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

// 2. Now import variables dynamically inside describe or after the mock
let authSliceModule: any;

describe('authSlice reducer', () => {
  beforeAll(async () => {
    authSliceModule = await import('../../src/store/slices/authSlice')
  })

  beforeEach(() => {
    localStorage.clear()
  })

  it('should return the initial state', () => {
    expect(authSliceModule.default(undefined, { type: 'unknown' })).toEqual({
      user: null,
      token: null,
      loading: false,
      error: null,
    })
  })

  it('should handle clearError', () => {
    const initialState = { user: null, token: null, loading: false, error: 'some error' }
    expect(authSliceModule.default(initialState, authSliceModule.clearError())).toEqual({
      user: null,
      token: null,
      loading: false,
      error: null,
    })
  })

  it('should handle demoLogin for admin', () => {
    const adminUser = authSliceModule.DEMO_USERS['admin@insurance.ai']
    const state = authSliceModule.default(undefined, authSliceModule.demoLogin(adminUser))
    
    expect(state.token).toBe('demo-token-admin')
    expect(state.user).toEqual(adminUser)
    expect(localStorage.getItem('access_token')).toBe('demo-token-admin')
  })

  it('should handle demoLogin for customer', () => {
    const customerUser = authSliceModule.DEMO_USERS['customer@insurance.ai']
    const state = authSliceModule.default(undefined, authSliceModule.demoLogin(customerUser))
    
    expect(state.token).toBe('demo-token-customer')
    expect(state.user).toEqual(customerUser)
    expect(localStorage.getItem('access_token')).toBe('demo-token-customer')
  })

  it('should handle logout', () => {
    const loggedInState = {
      user: authSliceModule.DEMO_USERS['adjuster@insurance.ai'],
      token: 'some-token',
      loading: false,
      error: null
    }
    const state = authSliceModule.default(loggedInState, { type: authSliceModule.logout.fulfilled.type })
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })
})
