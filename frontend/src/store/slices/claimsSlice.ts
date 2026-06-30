import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { claimsApi, Claim, ClaimListResponse, CreateClaimRequest, ClaimStatus } from '@/api/claims'
import { MOCK_CLAIMS, mockClaimsList, mockClaimById } from '@/api/mockData'

interface ClaimsState {
  list: Claim[]
  total: number
  current: Claim | null
  loading: boolean
  error: string | null
}

const initialState: ClaimsState = {
  list: [], total: 0, current: null, loading: false, error: null,
}

export const fetchClaims = createAsyncThunk(
  'claims/fetchAll',
  async (params?: { page?: number; page_size?: number; status?: ClaimStatus }) => {
    const response = await claimsApi.list(params)
    return response.data
  }
)

export const fetchClaim = createAsyncThunk('claims/fetchOne', async (id: string) => {
  const response = await claimsApi.get(id)
  return response.data
})

export const createClaim = createAsyncThunk(
  'claims/create',
  async (data: CreateClaimRequest) => {
    const response = await claimsApi.create(data)
    return response.data
  }
)

export const submitClaim = createAsyncThunk('claims/submit', async (id: string) => {
  const response = await claimsApi.submit(id)
  return response.data
})

const claimsSlice = createSlice({
  name: 'claims',
  initialState,
  reducers: {
    clearCurrent: (state) => { state.current = null },
    // Allow injecting a newly-created mock claim into the list
    addMockClaim: (state, action: PayloadAction<Claim>) => {
      state.list.unshift(action.payload)
      state.total += 1
      state.current = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClaims.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchClaims.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.items
        state.total = action.payload.total
      })
      .addCase(fetchClaims.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch claims'
      })
      .addCase(fetchClaim.fulfilled, (state, action) => { state.current = action.payload })
      .addCase(fetchClaim.rejected, (state) => { state.current = null })
      .addCase(createClaim.fulfilled, (state, action) => {
        state.list.unshift(action.payload)
        state.total += 1
        state.current = action.payload
      })
      .addCase(submitClaim.fulfilled, (state, action) => {
        state.current = action.payload
        const idx = state.list.findIndex(c => c.id === action.payload.id)
        if (idx >= 0) state.list[idx] = action.payload
      })
  },
})

export const { clearCurrent, addMockClaim } = claimsSlice.actions
export default claimsSlice.reducer
