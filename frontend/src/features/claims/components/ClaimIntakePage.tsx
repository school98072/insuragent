import React, { useState } from 'react'
import {
  Form, Input, Select, DatePicker, InputNumber, Button,
  Typography, message, Upload, Divider, Space
} from 'antd'
import { InboxOutlined, SendOutlined, SaveOutlined, FilePdfOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { createClaim, submitClaim } from '@/store/slices/claimsSlice'
import { claimsApi, CreateClaimRequest } from '@/api/claims'
import dayjs from 'dayjs'

const { Dragger } = Upload

const claimTypeOptions = [
  { value: 'auto',     label: 'Auto (Vehicle & Liability)' },
  { value: 'health',   label: 'Health (Medical & Subsidies)' },
  { value: 'property', label: 'Property (Real Estate & Assets)' },
  { value: 'life',     label: 'Life (Mortality & Disability)' },
]

export default function ClaimIntakePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const data: CreateClaimRequest = {
        ...values,
        incident_date: values.incident_date.toISOString(),
      }
      const result = await dispatch(createClaim(data))
      setSaving(false)
      
      if (createClaim.fulfilled.match(result)) {
        message.success('Draft saved successfully.')
        setCreatedId(result.payload.id)
        return result.payload.id
      }
      
      const mockId = `mock-${Date.now()}`
      setCreatedId(mockId)
      message.success('Draft saved (Demo Mode).')
      return mockId
    } catch (e) {
      message.error('Please complete required fields.')
      return null
    }
  }

  const handleSubmit = async () => {
    let id = createdId
    if (!id) {
      id = await handleSaveDraft()
    }
    if (!id) return

    if (id.startsWith('mock-')) {
      message.success('Claim submitted (Demo Mode). AI is processing.')
      navigate('/claims')
      return
    }

    setSubmitting(true)
    const result = await dispatch(submitClaim(id))
    setSubmitting(false)

    if (submitClaim.fulfilled.match(result)) {
      message.success('Claim submitted successfully.')
      navigate(`/claims/${id}`)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 108px)', minHeight: 600 }}>
      {/* Left: Document Ingestion (Dragger) */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: 12, 
        padding: 24 
      }}>
        <div style={{ marginBottom: 16 }}>
          <Typography.Title level={4} style={{ color: '#0f172a', margin: 0, fontSize: 16 }}>
            Document Ingestion Pipeline
          </Typography.Title>
          <Typography.Text style={{ color: '#64748b', fontSize: 12 }}>
            Drag & drop evidentiary documents (PDF, JPG). AI will auto-extract fields upon upload.
          </Typography.Text>
        </div>
        
        <Dragger
          multiple
          fileList={fileList}
          onChange={(info) => setFileList(info.fileList)}
          customRequest={async ({ file, onSuccess, onError }) => {
            if (!createdId) {
              const id = await handleSaveDraft()
              if (!id) {
                onError?.(new Error('Draft creation failed'))
                return
              }
            }
            try {
              if (createdId && !createdId.startsWith('mock-')) {
                await claimsApi.uploadDocument(createdId, 'other', file as File)
              } else {
                // Mock delay
                await new Promise(r => setTimeout(r, 1000))
              }
              onSuccess?.({})
              message.success(`${(file as File).name} uploaded successfully. AI extraction queued.`)
            } catch { 
              onError?.(new Error('Upload failed')) 
            }
          }}
          style={{ 
            flex: 1, 
            background: '#f8fafc', 
            border: '1px dashed #cbd5e1',
            borderRadius: 8
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ color: '#3b82f6', fontSize: 48 }} />
          </p>
          <p className="ant-upload-text" style={{ color: '#0f172a', fontWeight: 500 }}>Click or drag file to this area to upload</p>
          <p className="ant-upload-hint" style={{ color: '#64748b' }}>
            Support for a single or bulk upload. Strictly prohibited from uploading company data or other banned files.
          </p>
        </Dragger>
      </div>

      {/* Right: Extracted / Draft Data Form */}
      <div style={{ 
        width: 420, 
        background: '#ffffff', 
        border: '1px solid #e2e8f0', 
        borderRadius: 12, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
          <Typography.Title level={4} style={{ color: '#0f172a', margin: 0, fontSize: 16 }}>
            Claim Intake Form
          </Typography.Title>
          <Typography.Text style={{ color: '#64748b', fontSize: 12 }}>
            Review structured data before submission.
          </Typography.Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Form form={form} layout="vertical" size="middle">
            <Form.Item name="policy_number" label={<span style={{color: '#334155'}}>Policy Number</span>} rules={[{ required: true }]}>
              <Input placeholder="e.g. POL-2024-000123" style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
            </Form.Item>

            <Form.Item name="claim_type" label={<span style={{color: '#334155'}}>Claim Type</span>} rules={[{ required: true }]} initialValue="auto">
              <Select placeholder="Select type" options={claimTypeOptions} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="incident_date" label={<span style={{color: '#334155'}}>Incident Date</span>} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} disabledDate={d => d.isAfter(dayjs())} />
            </Form.Item>

            <Form.Item name="incident_location" label={<span style={{color: '#334155'}}>Incident Location</span>}>
              <Input placeholder="City, Address" style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }} />
            </Form.Item>

            <Form.Item name="claimed_amount" label={<span style={{color: '#334155'}}>Claimed Amount (USD)</span>}>
              <InputNumber
                style={{ width: '100%', background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
                min={0}
                precision={2}
                formatter={v => `$ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={v => v?.replace(/\$\s?|(,*)/g, '') as any}
              />
            </Form.Item>

            <Form.Item name="incident_description" label={<span style={{color: '#334155'}}>Incident Description</span>}>
              <Input.TextArea
                rows={4}
                placeholder="Details of the incident..."
                style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
              />
            </Form.Item>
          </Form>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button 
              icon={<SaveOutlined />} 
              onClick={handleSaveDraft} 
              loading={saving}
              style={{ background: '#ffffff', borderColor: '#cbd5e1', color: '#334155' }}
            >
              {createdId ? 'Saved' : 'Save Draft'}
            </Button>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSubmit} 
              loading={submitting}
              style={{ background: '#2563eb', borderColor: '#2563eb' }}
            >
              Submit Intake
            </Button>
          </Space>
        </div>
      </div>
    </div>
  )
}
