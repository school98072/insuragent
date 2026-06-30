import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchClaim } from '@/store/slices/claimsSlice'
import { aiApi } from '@/api/ai'
import { mockClaimById, mockAiChat } from '@/api/mockData'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Button, Spin, message, Upload, Input, InputNumber, Modal, Tooltip } from 'antd'
import { ArrowLeftOutlined, RobotOutlined, PlayCircleOutlined, WarningOutlined, FileTextOutlined, CheckCircleOutlined, InfoCircleOutlined, PictureOutlined, PlusOutlined, EditOutlined, SaveOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'
import { claimsApi } from '@/api/claims'
import { triageApi } from '@/api/audit'
import CopilotDrawer from './CopilotDrawer'

const { TextArea } = Input;

function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const content = headerMatch[2];
      const headerStyle = {
        margin: '8px 0',
        fontWeight: 600,
        fontSize: level === 1 ? '1.5em' : level === 2 ? '1.3em' : '1.1em',
        color: '#f8fafc'
      };
      return React.createElement(`h${level}`, { key: lineIdx, style: headerStyle }, renderInlineMarkdown(content));
    }
    
    const listMatch = line.match(/^([\*\-]|(\d+\.))\s+(.*)$/);
    if (listMatch) {
      const marker = listMatch[1];
      const content = listMatch[3];
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: 6, paddingLeft: 12, marginBottom: 4 }}>
          <span style={{ color: '#94a3b8' }}>{marker.match(/\d+/) ? marker : '•'}</span>
          <span>{renderInlineMarkdown(content)}</span>
        </div>
      );
    }
    
    return (
      <div key={lineIdx} style={{ marginBottom: 6, minHeight: 18 }}>
        {renderInlineMarkdown(line)}
      </div>
    );
  });
}

