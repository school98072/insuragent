import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Input, Dropdown, Avatar, Badge, Popover, Drawer, Modal, Divider, List, Switch, Radio, Tag, message, theme as antTheme } from 'antd'
import type { MenuProps } from 'antd'
import {
  InboxOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BarChartOutlined,
  BellOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  BulbOutlined,
  KeyOutlined,
  BookOutlined,
  DashboardOutlined
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import logoSrc from '@/assets/logo.svg'
import adminAvatar from '@/assets/admin.png'
import adjusterAvatar from '@/assets/adjuster.png'
import brokerAvatar from '@/assets/broker.png'

const { Header, Sider, Content } = Layout

// Role-specific notifications data
const roleNotifications = {
  'ROLE_BROKER': [
    { title: 'Pre-approval Unlocked', desc: 'Brokers now have access to request instant AI pre-approvals on all claims.', time: '5 mins ago' },
    { title: 'New Document Ingestion', desc: 'Evidentiary scan model updated to v1.2 for faster PDF extraction.', time: '1 hour ago' },
    { title: 'System Status', desc: 'All Insuragent portal interfaces are fully operational.', time: '1 day ago' },
  ],
  'ROLE_ADJUSTER': [
    { title: 'Queue Update', desc: '2 claims have been flagged as pending review and need human assessment.', time: '2 mins ago' },
    { title: 'Notes Rule Enforced', desc: 'Compliance requires at least 10 chars in adjuster notes for all decision actions.', time: '1 hour ago' },
    { title: 'Audit Threshold Alert', desc: 'Claims exceeding $10,000 will require secondary admin visibility reviews.', time: '1 day ago' },
  ],
  'ROLE_ADMIN': [
    { title: 'System Trace Active', desc: 'Security audit logs pipeline is listening for active token changes.', time: '1 min ago' },
    { title: 'Regression Run Complete', desc: 'All 35 autonomous regression test steps completed with 100% success.', time: '10 mins ago' },
    { title: 'Permissions Synced', desc: 'FastAPI claims route access has been successfully granted to ROLE_ADMIN.', time: '25 mins ago' },
  ],
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [helpVisible, setHelpVisible] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [themeMode, setThemeMode] = useState('light')
  const [accentColor, setAccentColor] = useState('blue')
  const [lang, setLang] = useState('en')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('GEMINI_API_KEY') || '')

  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const { token } = antTheme.useToken()

  const handleLogout = () => {
    dispatch(logout()).then(() => navigate('/login'))
  }

  const role = user?.role || 'ROLE_BROKER'

  const allMenuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER', 'ROLE_BROKER'] },
    { key: '/audit', icon: <InboxOutlined />, label: 'Claims Queue', roles: ['ROLE_ADJUSTER', 'ROLE_BROKER', 'ROLE_ADMIN'] },
    { key: '/risk-analysis', icon: <SafetyCertificateOutlined />, label: 'Risk Analysis', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER'] },
    { key: '/claims', icon: <FileSearchOutlined />, label: 'Claims', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER', 'ROLE_BROKER'] },
    { key: '/knowledge', icon: <BookOutlined />, label: 'Knowledge Base', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER'] },
    { key: '/network', icon: <TeamOutlined />, label: 'Adjuster Network', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER'] },
    { key: '/reporting', icon: <BarChartOutlined />, label: 'System Reporting & BI', roles: ['ROLE_ADMIN', 'ROLE_ADJUSTER', 'ROLE_BROKER'] },
    { key: '/system-logs', icon: <SafetyCertificateOutlined />, label: 'System Logs', roles: ['ROLE_ADMIN'] },
  ]

  const menuItems = allMenuItems.filter(item => item.roles.includes(role))

  const userMenu: MenuProps = {
    items: [
      {
        key: 'info',
        label: (
          <div className="flex flex-col px-1 py-1 cursor-default">
            <span className="font-bold text-gray-900 text-sm">{user?.email || 'User'}</span>
            <span className="text-xs text-gray-500 font-mono mt-0.5">{role}</span>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        onClick: () => setSettingsVisible(true)
      },
      { key: 'logout', label: 'Logout', onClick: handleLogout },
    ],
  }

  const avatarMap: Record<string, string> = {
    'ROLE_ADMIN': adminAvatar,
    'ROLE_ADJUSTER': adjusterAvatar,
    'ROLE_BROKER': brokerAvatar
  }
  const currentAvatar = avatarMap[role] || brokerAvatar;

  const selectedKey = menuItems.find(item => location.pathname.startsWith(item.key))?.key || '/dashboard'

  // Render role-specific help guidelines in English
  const renderHelpContent = () => {
    switch (role) {
      case 'ROLE_BROKER':
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 items-start">
              <BulbOutlined className="text-blue-500 text-lg mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-900 text-sm m-0">Core Operational Purpose</h4>
                <p className="text-blue-700 text-xs mt-1 mb-0 leading-relaxed">
                  As an <strong>Insurance Broker</strong>, your primary responsibilities are claim intake, gathering evidence documentation (police reports, repair receipts, photos), and requesting initial AI-assisted pre-approvals to accelerate the claim triage lifecycle.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <KeyOutlined className="text-gray-400" /> Account Authorization & Limits
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3">
                  <span className="text-emerald-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Authorized Actions</span>
                  <ul className="text-emerald-700 text-xs pl-4 list-disc space-y-1">
                    <li>Create, modify, and save claim drafts</li>
                    <li>Ingest evidentiary files (images/PDFs)</li>
                    <li>Submit claims to queue for review</li>
                    <li>Request AI Pre-approval analysis</li>
                    <li>Consult the Legal & Process Copilot</li>
                  </ul>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-md p-3">
                  <span className="text-rose-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Restricted Actions</span>
                  <ul className="text-rose-700 text-xs pl-4 list-disc space-y-1">
                    <li>Cannot execute final claim approvals</li>
                    <li>Cannot reject/deny claim payouts</li>
                    <li>Access denied to system security logs</li>
                    <li>Cannot override risk scoring results</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <BookOutlined className="text-gray-400" /> Step-by-Step Guidance
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Initiate Claim</strong>
                    <span className="text-gray-600 block mt-0.5">Go to <strong>Policy Search</strong> and click the <strong>+ New Claim</strong> button. Enter the policy number and incident parameters.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Upload Supporting Files</strong>
                    <span className="text-gray-600 block mt-0.5">Drag & drop files in the <strong>Document Ingestion Pipeline</strong>. The built-in AI immediately extracts textual data. Click <strong>Submit Intake</strong>.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Request Pre-approval</strong>
                    <span className="text-gray-600 block mt-0.5">On the claim detail page, click the <strong>Pre-approval</strong> button. Wait for the checklist to verify satisfied guidelines (marked with green checkmarks) and missing documents (marked with red crosses).</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'ROLE_ADJUSTER':
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex gap-3 items-start">
              <BulbOutlined className="text-indigo-500 text-lg mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-indigo-900 text-sm m-0">Core Operational Purpose</h4>
                <p className="text-indigo-700 text-xs mt-1 mb-0 leading-relaxed">
                  As a <strong>Loss Adjuster</strong>, you are responsible for assessing risk levels, identifying fraud indicators, reviewing policy matches, and making the final legal determination to approve or deny claim payouts.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <KeyOutlined className="text-gray-400" /> Account Authorization & Limits
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3">
                  <span className="text-emerald-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Authorized Actions</span>
                  <ul className="text-emerald-700 text-xs pl-4 list-disc space-y-1">
                    <li>Access Claims Queue for pending reviews</li>
                    <li>Analyze risk metrics and fraud indicators</li>
                    <li>Authorise and settle claim payouts</li>
                    <li>Formally reject/deny invalid claims</li>
                    <li>Access Adjuster Copilot protocols</li>
                  </ul>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-md p-3">
                  <span className="text-rose-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Restricted Actions</span>
                  <ul className="text-rose-700 text-xs pl-4 list-disc space-y-1">
                    <li>Cannot modify submitted claim amounts directly</li>
                    <li>Notes are strictly required for approvals/denials</li>
                    <li>Access denied to system security logs</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <BookOutlined className="text-gray-400" /> Step-by-Step Guidance
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Monitor the Claims Queue</strong>
                    <span className="text-gray-600 block mt-0.5">Navigate to the <strong>Claims Queue</strong> to view cases awaiting human review or detailed analysis.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Audit & Consult AI Copilot</strong>
                    <span className="text-gray-600 block mt-0.5">Open a claim and review the AI-extracted checklist. Use the <strong>Expert Chatbot</strong> (Adjuster Protocol active) to analyze specific clauses or identify potential document anomalies.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Finalize Auditing Decision</strong>
                    <span className="text-gray-600 block mt-0.5">Click <strong>Approve</strong> or <strong>Reject</strong>. Enter detailed justification notes (minimum 10 characters) in the compliance modal, then confirm the decision. The status will transition to <strong>CLEARED</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      case 'ROLE_ADMIN':
      default:
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-100 border border-slate-300 rounded-lg p-4 flex gap-3 items-start">
              <BulbOutlined className="text-slate-600 text-lg mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-slate-800 text-sm m-0">Core Operational Purpose</h4>
                <p className="text-slate-600 text-xs mt-1 mb-0 leading-relaxed">
                  As a <strong>System Admin</strong>, your account operates at the system configuration level. You oversee global claim operations, verify system trace logs, check access control list parameters, and ensure overall compliance logs integrity.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <KeyOutlined className="text-gray-400" /> Account Authorization & Limits
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3">
                  <span className="text-emerald-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Authorized Actions</span>
                  <ul className="text-emerald-700 text-xs pl-4 list-disc space-y-1">
                    <li>Full visibility to view all claims</li>
                    <li>Access Security Audit page (`/system-logs`)</li>
                    <li>Inspect Adjuster network and assignments</li>
                    <li>Review RAG configuration parameters</li>
                    <li>Access Admin Copilot chat protocols</li>
                  </ul>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-md p-3">
                  <span className="text-rose-800 text-[10px] font-bold tracking-wider uppercase block mb-1.5">Restricted Actions</span>
                  <ul className="text-rose-700 text-xs pl-4 list-disc space-y-1">
                    <li>Cannot create claim intakes directly</li>
                    <li>Should not bypass formal Adjuster review gates</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-2">
                <BookOutlined className="text-gray-400" /> Step-by-Step Guidance
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">1</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Monitor Platform Security Logs</strong>
                    <span className="text-gray-600 block mt-0.5">Go to the <strong>Security Audit</strong> page on the sidebar. Review access logs, permission tokens, and background workflow traces.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">2</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Inspect Active Adjuster Assignments</strong>
                    <span className="text-gray-600 block mt-0.5">Use the <strong>Adjuster Network</strong> tab to audit current caseload distributions across agents.</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">3</span>
                  <div className="text-xs">
                    <strong className="text-gray-800 block">Audit Specific Claims</strong>
                    <span className="text-gray-600 block mt-0.5">Locate any claim via <strong>Policy Search</strong>. Check details to verify that adjusting decisions align with policies and risk evaluations.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  // Popover notification content
  const popoverContent = (
    <div style={{ width: 320 }} className="p-1">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-gray-800 text-sm">Role Alerts</span>
        <Badge status="processing" text={<span className="text-xs text-gray-500 font-mono">Active</span>} />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <List
        size="small"
        dataSource={roleNotifications[role as keyof typeof roleNotifications] || []}
        renderItem={(item: any) => (
          <List.Item className="px-0 py-2.5 border-b border-gray-100 last:border-0 flex flex-col items-start gap-1">
            <span className="text-xs font-bold text-gray-800">{item.title}</span>
            <span className="text-[11px] text-gray-500 leading-normal">{item.desc}</span>
            <span className="text-[9px] text-gray-400 font-mono mt-0.5">{item.time}</span>
          </List.Item>
        )}
      />
    </div>
  )

  return (
    <Layout className="min-h-screen bg-[#f8fafc]">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        width={240}
        style={{ background: '#111827' }}
        className="border-r border-[#1f2937] flex flex-col h-screen"
      >
        <div className={`p-6 flex flex-col ${collapsed ? 'items-center' : 'items-start'} gap-1 transition-all duration-300`}>
          <div className="flex items-center gap-3 mb-1">
            <img src={logoSrc} alt="Insuragent Logo" className="w-8 h-8 object-contain shrink-0" />
            {!collapsed && <span className="text-white font-semibold text-lg tracking-wide whitespace-nowrap">Insuragent</span>}
          </div>
          {!collapsed && <span className="text-gray-500 text-[10px] font-mono tracking-widest uppercase">v.2.4.0-STABLE</span>}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-r-0 mt-4 px-3"
          style={{ background: 'transparent' }}
        />

        <div className="mt-auto p-4 mb-12">
          {!collapsed ? (
            <div className="text-gray-500 text-xs px-4 py-2 hover:text-white cursor-pointer transition-colors flex items-center gap-3 mt-1" onClick={handleLogout}>
              <UserOutlined /> Logout
            </div>
          ) : (
            <div className="text-gray-500 text-lg hover:text-white cursor-pointer transition-colors flex justify-center mt-1" onClick={handleLogout} title="Logout">
              <UserOutlined />
            </div>
          )}
        </div>
      </Sider>

      <Layout className="bg-transparent flex-1 flex flex-col h-screen w-full overflow-hidden">
        <Header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 shrink-0 w-full z-10 sticky top-0" style={{ padding: '0 24px' }}>
          <div className="flex items-center gap-8 flex-1">
            <h1 className="text-xl font-bold text-gray-900 m-0 uppercase tracking-tight">
              {menuItems.find(m => m.key === selectedKey)?.label || 'PORTAL'}
            </h1>
            <div className="w-full max-w-xl">
              <Input
                prefix={<FileSearchOutlined className="text-gray-400" />}
                placeholder="Search Claim ID, Insured Name, or Policy..."
                className="bg-gray-50 border-gray-200 hover:bg-white focus:bg-white rounded"
                size="middle"
              />
            </div>
          </div>
          <div className="flex items-center gap-5 shrink-0 ml-8">
            <Popover content={popoverContent} title={null} trigger="click" placement="bottomRight">
              <Badge dot className="cursor-pointer">
                <BellOutlined className="text-gray-500 text-lg hover:text-gray-900 transition-colors" />
              </Badge>
            </Popover>

            <SettingOutlined
              className="text-gray-500 text-lg hover:text-gray-900 transition-colors cursor-pointer"
              onClick={() => setSettingsVisible(true)}
            />

            <QuestionCircleOutlined
              className="text-gray-500 text-lg hover:text-gray-900 transition-colors cursor-pointer"
              onClick={() => setHelpVisible(true)}
            />

            <div className="w-[1px] h-6 bg-gray-200 mx-2"></div>

            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div className="flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 p-1.5 rounded-xl transition-colors shadow-sm">
                <Avatar size={36} src={currentAvatar} className="border border-gray-200 bg-white" />
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content className="flex-1 overflow-auto bg-[#f8fafc] relative w-full h-full p-6">
          <Outlet />
        </Content>
      </Layout>

      {/* Settings Drawer */}
      <Drawer
        title={<span className="font-bold text-gray-800">System Settings</span>}
        placement="right"
        width={360}
        onClose={() => setSettingsVisible(false)}
        open={settingsVisible}
      >
        <div className="flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Interface Theme</h4>
            <Radio.Group
              value={themeMode}
              onChange={(e) => {
                setThemeMode(e.target.value);
                message.success(`Theme mode updated to ${e.target.value}`);
              }}
              buttonStyle="solid"
              className="w-full"
            >
              <Radio.Button value="light" className="w-1/2 text-center">Light Mode</Radio.Button>
              <Radio.Button value="dark" className="w-1/2 text-center">Dark Mode</Radio.Button>
            </Radio.Group>
          </div>

          <Divider className="my-0" />

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Primary Accent Color</h4>
            <Radio.Group
              value={accentColor}
              onChange={(e) => {
                setAccentColor(e.target.value);
                message.success(`Primary color set to ${e.target.value}`);
              }}
              className="flex flex-col gap-2"
            >
              <Radio value="blue" className="text-sm text-gray-700">Insuragent Blue (Default)</Radio>
              <Radio value="indigo" className="text-sm text-gray-700">Enterprise Indigo</Radio>
              <Radio value="emerald" className="text-sm text-gray-700">Compliance Emerald</Radio>
              <Radio value="slate" className="text-sm text-gray-700">Neutral Slate</Radio>
            </Radio.Group>
          </div>

          <Divider className="my-0" />

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Language Preference</h4>
            <Radio.Group
              value={lang}
              onChange={(e) => {
                setLang(e.target.value);
                message.success(`Language preference set to ${e.target.value === 'en' ? 'English' : 'Chinese'}`);
              }}
              buttonStyle="solid"
              className="w-full"
            >
              <Radio.Button value="en" className="w-1/2 text-center">English</Radio.Button>
              <Radio.Button value="zh" className="w-1/2 text-center">简体中文</Radio.Button>
            </Radio.Group>
          </div>

          <Divider className="my-0" />

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Desktop Notifications</h4>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-xs text-gray-600">Enable real-time push alerts</span>
              <Switch
                checked={notifyEnabled}
                onChange={(checked) => {
                  setNotifyEnabled(checked);
                  message.success(checked ? "Push notifications enabled" : "Push notifications disabled");
                }}
              />
            </div>
          </div>

          <Divider className="my-0" />

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gemini API Key</h4>
            <Input.Password
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value)
                localStorage.setItem('GEMINI_API_KEY', e.target.value.trim())
              }}
            />
            <span className="text-[10px] text-gray-400 mt-1 block">Saved automatically in browser cache. / 金鑰自動儲存。</span>
          </div>

          <Divider className="my-0" />

          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Active Session Information</h4>
            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 space-y-2 text-xs font-mono text-gray-600">
              <div className="flex justify-between">
                <span>Account Role:</span>
                <span className="font-bold text-gray-800">{role}</span>
              </div>
              <div className="flex justify-between">
                <span>Enterprise User:</span>
                <span className="text-gray-800">{user?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Session Duration:</span>
                <span className="text-gray-800">8 hours remaining</span>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* Help Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">Help & Usage Guidelines</span>
            <Tag color="blue" className="rounded-full uppercase text-[10px] font-bold tracking-wider">{role.replace('ROLE_', '')}</Tag>
          </div>
        }
        open={helpVisible}
        onCancel={() => setHelpVisible(false)}
        footer={null}
        width={560}
      >
        <Divider className="mt-2 mb-4" />
        {renderHelpContent()}
      </Modal>
    </Layout>
  )
}
