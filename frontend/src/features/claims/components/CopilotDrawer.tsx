import React, { useState, useRef, useEffect } from 'react'
import { Drawer, Input, Button, Avatar, Spin } from 'antd'
import { RobotOutlined, UserOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons'
import { aiApi } from '@/api/ai'
import { mockAiChat } from '@/api/mockData'
import { useAppSelector } from '@/store/hooks'

interface Message { role: 'user' | 'assistant'; content: string; time: string; actionable?: boolean }

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

export default function CopilotDrawer({ 
  visible, 
  onClose, 
  claimId 
}: { 
  visible: boolean; 
  onClose: () => void; 
  claimId: string 
}) {
  const user = useAppSelector((s) => s.auth.user)
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (user?.role === 'ROLE_BROKER') {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your Legal & Claims Expert Chatbot. How can I assist you with this policy\'s terms, past case references, or suggest auxiliary materials to upload for a smoother pre-approval?',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      ])
    } else if (user?.role === 'ROLE_ADMIN') {
      setMessages([
        {
          role: 'assistant',
          content: 'System Admin Protocol Active. I can provide compliance insights, reasoning log explanations, and system health status. Note: PII is masked by default.',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      ])
    } else {
      setMessages([
        {
          role: 'assistant',
          content: 'Adjuster Protocol Active. How can I assist you in verifying anomalies, cross-referencing metadata, or checking historical fraud patterns?',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        }
      ])
    }
  }, [user?.role])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    }
  }, [messages, visible])

  const send = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    const userMsg: Message = {
      role: 'user',
      content: msg,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await aiApi.chat({
        message: msg,
        claim_id: claimId,
        session_id: sessionId
      })
      if (!sessionId) setSessionId(res.data.session_id)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } catch {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 800))
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: mockAiChat(msg),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={visible}
      width={380}
      closable={false}
      bodyStyle={{ display: 'flex', flexDirection: 'column', padding: 0, background: '#111827' }}
    >
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2d3748]">
        <div className="flex items-center gap-2">
          <RobotOutlined className="text-blue-500 text-lg" />
          <div>
            <div className="text-gray-300 font-bold text-sm">Expert Chatbot</div>
            <div className="text-gray-500 text-[10px] font-mono">Legal & Claims Assistant</div>
          </div>
        </div>
        <CloseOutlined className="text-gray-500 hover:text-white cursor-pointer" onClick={onClose} />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user'
          return (
            <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}>
              <div className="text-gray-500 text-[10px] tracking-widest uppercase mb-1">
                {isUser ? (user?.full_name || 'ADJUSTER') : 'SYSTEM'} • {msg.time}
              </div>
              <div className="flex gap-2">
                <div className={`ant-pro-chat-list-item-content p-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-l border border-blue-500' 
                    : 'bg-transparent text-gray-300 border border-[#2d3748] rounded-r'
                }`}>
                  {renderMarkdown(msg.content)}
                </div>
              </div>
              
              {/* Actionable buttons if system asks a question */}
              {msg.actionable && !isUser && (
                <div className="flex gap-2 mt-2 ml-1">
                  <button className="bg-transparent border border-[#2d3748] text-gray-400 hover:text-white hover:border-gray-500 px-3 py-1 rounded text-[11px] uppercase tracking-wider transition-colors">
                    Request new photos
                  </button>
                  <button className="bg-transparent border border-red-900/50 text-red-500 hover:bg-red-900/20 px-3 py-1 rounded text-[11px] uppercase tracking-wider transition-colors">
                    Deny Claim
                  </button>
                </div>
              )}
            </div>
          )
        })}
        
        {loading && (
          <div className="flex flex-col items-start gap-1">
            <div className="text-gray-500 text-[10px] tracking-widest uppercase mb-1">
              SYSTEM • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="bg-transparent border border-[#2d3748] p-3 text-[13px] text-gray-300 rounded-r flex items-center gap-2">
              <Spin size="small" /> Processing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#111827] border-t border-[#2d3748]">
        <div className="flex items-center border border-gray-300 rounded bg-white px-2 focus-within:border-blue-500 transition-colors">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={() => send()}
            placeholder="Ask anything about this claim..."
            disabled={loading}
            className="bg-transparent text-black border-none shadow-none focus:shadow-none h-10 px-2"
            style={{ color: '#000' }}
          />
          <Button
            type="text"
            icon={<SendOutlined />}
            onClick={() => send()}
            aria-label="send"
            disabled={!input.trim() || loading}
            style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            className={`text-lg p-2 ${input.trim() ? 'text-blue-500 cursor-pointer' : 'text-gray-600'}`}
          />
        </div>
      </div>
    </Drawer>
  )
}
