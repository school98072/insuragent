import apiClient from './index'

export interface ChatRequest {
  message: string; claim_id?: string; session_id?: string
}

export interface ChatResponse {
  response: string; session_id: string
}

export interface KnowledgeResult {
  score: number; text: string; source: string; category?: string
}

const getDynamicKeys = () => {
  const gemini = localStorage.getItem('GEMINI_API_KEY')
  const anthropic = localStorage.getItem('ANTHROPIC_API_KEY')
  const keys: Record<string, string> = {}
  if (gemini) keys['GEMINI_API_KEY'] = gemini
  if (anthropic) keys['ANTHROPIC_API_KEY'] = anthropic
  return Object.keys(keys).length > 0 ? keys : undefined
}

const getDynamicKeysParams = () => {
  const gemini = localStorage.getItem('GEMINI_API_KEY')
  const anthropic = localStorage.getItem('ANTHROPIC_API_KEY')
  const params: Record<string, string> = {}
  if (gemini) params['gemini_api_key'] = gemini
  if (anthropic) params['anthropic_api_key'] = anthropic
  return params
}

export const aiApi = {
  chat: (data: ChatRequest) =>
    apiClient.post<ChatResponse>('/ai/chat', { ...data, dynamic_keys: getDynamicKeys() }),

  analyzeClaim: (claimId: string) =>
    apiClient.post(`/ai/analyze/${claimId}`, { claim_id: claimId, dynamic_keys: getDynamicKeys() }),

  searchKnowledge: (query: string, topK = 5) =>
    apiClient.get<{ results: KnowledgeResult[] }>('/ai/knowledge/search', {
      params: { query, top_k: topK, ...getDynamicKeysParams() }
    }),
}
