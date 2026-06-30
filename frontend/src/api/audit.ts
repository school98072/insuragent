import apiClient from './index'
import type { Claim, ClaimListResponse } from './claims'

export interface AuditDecision {
  decision: 'approve' | 'reject' | 'request_info'
  approved_amount?: number
  notes: string
}

export const triageApi = {
  getInbox: (params?: { page?: number; page_size?: number }) =>
    apiClient.get<ClaimListResponse>('/audit/queue', { params }),

  assign: (claimId: string) =>
    apiClient.post(`/audit/${claimId}/assign`),

  decide: (claimId: string, decision: AuditDecision) =>
    apiClient.post<Claim>(`/audit/${claimId}/decide`, decision),

  getSystemLogs: () =>
    apiClient.get<{ logs: any[] }>('/audit/logs'),
}
