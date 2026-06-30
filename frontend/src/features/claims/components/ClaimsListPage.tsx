import React, { useEffect, useState } from 'react'
import { Table, Card, Button, Tag, Select, Space, Typography, Input, Row, Col } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchClaims } from '@/store/slices/claimsSlice'
import { Claim, ClaimStatus } from '@/api/claims'
import dayjs from 'dayjs'

const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  draft:        { color: '#6b7280', label: 'Draft',    bg: '#f3f4f6' },
  submitted:    { color: '#2563eb', label: 'Submitted',  bg: '#eff6ff' },
  under_review: { color: '#f59e0b', label: 'Under Review',  bg: '#fffbeb' },
  ai_processing:{ color: '#7c3aed', label: 'AI Processing',  bg: '#f5f3ff' },
  human_review: { color: '#d97706', label: 'Human Review', bg: '#fef3c7' },
  approved:     { color: '#059669', label: 'Approved',  bg: '#ecfdf5' },
  rejected:     { color: '#dc2626', label: 'Rejected',  bg: '#fef2f2' },
  closed:       { color: '#9ca3af', label: 'Closed',  bg: '#f9fafb' },
}

const TYPE_LABELS: Record<string, string> = {
  auto: '🚗 Auto', health: '🏥 Health', property: '🏠 Property', life: '❤️ Life'
}

export default function ClaimsListPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { list, total, loading } = useAppSelector((s) => s.claims)
  const user = useAppSelector((s) => s.auth.user)
  const isAdmin = user?.role === 'ROLE_ADMIN'
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | undefined>()

  useEffect(() => {
    dispatch(fetchClaims({ page, page_size: 10, status: statusFilter }))
  }, [dispatch, page, statusFilter])

  const columns = [
    {
      title: 'Claim ID', dataIndex: 'claim_number',
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb', fontWeight: 600 }}>{v}</span>
      ),
    },
    {
      title: 'Policy Number', dataIndex: 'policy_number',
      render: (v: string) => <span style={{ color: '#6b7280', fontSize: 12 }}>{v}</span>,
    },
    {
      title: 'Type', dataIndex: 'claim_type',
      render: (v: string) => <span style={{ fontSize: 13 }}>{TYPE_LABELS[v] || v}</span>,
    },
    {
      title: 'Status', dataIndex: 'status',
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] || { color: '#6b7280', label: s, bg: '#f3f4f6' }
        return <Tag style={{ background: cfg.bg, color: cfg.color, fontWeight: 500 }}>{cfg.label}</Tag>
      },
    },
    {
      title: 'Claimed Amount', dataIndex: 'claimed_amount', align: 'right' as const,
      render: (v: number) => {
        if (isAdmin) return <span style={{ fontWeight: 600, color: '#111827' }}>***</span>
        return v
          ? <span style={{ fontWeight: 600, color: '#111827' }}>${v.toLocaleString()}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'Approved Amount', dataIndex: 'approved_amount', align: 'right' as const,
      render: (v: number) => {
        if (isAdmin) return <span style={{ fontWeight: 600, color: '#059669' }}>***</span>
        return v
          ? <span style={{ fontWeight: 600, color: '#059669' }}>${v.toLocaleString()}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>
      },
    },
    {
      title: 'Incident Date', dataIndex: 'incident_date',
      render: (v: string) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{dayjs(v).format('YYYY-MM-DD')}</span>,
    },
    {
      title: 'Action', key: 'action',
      render: (_: unknown, record: Claim) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/claims/${record.id}`)}
          style={{ padding: 0, fontWeight: 500 }}
        >
          View Details →
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ margin: 0, fontWeight: 700, color: '#111827', fontSize: 20 }}>
            Claims
          </div>
          <Typography.Text style={{ color: '#6b7280', fontSize: 13 }}>
            Total {total} claims
          </Typography.Text>
        </div>
        {(user?.role === 'ROLE_BROKER' || user?.role === 'ROLE_ADMIN') && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/claims/new')}
            style={{ borderRadius: 8, fontWeight: 500, height: 36 }}
          >
            New Claim
          </Button>
        )}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            placeholder="Search Claim ID, Policy Number..."
            style={{ width: 260, borderRadius: 8 }}
            size="middle"
          />
          <Select
            placeholder="Filter Status"
            aria-label="Status"
            allowClear
            style={{ width: 140 }}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <Select
            placeholder="Claim Type"
            allowClear
            style={{ width: 130 }}
            options={Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>

        <Table
          columns={columns}
          dataSource={list}
          rowKey="id"
          loading={loading}
          size="middle"
          pagination={{
            current: page,
            total,
            pageSize: 10,
            onChange: setPage,
            showTotal: (t) => `Total ${t} items`,
            showSizeChanger: false,
          }}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => navigate(`/claims/${record.id}`),
          })}
        />
      </Card>
    </div>
  )
}
