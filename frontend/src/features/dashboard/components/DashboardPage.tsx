import React, { useEffect } from 'react'
import { Row, Col, Card, Table, Tag, Typography, Progress } from 'antd'
import {
  FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
  WarningOutlined, RiseOutlined, RobotOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchClaims } from '@/store/slices/claimsSlice'
import { ClaimStatus } from '@/api/claims'
import dayjs from 'dayjs'

const STATUS_CONFIG: Record<ClaimStatus, { color: string; label: string; bg: string }> = {
  draft:        { color: '#666666', label: 'Draft',    bg: '#f0f0f0' },
  submitted:    { color: '#00008f', label: 'Submitted',  bg: '#e6e6f4' },
  under_review: { color: '#d97706', label: 'Under Review',  bg: '#fff8e6' },
  ai_processing:{ color: '#3b82f6', label: 'AI Processing',  bg: '#ebf4ff' },
  human_review: { color: '#d97706', label: 'Human Review', bg: '#fff8e6' },
  approved:     { color: '#16a34a', label: 'Approved',  bg: '#e8f6ec' },
  rejected:     { color: '#e50000', label: 'Rejected',  bg: '#fce6e6' },
  closed:       { color: '#888888', label: 'Closed',  bg: '#f4f4f4' },
}

interface StatCardProps {
  title: string; value: number; icon: React.ReactNode
  color: string; bg: string; suffix?: string; trend?: string
}

function StatCard({ title, value, icon, color, bg, suffix, trend }: StatCardProps) {
  return (
    <Card bodyStyle={{ padding: '20px 24px' }} style={{ borderRadius: 8, border: '1px solid #d9d9d9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#666666', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#333333', lineHeight: 1 }}>
            {value.toLocaleString()}
            {suffix && <span style={{ fontSize: 16, fontWeight: 400, color: '#888888', marginLeft: 4 }}>{suffix}</span>}
          </div>
          {trend && (
            <div style={{ fontSize: 12, color: '#16a34a', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <RiseOutlined /> {trend}
            </div>
          )}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color, border: `1px solid ${color}33`
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

export default function DashboardPage() {
  const dispatch = useAppDispatch()
  const { list, total, loading } = useAppSelector((s) => s.claims)
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'ROLE_ADMIN'

  useEffect(() => { dispatch(fetchClaims({ page: 1, page_size: 10 })) }, [dispatch])

  const approved = list.filter(c => c.status === 'approved').length
  const pending = list.filter(c => ['submitted', 'under_review', 'ai_processing', 'human_review'].includes(c.status)).length
  const rejected = list.filter(c => c.status === 'rejected').length
  const autoRate = total > 0 ? Math.round((approved / total) * 100) : 0

  const columns = [
    {
      title: 'Claim ID', dataIndex: 'claim_number', key: 'claim_number',
      render: (v: string) => <span style={{ fontFamily: 'Arial', fontSize: 13, color: '#00008f', fontWeight: 600 }}>{v}</span>,
    },
    { title: 'Type', dataIndex: 'claim_type', key: 'type',
      render: (v: string) => <Tag style={{ background: '#f4f4f4', color: '#333333', border: '1px solid #d9d9d9' }}>{v}</Tag> },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (s: ClaimStatus) => {
        const cfg = STATUS_CONFIG[s]
        return <Tag style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>{cfg.label}</Tag>
      },
    },
    { title: 'Amount', dataIndex: 'claimed_amount',
      render: (v: number) => v ? <span style={{ fontWeight: 600, color: '#333' }}>{isAdmin ? '*** (PII)' : `¥${v.toLocaleString()}`}</span> : <span style={{ color: '#888' }}>-</span> },
    { title: 'AI Decision', dataIndex: 'ai_decision',
      render: (v: string) => v
        ? <Tag style={{ background: v === 'approve' ? '#e8f6ec' : v === 'reject' ? '#fce6e6' : '#fff8e6', color: v === 'approve' ? '#16a34a' : v === 'reject' ? '#e50000' : '#d97706', border: 'none' }}>{v === 'approve' ? '✓ Approved' : v === 'reject' ? '✗ Rejected' : '→ Manual Audit'}</Tag>
        : <span style={{ color: '#d9d9d9' }}>—</span> },
    { title: 'Submitted', dataIndex: 'created_at',
      render: (v: string) => <span style={{ color: '#666666', fontSize: 13 }}>{dayjs(v).format('MMM DD, HH:mm')}</span> },
  ]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good Morning'
    if (h < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #00008f 0%, #103184 100%)',
        borderRadius: 8, padding: '24px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: 24 }}>
            {greeting()}, {user?.full_name?.split(' ')[0] || (isAdmin ? 'System Admin' : 'Adjuster')}
          </Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, marginTop: 8, display: 'block' }}>
            You have <strong style={{ color: '#fff', fontSize: 18 }}>{pending}</strong> claims awaiting your review today.
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>STP Rate</div>
            <div style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{autoRate}%</div>
          </div>
          <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 48 }}><RobotOutlined /></div>
        </div>
      </div>

      {/* Stat cards */}
      <Row gutter={[20, 20]} style={{ flexShrink: 0 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Total Claims" value={total} icon={<FileTextOutlined />}
            color="#00008f" bg="#e6e6f4" trend="YTD +12%" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Pending Review" value={pending} icon={<ClockCircleOutlined />}
            color="#d97706" bg="#fff8e6" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Auto-Approved" value={approved} icon={<CheckCircleOutlined />}
            color="#16a34a" bg="#e8f6ec" trend="Avg Time 4.2s" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard title="Rejected" value={rejected} icon={<WarningOutlined />}
            color="#e50000" bg="#fce6e6" />
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ flex: 1, minHeight: 0 }}>
        {/* Recent claims table */}
        <Col xs={24} xl={16} style={{ height: '100%' }}>
          <Card 
            title="Recent Claims" 
            extra={<a href="/claims" style={{ fontSize: 14, color: '#00008f', fontWeight: 600 }}>View All →</a>}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            bodyStyle={{ padding: 0, flex: 1, overflow: 'auto' }}
          >
            <Table
              columns={columns}
              dataSource={list}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="middle"
              style={{ borderTop: '1px solid #f0f0f0' }}
            />
          </Card>
        </Col>

        {/* Status breakdown */}
        <Col xs={24} xl={8} style={{ height: '100%' }}>
          <Card title="Status Breakdown" style={{ height: '100%', display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const count = list.filter(c => c.status === status).length
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                if (count === 0) return null; // Only show active statuses
                return (
                  <div key={status}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: '#333333', fontWeight: 500 }}>{cfg.label}</span>
                      <span style={{ fontSize: 13, color: '#666666', fontWeight: 500 }}>{count} ({pct}%)</span>
                    </div>
                    <Progress
                      percent={pct}
                      showInfo={false}
                      strokeColor={cfg.color}
                      trailColor='#f0f0f0'
                      size="small"
                    />
                  </div>
                )
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