export default function ClaimDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const claim = useAppSelector((s) => s.claims.current)
  const user = useAppSelector((s) => s.auth.user)
  const isBroker = user?.role === 'ROLE_BROKER'
  const isAdmin = user?.role === 'ROLE_ADMIN'
  const isAdjuster = !isBroker && !isAdmin
  const { i18n } = useTranslation()

  const [aiStatus, setAiStatus] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})

  // Audit Modal State
  const [auditModalOpen, setAuditModalOpen] = useState(false)
  const [auditAction, setAuditAction] = useState<'approved' | 'rejected'>('approved')
  const [auditNotes, setAuditNotes] = useState('')
  const [approvedAmount, setApprovedAmount] = useState<number>(0)

  // Tab State for left sidebar
  const [leftTab, setLeftTab] = useState<'protocol' | 'chat'>('protocol')

  // Integrated Chatbot State
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<string | undefined>()
  const chatBottomRef = React.useRef<HTMLDivElement>(null)

  const displayClaim = claim ?? (id ? mockClaimById(id) : undefined)

  // Initialize chatbot messages when claim changes or user changes
  useEffect(() => {
    if (!displayClaim) return;
    if (displayClaim.ai_metadata?.chat_history && Array.isArray(displayClaim.ai_metadata.chat_history)) {
      setChatMessages(displayClaim.ai_metadata.chat_history);
    } else {
      const initialText = 
        user?.role === 'ROLE_BROKER' 
          ? "Hello! I am your Legal & Claims Expert Chatbot. How can I assist you with this policy's terms, past case references, or suggest auxiliary materials to upload for a smoother pre-approval?"
          : user?.role === 'ROLE_ADMIN'
          ? "System Admin Protocol Active. I can provide compliance insights, reasoning log explanations, and system health status. Note: PII is masked by default."
          : "Adjuster Protocol Active. How can I assist you in verifying anomalies, cross-referencing metadata, or checking historical fraud patterns?";
      setChatMessages([
        {
          role: 'assistant',
          content: initialText,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      ]);
    }
  }, [displayClaim?.id])

  // Scroll to bottom of chat
  useEffect(() => {
    if (leftTab === 'chat') {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [chatMessages, leftTab])

  const sendChatMessage = async (text?: string) => {
    const msg = text || chatInput.trim()
    if (!msg || chatLoading || !id) return
    const userMsg = {
      role: 'user',
      content: msg,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await aiApi.chat({
        message: msg,
        claim_id: id,
        session_id: chatSessionId
      })
      if (!chatSessionId) setChatSessionId(res.data.session_id)
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } catch {
      await new Promise(r => setTimeout(r, 600))
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: mockAiChat(msg),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } finally {
      setChatLoading(false)
    }
  }

  // Polling logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (displayClaim?.status === 'ai_processing') {
      interval = setInterval(() => {
        if (id) dispatch(fetchClaim(id))
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [displayClaim?.status, id, dispatch])

  useEffect(() => {
    if (id) dispatch(fetchClaim(id))
  }, [dispatch, id])

  const triggerAI = async () => {
    if (!id) return
    try {
      await aiApi.analyzeClaim(id)
      message.success('AI analysis started')
      dispatch(fetchClaim(id))
    } catch { 
      message.error('Failed to start AI analysis')
    }
  }

  const handleSave = async () => {
    if (!id) return;
    try {
      await claimsApi.update(id, editData);
      message.success('Claim updated successfully');
      setIsEditing(false);
      dispatch(fetchClaim(id));
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Update failed');
    }
  }

  const handleSubmitClaim = async () => {
    if (!id) return;
    try {
      await claimsApi.submit(id);
      message.success('Claim submitted successfully');
      dispatch(fetchClaim(id));
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to submit claim');
    }
  }

  const handleAssignClaim = async () => {
    if (!id) return;
    try {
      await triageApi.assign(id);
      message.success('Claim successfully assigned to you');
      dispatch(fetchClaim(id));
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Failed to assign claim');
    }
  }

  const handleAuditSubmit = async () => {
    if (!id || !auditNotes.trim()) {
      message.error('Adjuster notes are strictly required for compliance.')
      return;
    }
    try {
      await triageApi.decide(id, {
        decision: auditAction === 'approved' ? 'approve' : 'reject',
        approved_amount: auditAction === 'approved' ? approvedAmount : 0,
        notes: auditNotes
      });
      message.success(`Claim ${auditAction === 'approved' ? 'approved' : 'rejected'} successfully`);
      setAuditModalOpen(false);
      setAuditNotes('');
      dispatch(fetchClaim(id));
    } catch (err: any) {
      message.error(err.response?.data?.detail || `Failed to ${auditAction} claim`);
    }
  }

  const startEditing = () => {
    if (!displayClaim) return;
    setEditData({
      incident_location: displayClaim.incident_location || '',
      claimed_amount: displayClaim.claimed_amount || 0,
      incident_description: displayClaim.incident_description || '',
    });
    setIsEditing(true);
  }

  if (!displayClaim) return (
    <div className="flex items-center justify-center h-full">
      <Spin size="large" />
    </div>
  )

  const formatCurrency = (amount: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
    } catch {
      return `$${amount}`
    }
  }

  const uploadProps = {
    customRequest: async (options: any) => {
      const { file, onSuccess, onError } = options;
      if (!id) return;
      try {
        await claimsApi.uploadDocument(id, 'other', file as File);
        onSuccess?.("ok");
        message.success('Document uploaded successfully');
        dispatch(fetchClaim(id));
      } catch (err: any) {
        onError?.(err);
        message.error(err.response?.data?.detail || 'Failed to upload document');
      }
    },
    showUploadList: false,
  };

  const isCritical = displayClaim.status === 'human_review' || displayClaim.status === 'rejected' || displayClaim.ai_decision === 'reject' || (displayClaim.ai_confidence && displayClaim.ai_confidence < 0.2)
  const canEdit = isBroker && (displayClaim.status === 'draft' || displayClaim.status === 'submitted' || displayClaim.status === 'ai_processing')
  const needsAudit = isAdjuster && ['submitted', 'under_review', 'human_review'].includes(displayClaim.status)
  const canAssign = isAdjuster && ['submitted', 'human_review'].includes(displayClaim.status) && !displayClaim.adjuster_id

  // Document Checklist Logic
  const getRequiredDocs = (type: string) => {
    switch (type.toLowerCase()) {
      case 'auto': return [
        { name: 'Police Report / Accident Report', keywords: ['police', 'report', 'accident', '事故', '公安', '認定', '认定', '协议书', '協議書'] },
        { name: 'Repair Estimate / Invoice', keywords: ['repair', 'estimate', 'invoice', 'receipt', 'bill', '维修', '估价', '发票', '發票', '帳單', '账单', '收据', '收據'] },
        { name: 'Scene Photos', keywords: ['image', 'photo', 'site', 'damage', 'pic', 'jpg', 'png', 'jpeg', '照片', '现场', '現場', '圖片', '图片'] }
      ];
      case 'health': return [
        { name: 'Medical Invoice / Bill', keywords: ['invoice', 'medical', 'bill', 'receipt', '医疗', '醫療', '发票', '發票', '收据', '收據', '帳單', '账单'] },
        { name: 'Diagnosis Report / Discharge Summary', keywords: ['diagnosis', 'report', 'discharge', 'summary', '诊断', '診斷', '出院', '小结', '小結', '病历', '病歷'] }
      ];
      case 'property': return [
        { name: 'Damage Photos', keywords: ['image', 'photo', 'damage', 'jpg', 'png', '照片', '现场', '現場', '圖片', '图片'] },
        { name: 'Purchase Receipt / Estimate', keywords: ['receipt', 'invoice', 'purchase', 'estimate', '发票', '發票', '收据', '收據', '估价', '估價', '帳單', '账单'] }
      ];
      case 'life': return [
        { name: 'Death Certificate / Medical Report', keywords: ['death', 'certificate', 'medical', 'report', '死亡', '证明', '證明', '医学', '醫學', '报告', '報告'] },
        { name: 'Beneficiary ID', keywords: ['id', 'identity', 'passport', '身份', '身份证', '身份證', '護照', '护照'] }
      ];
      default: return [
        { name: 'Claim Form', keywords: ['claim', 'form', '表', '表单'] },
        { name: 'Supporting Evidence', keywords: ['evidence', 'photo', 'invoice', 'report', '证明', '照片', '发票', '报告'] }
      ];
    }
  }

  const requiredDocs = getRequiredDocs(displayClaim.claim_type || 'auto')
  const uploadedFileNames = (displayClaim.documents || []).map((d: any) => d.file_name.toLowerCase())
  
  const checkDocSatisfied = (keywords: string[]) => {
    return uploadedFileNames.some((name: string) => keywords.some(k => name.includes(k)))
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div 
            className="flex items-center gap-2 text-gray-900 font-medium cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => navigate('/audit')}
          >
            <ArrowLeftOutlined /> Back to Queue
          </div>
          <div className="w-[1px] h-6 bg-gray-200"></div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Claim {displayClaim.claim_number}</h2>
          {isCritical ? (
            <div className="border border-red-200 bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold tracking-wider flex items-center gap-1">
              <WarningOutlined /> FRAUD WARNING
            </div>
          ) : displayClaim.status === 'approved' ? (
            <div className="border border-green-200 bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold tracking-wider flex items-center gap-1">
              <CheckCircleOutlined /> CLEARED
            </div>
          ) : (
            <div className="border border-gray-200 bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs font-bold tracking-wider flex items-center gap-1 uppercase">
              {displayClaim.status.replace('_', ' ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isEditing ? (
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} className="bg-green-600 font-medium">
              Save Changes
            </Button>
          ) : (
            canEdit && (
              <Button icon={<EditOutlined />} onClick={startEditing} className="font-medium">
                Edit Claim
              </Button>
            )
          )}
          
          {isBroker && displayClaim.status === 'draft' && (
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />} 
              onClick={handleSubmitClaim}
              className="bg-green-600 font-medium"
            >
              Submit Claim
            </Button>
          )}

          {canAssign && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleAssignClaim}
              className="bg-indigo-600 font-medium animate-pulse border-none"
            >
              Assign to Me
            </Button>
          )}

          <Button 
            icon={<RobotOutlined />} 
            onClick={() => { setDrawerOpen(true); setLeftTab('chat'); }}
            className="font-medium"
          >
            AI Copilot (Expert Chatbot)
          </Button>
          
          {needsAudit && (
            <>
              <Button 
                className="bg-green-50 text-green-600 border-green-200 hover:bg-green-100 font-medium"
                icon={<CheckOutlined />}
                onClick={() => { 
                  setAuditAction('approved'); 
                  setApprovedAmount(displayClaim.claimed_amount || 0); 
                  setAuditModalOpen(true); 
                }}
              >
                Approve
              </Button>
              <Button 
                danger
                className="font-medium"
                icon={<CloseOutlined />}
                onClick={() => { 
                  setAuditAction('rejected'); 
                  setApprovedAmount(0); 
                  setAuditModalOpen(true); 
                }}
              >
                Reject
              </Button>
            </>
          )}

          {displayClaim.status !== 'approved' && displayClaim.status !== 'rejected' && displayClaim.status !== 'closed' && (
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />} 
              onClick={triggerAI} 
              loading={displayClaim.status === 'ai_processing'}
              className="bg-blue-600 font-medium"
            >
              {isBroker ? 'Run Pre-approval' : 'Run AI Analysis'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Tabbed AI Protocol & Expert Chatbot */}
        <div className="w-[400px] bg-[#f8fafc] border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
            <div
              role="button"
              onClick={() => setLeftTab('protocol')}
              className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
                leftTab === 'protocol'
                  ? 'border-blue-600 text-blue-600 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              AI Protocol
            </div>
            <div
              role="button"
              onClick={() => setLeftTab('chat')}
              className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase transition-colors border-b-2 cursor-pointer ${
                leftTab === 'chat'
                  ? 'border-blue-600 text-blue-600 bg-white font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Expert Chatbot
            </div>
          </div>

          {leftTab === 'protocol' ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-slate-500 text-xs font-bold tracking-widest uppercase">
                  {isBroker ? 'Pre-approval Checklist' : 'AI Analysis Protocol'}
                </span>
                {displayClaim.ai_confidence !== undefined && displayClaim.ai_confidence !== null && (
                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Confidence: {(displayClaim.ai_confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-3 block">DETECTED ANOMALIES</span>
                
                {displayClaim.ai_metadata?.anomalies ? (
                  displayClaim.ai_metadata.anomalies.map((anomaly: any, idx: number) => (
                    <div key={idx} className="bg-white border border-red-200 rounded-sm p-3 mb-3 relative overflow-hidden group hover:border-red-400 shadow-sm transition-colors cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 group-hover:bg-red-500 transition-colors"></div>
                      <div className="flex items-start gap-2 text-red-600 mb-1">
                        <WarningOutlined className="mt-0.5" />
                        <span className="font-bold text-sm text-slate-800">{anomaly.title || 'Anomaly Detected'}</span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed ml-6 m-0">
                        {anomaly.description || anomaly}
                      </p>
                    </div>
                  ))
                ) : displayClaim.ai_reasoning ? (
                  <div className="text-slate-400 italic text-sm">No anomalies detected by AI.</div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded p-4 text-center">
                    <div className="text-slate-500 text-sm mb-3">
                      {isBroker ? 'No pre-approval scan performed yet.' : 'No AI analysis run yet.'}
                    </div>
                    <Button 
                      type="primary" 
                      icon={<PlayCircleOutlined />} 
                      onClick={triggerAI} 
                      loading={displayClaim.status === 'ai_processing'}
                      className="bg-blue-600 font-medium"
                    >
                      {isBroker ? 'Run Pre-approval' : 'Run AI Analysis'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">REASONING LOGS</span>
                  {displayClaim.status === 'ai_processing' && (
                    <span className="border border-blue-200 text-blue-600 bg-blue-50 text-[9px] px-1 rounded uppercase tracking-wider font-semibold animate-pulse">LIVE</span>
                  )}
                </div>
                <div className="flex-1 font-mono text-[11px] leading-relaxed text-slate-700 bg-white border border-slate-200 p-3 rounded whitespace-pre-wrap shadow-inner overflow-y-auto min-h-[150px]">
                  {displayClaim.ai_reasoning ? (
                    displayClaim.ai_reasoning
                  ) : displayClaim.status === 'ai_processing' ? (
                    <div className="text-blue-500">Processing... Please wait while the AI analyzes the claim.</div>
                  ) : (
                    <div className="text-slate-400 italic">Waiting for AI agent initialization...</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.role === 'user'
                  return (
                    <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
                      <div className="text-slate-500 text-[9px] tracking-widest uppercase mb-0.5">
                        {isUser ? (user?.full_name || 'USER') : 'SYSTEM'} • {msg.time}
                      </div>
                      <div className={`ant-pro-chat-list-item-content p-3 text-[13px] leading-relaxed rounded whitespace-pre-wrap ${
                        isUser 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`}>
                        {renderMarkdown(msg.content)}
                      </div>
                    </div>
                  )
                })}
                {chatLoading && (
                  <div className="flex flex-col items-start gap-1">
                    <div className="text-slate-500 text-[9px] tracking-widest uppercase mb-0.5">
                      SYSTEM
                    </div>
                    <div className="bg-slate-800 border border-slate-700 p-3 text-[13px] text-slate-300 rounded-r flex items-center gap-2">
                      <Spin size="small" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
                <div className="flex items-center border border-slate-700 rounded bg-slate-800 px-2 focus-within:border-blue-500 transition-colors">
                  <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onPressEnter={() => sendChatMessage()}
                    placeholder="Ask Expert Chatbot..."
                    disabled={chatLoading}
                    bordered={false}
                    className="bg-transparent text-slate-100 placeholder-slate-500 focus:shadow-none h-10 px-1"
                    style={{ color: '#fff' }}
                  />
                  <Button
                    type="text"
                    icon={<SendOutlined />}
                    onClick={() => sendChatMessage()}
                    aria-label="submit-chat"
                    disabled={!chatInput.trim() || chatLoading}
                    className={`${chatInput.trim() ? 'text-blue-500' : 'text-slate-600'}`}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Claim Data (Light) */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="max-w-4xl mx-auto p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Claim Details</h1>
            
            {/* Grid Form */}
            <div className="border border-gray-200 rounded mb-8">
              <div className="grid grid-cols-2">
                <div className="p-4 border-b border-r border-gray-200">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">POLICY NUMBER</div>
                  <div className="text-gray-900 font-mono font-semibold text-blue-600">{displayClaim.policy_number}</div>
                </div>
                <div className="p-4 border-b border-gray-200">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">INCIDENT DATE</div>
                  <div className="text-gray-900">{dayjs(displayClaim.incident_date).format('MMM D, YYYY')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-b border-gray-200">
                <div className="p-4 border-r border-gray-200">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">REPORTED DATE</div>
                  <div className="text-gray-900">{dayjs(displayClaim.created_at).format('MMM D, YYYY')}</div>
                </div>
                <div className="p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">LOCATION</div>
                  {isEditing ? (
                    <Input 
                      value={editData.incident_location} 
                      onChange={e => setEditData({...editData, incident_location: e.target.value})} 
                      className="mt-1"
                    />
                  ) : (
                    <div className="text-gray-900">
                      {isAdmin && displayClaim.incident_location ? '*** (Protected PII)' : (displayClaim.incident_location || 'Not provided')}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-4 border-r border-gray-200">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">CLAIMED AMOUNT</div>
                  {isEditing ? (
                    <InputNumber 
                      value={editData.claimed_amount} 
                      onChange={val => setEditData({...editData, claimed_amount: val})} 
                      className="mt-1 w-full text-lg"
                      prefix="$"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-900">{isAdmin ? '***' : formatCurrency(displayClaim.claimed_amount || 0)}</div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">APPROVED AMOUNT</div>
                  <div className="text-2xl font-bold text-red-600">{isAdmin ? '***' : formatCurrency(displayClaim.approved_amount || 0)}</div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">INCIDENT DESCRIPTION</div>
              {isEditing ? (
                <TextArea 
                  rows={4}
                  value={editData.incident_description}
                  onChange={e => setEditData({...editData, incident_description: e.target.value})}
                  className="mt-1"
                />
              ) : (
                <div className="text-sm text-gray-700 leading-relaxed border border-gray-200 p-4 rounded bg-gray-50 whitespace-pre-wrap">
                  {displayClaim.incident_description || 'No description provided.'}
                </div>
              )}
            </div>

            {/* Adjuster Notes Section if present */}
            {/* If the claim was rejected or approved, and has notes, show them */}
            {(displayClaim.status === 'approved' || displayClaim.status === 'rejected') && (
              <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded p-4">
                <div className="text-[10px] font-bold text-yellow-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <InfoCircleOutlined /> ADJUSTER AUDIT NOTES
                </div>
                <div className="text-sm text-yellow-900 font-mono whitespace-pre-wrap">
                  {displayClaim.adjuster_notes || (displayClaim.status === 'approved' ? 'Claim verified. Documents are authentic and within policy bounds.' : 'Claim rejected due to material misrepresentation.')}
                </div>
              </div>
            )}

            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-bold text-gray-900 m-0">Documents</h3>
              </div>

              {/* Document Checklist */}
              <div className="mb-4 bg-blue-50 border border-blue-100 p-4 rounded">
                <div className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mb-3">Required Documents Checklist</div>
                <div className="flex flex-col gap-2">
                  {requiredDocs.map((req, i) => {
                    const isSatisfied = checkDocSatisfied(req.keywords)
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {isSatisfied ? <CheckCircleOutlined className="text-green-500" /> : <CloseCircleOutlined className="text-red-500" />}
                        <span className={isSatisfied ? "text-gray-700" : "text-gray-500"}>{req.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {isBroker && (
                <div className="mb-4">
                  <Upload.Dragger {...uploadProps} className="bg-slate-50 hover:bg-slate-100 transition-colors rounded text-center">
                    <p className="ant-upload-drag-icon text-blue-500 text-3xl mb-2">
                      <PictureOutlined />
                    </p>
                    <p className="ant-upload-text text-sm font-bold text-slate-700">Drag & Drop files here, or click to browse</p>
                    <p className="ant-upload-hint text-xs text-slate-500">Supports PDF, PNG, JPG, JPEG (Max 10MB)</p>
                  </Upload.Dragger>
                </div>
              )}

              <div className="border border-gray-200 rounded flex flex-col">
                {displayClaim.documents && displayClaim.documents.length > 0 ? (
                  displayClaim.documents.map((doc: any) => (
                    <div 
                      key={doc.id} 
                      onClick={() => window.open(`/uploads/${displayClaim.id}/${encodeURIComponent(doc.file_name)}`, '_blank')}
                      className="p-3 border-b border-gray-200 flex items-center gap-3 hover:bg-gray-50 cursor-pointer last:border-b-0"
                    >
                      {doc.mime_type?.startsWith('image') || doc.file_name?.match(/\.(jpg|jpeg|png)$/i) ? <PictureOutlined className="text-blue-500 text-xl" /> : <FileTextOutlined className="text-gray-400 text-xl" />}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">{doc.file_name}</div>
                        <div className="text-xs text-gray-500">{((doc.file_size || 0) / 1024 / 1024).toFixed(2)} MB • Uploaded {dayjs(doc.created_at).format('MMM D')}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm italic">
                    No documents uploaded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CopilotDrawer 
        visible={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        claimId={id!} 
      />

      {/* Adjuster Compliance Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <WarningOutlined /> Audit Compliance Check
          </div>
        }
        open={auditModalOpen}
        onCancel={() => setAuditModalOpen(false)}
        onOk={handleAuditSubmit}
        okText={`Confirm ${auditAction === 'approved' ? 'Approval' : 'Rejection'}`}
        okButtonProps={{ 
          disabled: auditNotes.trim().length < 10, 
          className: auditAction === 'approved' ? 'bg-green-600 border-none text-white' : 'bg-red-600 text-white border-none' 
        }}
        cancelButtonProps={{ disabled: false }}
      >
        <div className="my-4">
          <p className="text-sm text-gray-600 mb-4">
            You are about to <strong className={auditAction === 'approved' ? 'text-green-600' : 'text-red-600'}>{auditAction === 'approved' ? 'APPROVE' : 'REJECT'}</strong> this claim.
            In accordance with regulatory compliance, you must provide a detailed justification for this decision. This entry will be permanently logged.
          </p>

          {auditAction === 'approved' && (
            <div className="mb-4">
              <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Approved Amount (USD)</div>
              <InputNumber
                value={approvedAmount}
                onChange={(val) => setApprovedAmount(val || 0)}
                className="w-full text-lg"
                prefix="$"
                min={0}
              />
            </div>
          )}

          <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Adjuster Notes (Min 10 chars)</div>
          <TextArea
            rows={4}
            placeholder="Document your verification steps, references to AI anomalies, and final rationale..."
            value={auditNotes}
            onChange={(e) => setAuditNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  )
}
