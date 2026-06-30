import React, { useState } from 'react'
import { Card, Input, Button, Typography, Select, message, Spin } from 'antd'
import { UserOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { demoLogin, DEMO_USERS, login } from '@/store/slices/authSlice'
import { motion } from 'framer-motion'
import logoSrc from '@/assets/logo.svg'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const handleManualLogin = async () => {
    if (!email || !password) {
      message.error('Please enter email and password')
      return
    }
    setLoading(true)
    setTimeout(async () => {
      setLoading(false)
      const resultAction = await dispatch(login({ email: email.trim(), password: password.trim() }))
      if (login.fulfilled.match(resultAction)) {
        navigate('/dashboard')
      } else {
        message.error(resultAction.payload as string || 'Login failed')
      }
    }, 800)
  }

  const handleDemoSelect = (roleKey: string) => {
    setSelectedRole(roleKey)
    const targetUser = DEMO_USERS[roleKey]
    if (!targetUser) return

    setLoading(true)
    setEmail('')
    setPassword('')

    const fullEmail = targetUser.email
    let currentEmail = ''
    let i = 0

    // 0.6s typing effect for email
    const interval = setInterval(() => {
      currentEmail += fullEmail[i]
      setEmail(currentEmail)
      i++
      if (i >= fullEmail.length) {
        clearInterval(interval)
        setPassword('••••••••••••')
        
        // Brief pause to show the filled form before auto-submitting
        setTimeout(async () => {
          setLoading(false)
          const resultAction = await dispatch(login({ email: targetUser.email.trim(), password: targetUser.password.trim() }))
          if (login.fulfilled.match(resultAction)) {
            navigate('/dashboard')
          } else {
            message.error(resultAction.payload as string || 'Login failed')
          }
        }, 300)
      }
    }, 600 / fullEmail.length)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: 24,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-20%', right: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(16,185,129,0.03) 0%, rgba(0,0,0,0) 70%)',
        borderRadius: '50%', pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 420, zIndex: 10 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src={logoSrc} alt="Insuragent Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <Typography.Title level={3} style={{ color: '#0f172a', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Insurance Gateway
          </Typography.Title>
          <Typography.Text style={{ color: '#475569', fontSize: 14 }}>
            Enterprise AI Claims & Subrogation
          </Typography.Text>
        </div>

        <Card
          bordered={false}
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 16,
            boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}
          styles={{ body: { padding: '32px 24px' } }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Identity Triage
              </div>
              <Select
                placeholder="Select Corporate Identity"
                style={{ width: '100%' }}
                size="large"
                value={selectedRole}
                onChange={handleDemoSelect}
                disabled={loading}
                options={[
                  { label: 'System Admin', value: 'admin@kaggle.com' },
                  { label: 'Loss Adjuster', value: 'adjuster@kaggle.com' },
                  { label: 'Insurance Broker', value: 'broker@kaggle.com' },
                ]}
              />
            </div>

            <div style={{ position: 'relative', margin: '8px 0' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid rgba(0,0,0,0.08)' }} />
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <span style={{ background: '#ffffff', padding: '0 12px', fontSize: 12, color: '#64748b' }}>
                  OR MANUAL LOGIN
                </span>
              </div>
            </div>

            <div>
              <Input
                size="large"
                prefix={<UserOutlined style={{ color: '#64748b' }} />}
                placeholder="Enterprise Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', marginBottom: 16 }}
              />
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: '#64748b' }} />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ background: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a' }}
                onPressEnter={handleManualLogin}
              />
            </div>

            <Button
              type="primary"
              size="large"
              block
              onClick={handleManualLogin}
              loading={loading}
              style={{
                background: '#2563eb',
                borderColor: '#2563eb',
                height: 44,
                fontWeight: 600,
                marginTop: 8
              }}
            >
              Sign In To Dashboard
            </Button>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 24, color: '#64748b', fontSize: 12 }}>
          © 2026 Insurance AI Systems. All rights reserved.
        </div>
      </motion.div>
    </div>
  )
}
