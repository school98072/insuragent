import { describe, it, expect } from 'vitest'
import claimsReducer, { clearCurrent, addMockClaim, fetchClaims, fetchClaim, createClaim, submitClaim } from '../../src/store/slices/claimsSlice'

describe('claimsSlice reducer', () => {
  const initialClaimsState = {
    list: [],
    total: 0,
    current: null,
    loading: false,
    error: null,
  }

  it('should return initial state', () => {
    expect(claimsReducer(undefined, { type: 'unknown' })).toEqual(initialClaimsState)
  })

  it('should handle clearCurrent', () => {
    const state = { ...initialClaimsState, current: { id: '1' } as any }
    expect(claimsReducer(state, clearCurrent())).toEqual(initialClaimsState)
  })

  it('should handle addMockClaim', () => {
    const mockClaim = { id: 'new-claim', claim_number: 'CLM-123' } as any
    const state = claimsReducer(initialClaimsState, addMockClaim(mockClaim))
    expect(state.list).toEqual([mockClaim])
    expect(state.total).toBe(1)
    expect(state.current).toEqual(mockClaim)
  })

  it('should handle fetchClaims.pending', () => {
    const state = claimsReducer(initialClaimsState, { type: fetchClaims.pending.type })
    expect(state.loading).toBe(true)
    expect(state.error).toBeNull()
  })

  it('should handle fetchClaims.fulfilled', () => {
    const mockPayload = { items: [{ id: '1' } as any], total: 1 }
    const state = claimsReducer(initialClaimsState, {
      type: fetchClaims.fulfilled.type,
      payload: mockPayload
    })
    expect(state.loading).toBe(false)
    expect(state.list).toEqual(mockPayload.items)
    expect(state.total).toBe(1)
  })

  it('should handle fetchClaim.fulfilled', () => {
    const mockClaim = { id: '1' } as any
    const state = claimsReducer(initialClaimsState, {
      type: fetchClaim.fulfilled.type,
      payload: mockClaim
    })
    expect(state.current).toEqual(mockClaim)
  })

  it('should handle createClaim.fulfilled', () => {
    const mockClaim = { id: 'new' } as any
    const state = claimsReducer(initialClaimsState, {
      type: createClaim.fulfilled.type,
      payload: mockClaim
    })
    expect(state.list).toEqual([mockClaim])
    expect(state.total).toBe(1)
    expect(state.current).toEqual(mockClaim)
  })
})
