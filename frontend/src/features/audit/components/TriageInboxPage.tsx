import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { triageApi } from '@/api/audit'
import { Claim } from '@/api/claims'
import { useNavigate } from 'react-router-dom'
import { Table, Tag, Button, Typography, Row, Col, Card, Empty, Progress, Space } from 'antd'
import { FilterOutlined, PlusOutlined, ReloadOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import { useAppSelector } from '@/store/hooks'

// Note: Ensure TriageInboxClaim / Claim types match the backend data structure.
// Using mock data formatting compatible with the prototype.

export default function TriageInboxPage() {
  const [triageInbox, setTriageInbox] = useState<Claim[]>([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'ROLE_ADMIN'
  const isBroker = user?.role === 'ROLE_BROKER'

  const loadInbox = async () => {
    try {
      setLoading(true)
      const res = await triageApi.getInbox()
      if (res.data && res.data.items) {
        setTriageInbox(res.data.items)
      }
    } catch (err) {
      // Error handled globally via interceptor
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  const columns = [
    {
      title: 'CLAIM ID',
      dataIndex: 'claim_number',
      key: 'id',
      render: (text: string) => <span className="font-mono text-red-600 font-medium">{text}</span>,
    },
    {
      title: 'INSURED / ENTITY',
      dataIndex: 'incident_location',
      key: 'entity',
      render: (_: any, record: Claim) => <span className="font-medium text-gray-900">{isAdmin ? '***' : (record.incident_location || 'Garrison Industrial Corp.')}</span>,
    },
    {
      title: 'POLICY',
      dataIndex: 'policy_number',
      key: 'policy',
      render: (text: string) => <span className="text-gray-500">{text}</span>,
    },
    {
      title: 'AMOUNT',
      dataIndex: 'claimed_amount',
      key: 'amount',
      render: (amount: number) => <span className="font-mono font-medium">{isAdmin ? '***' : `$${amount?.toLocaleString() || '450,000'}`}</span>,
    },
    {
      title: 'AI RISK SCORE',
      key: 'risk_score',
      render: (_: any, record: Claim) => {
        const score = record.ai_confidence ? Math.round((1 - record.ai_confidence) * 100) : 98;
        const color = score > 80 ? '#dc2626' : score > 50 ? '#ca8a04' : '#64748b';
        return (
          <div className="flex items-center gap-3 w-40">
            <span className="font-mono font-bold text-xs w-8 text-right" style={{ color }}>{score}%</span>
            <Progress percent={score} showInfo={false} size="small" strokeColor={color} trailColor="#f1f5f9" className="m-0" />
          </div>
        )
      }
    },
    {
      title: 'STATUS',
      key: 'status',
      render: (_: any, record: Claim) => {
        const score = record.ai_confidence ? Math.round((1 - record.ai_confidence) * 100) : 98;
        if (score > 80) return <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-red-200 bg-red-50 text-red-600 tracking-wider">FRAUD WARNING</span>;
        if (score > 50) return <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 bg-yellow-50 text-yellow-600 tracking-wider">NEEDS AUDIT</span>;
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 bg-green-50 text-green-600 tracking-wider">VERIFIED</span>;
      }
    },
    {
      title: 'ACTION',
      key: 'action',
      render: (_: any, record: Claim) => (
        <Space onClick={(e) => e.stopPropagation()}>
          {(!isBroker && !isAdmin) && (
            <>
              <Button type="text" size="small" className="text-green-600 hover:bg-green-50" icon={<CheckOutlined />} onClick={() => navigate(`/claims/${record.id}`)}>Approve</Button>
              <Button type="text" size="small" className="text-red-600 hover:bg-red-50" icon={<CloseOutlined />} onClick={() => navigate(`/claims/${record.id}`)}>Reject</Button>
            </>
          )}
          <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/claims/${record.id}`)}>
            View
          </Button>
        </Space>
      )
    }
  ]

  const anomaliesCount = triageInbox.length;
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount}`;
  };
  const totalExposure = triageInbox.reduce((sum, claim) => sum + (claim.claimed_amount || 0), 0);
  const criticalCount = triageInbox.filter(c => {
    const score = c.ai_confidence ? Math.round((1 - c.ai_confidence) * 100) : 98;
    return score > 80;
  }).length;
  const avgScore = triageInbox.length > 0 
    ? Math.round(triageInbox.reduce((sum, c) => sum + (c.ai_confidence ? c.ai_confidence * 100 : 2), 0) / triageInbox.length)
    : 0;
  
  let avgProcessingTime = '0d';
  if (triageInbox.length > 0) {
    const totalMs = triageInbox.reduce((sum, c) => {
      const created = c.created_at ? new Date(c.created_at).getTime() : Date.now();
      return sum + (Date.now() - created);
    }, 0);
    const avgMs = totalMs / triageInbox.length;
    avgProcessingTime = (avgMs / (1000 * 60 * 60 * 24)).toFixed(1) + 'd';
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      {/* Header Area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 m-0">Active Claims Queue</h2>
          <p className="text-gray-500 text-sm mt-1 mb-0">High-priority triage required for {anomaliesCount} anomalies.</p>
        </div>
        <div className="flex gap-3">
          <Button icon={<FilterOutlined />}>Filter Views</Button>
          <Button type="primary" icon={<PlusOutlined />} className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/claims/new')}>New Claim</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="border border-gray-200 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
          <div className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">TOTAL EXPOSURE</div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-gray-900 leading-none">{formatCurrency(totalExposure)}</span>
            {triageInbox.length > 0 && <span className="text-xs font-bold text-red-500 mb-1 flex items-center">↑ 12%</span>}
          </div>
        </Card>
        
        <Card className="border border-gray-200 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
          <div className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">CRITICAL ANOMALIES</div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-red-600 leading-none">{criticalCount}</span>
            <span className="text-xs text-gray-500 mb-1">Requires immediate review</span>
          </div>
        </Card>

        <Card className="border border-gray-200 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
          <div className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">AVG WAIT TIME</div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-gray-900 leading-none">{avgProcessingTime}</span>
            {triageInbox.length > 0 && <span className="text-xs font-bold text-green-500 mb-1 flex items-center">↓ 0.5d</span>}
          </div>
        </Card>

        <Card className="border border-gray-200 shadow-sm" bodyStyle={{ padding: '16px 20px' }}>
          <div className="text-xs font-bold text-gray-500 tracking-wider mb-1 uppercase">AI CONFIDENCE SCORE</div>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-blue-600 leading-none">{avgScore}%</span>
            <div className="flex-1 mb-2 ml-2">
              <Progress percent={avgScore} showInfo={false} size="small" strokeColor="#2563eb" trailColor="#e2e8f0" className="m-0" />
            </div>
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
        <Table 
          columns={columns}
          dataSource={triageInbox}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
          rowClassName={(record, index) => {
             const score = record.ai_confidence ? Math.round((1 - record.ai_confidence) * 100) : 98;
             if (score > 80) return "bg-red-50/30 hover:bg-red-50/50 cursor-pointer transition-colors";
             return "hover:bg-gray-50 cursor-pointer transition-colors";
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span className="text-gray-500">No pending claims in queue</span>}
              >
                <Button type="primary" icon={<ReloadOutlined />} onClick={loadInbox}>
                  Refresh Queue
                </Button>
              </Empty>
            )
          }}
          onRow={(record) => {
            return {
              onClick: () => navigate(`/claims/${record.id}`),
            };
          }}
        />
      </div>
    </div>
  )
}
