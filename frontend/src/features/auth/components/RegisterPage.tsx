import React from 'react'
import { Form, Input, Button, Typography, message, Select } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { UserOutlined, LockOutlined, PhoneOutlined, MailOutlined } from '@ant-design/icons'
import { authApi } from '@/api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()

  const onFinish = async (values: { email: string; password: string; full_name: string; phone?: string }) => {
    try {
      await authApi.register(values)
      message.success('注册成功，请登录')
      navigate('/login')
    } catch (err: any) {
      message.error(err.response?.data?.detail || '注册失败，请重试')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        {/* Top gradient bar */}
        <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🛡</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>智能理赔系统</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Insurance AI Platform</div>
            </div>
          </div>
          <Typography.Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>创建账号</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>填写信息完成注册</Typography.Text>
        </div>

        {/* Form */}
        <div style={{ padding: '32px 32px 28px' }}>
          <Form form={form} onFinish={onFinish} layout="vertical" size="large" requiredMark={false}>
            <Form.Item name="full_name" label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>姓名</span>} rules={[{ required: true, message: '请输入姓名' }]}>
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="张三" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="email" label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>邮箱</span>} rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="your@email.com" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="phone" label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>手机号（选填）</span>}>
              <Input prefix={<PhoneOutlined style={{ color: '#9ca3af' }} />} placeholder="13800138000" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item name="password" label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>密码</span>} rules={[{ required: true, min: 8, message: '密码至少8位' }]}>
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="至少 8 位字符" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item
              name="confirm"
              label={<span style={{ fontWeight: 500, color: '#374151', fontSize: 13 }}>确认密码</span>}
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="再次输入密码" style={{ borderRadius: 8 }} />
            </Form.Item>
            <Form.Item style={{ marginTop: 4 }}>
              <Button type="primary" htmlType="submit" block style={{ height: 44, borderRadius: 8, fontWeight: 600, fontSize: 15 }}>
                注册账号
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
            已有账号？
            <Link to="/login" style={{ color: '#2563eb', fontWeight: 500, marginLeft: 4 }}>立即登录</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
