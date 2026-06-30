import apiClient from './index'

export type ClaimStatus =
  | 'draft' | 'submitted' | 'under_review' | 'ai_processing'
  | 'human_review' | 'approved' | 'rejected' | 'closed'

export type ClaimType = 'auto' | 'health' | 'property' | 'life'

export interface Claim {
  id: string; claim_number: string; policy_number: string
  claim_type: ClaimType; status: ClaimStatus
  incident_date: string; incident_location?: string; incident_description?: string
  claimed_amount?: number; approved_amount?: number
  ai_decision?: string; ai_confidence?: number; ai_reasoning?: string; ai_metadata?: any
  created_at: string; updated_at: string; submitted_at?: string; resolved_at?: string
  documents: ClaimDocument[]
  adjuster_id?: string; broker_id?: string; adjuster_notes?: string
}

export interface ClaimDocument {
  id: string; claim_id: string; doc_type: string
  file_name: string; file_size?: number; mime_type?: string; created_at: string
}

export interface CreateClaimRequest {
  policy_number: string; claim_type: ClaimType
  incident_date: string; incident_location?: string
  incident_description?: string; claimed_amount?: number
}

export interface ClaimListResponse {
  items: Claim[]; total: number; page: number; page_size: number
}

export const claimsApi = {
  create: (data: CreateClaimRequest) =>
    apiClient.post<Claim>('/claims', data),

  list: (params?: { page?: number; page_size?: number; status?: ClaimStatus }) =>
    apiClient.get<ClaimListResponse>('/claims', { params }),

  get: (id: string) =>
    apiClient.get<Claim>(`/claims/${id}`),

  update: (id: string, data: Partial<CreateClaimRequest> & { status?: ClaimStatus; adjuster_notes?: string; approved_amount?: number }) =>
    apiClient.patch<Claim>(`/claims/${id}`, data),

  submit: (id: string) =>
    apiClient.post<Claim>(`/claims/${id}/submit`),

  uploadDocument: (id: string, docType: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    form.append('doc_type', docType)
    return apiClient.post(`/claims/${id}/documents?doc_type=${encodeURIComponent(docType)}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
