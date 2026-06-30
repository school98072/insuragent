import React, { useMemo, useState, useEffect } from 'react'
import { Provider } from 'react-redux'
import { ConfigProvider, Modal, Input, Typography, message } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import { store } from './store'
import AppRouter from './routes'

const { Text, Link } = Typography

function GeminiKeyModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')

  useEffect(() => {
    const key = localStorage.getItem('GEMINI_API_KEY')
    if (!key) {
      setIsOpen(true)
    }
  }, [])

  const handleSave = () => {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      message.error('API Key cannot be empty / API Key 不能为空')
      return
    }
    localStorage.setItem('GEMINI_API_KEY', trimmed)
    message.success('Gemini API Key saved successfully / 金鑰儲存成功')
    setIsOpen(false)
  }

  return (
    <Modal
      title="🤖 Configure Gemini API Key / 配置 Gemini 服務金鑰"
      open={isOpen}
      onOk={handleSave}
      onCancel={() => setIsOpen(false)}
      okText="Save / 儲存"
      cancelText="Close / 關閉"
      maskClosable={false}
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          To enable AI pipeline features (claims analysis, damage verification, compliance audit), please provide a Gemini API Key. The key is stored locally in your browser's cache.
          <br />
          為了啟用 AI 解析、損害評估及合規檢查，請輸入您的 Gemini API Key。此金鑰僅會保存在您的瀏覽器本地快取中。
        </Text>
        
        <Input.Password
          placeholder="AIzaSy..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        
        <div>
          <Text style={{ fontSize: '12px' }}>
            Don't have a key? Get one for free at / 沒有金鑰？免費申請：
            <Link href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 4 }}>
              Google AI Studio
            </Link>
          </Text>
        </div>
      </div>
    </Modal>
  )
}

const theme = {
  token: {
    colorPrimary: '#1c69d4', // Modern Digital Blue (Primary Container from Stitch)
    colorLink: '#1c69d4',
    borderRadius: 0, // Industrial Logic: 0px active states / crisp edges
    borderRadiusLG: 0,
    borderRadiusSM: 0,
    borderRadiusXS: 0,
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f9f9f9', // Stitch: surface
    colorBorder: '#e6e6e6', // Stitch: border-hairline
    colorBorderSecondary: '#e2e2e2',
    colorText: '#1a1c1c', // Stitch: on-surface
    colorTextSecondary: '#424753', // Stitch: on-surface-variant
    boxShadow: 'none',
    boxShadowSecondary: 'none',
    colorSuccess: '#16a34a', // Stitch: status-success
    colorWarning: '#ca8a04',
    colorError: '#dc2626', // Stitch: status-error
    colorInfo: '#1c69d4',
    fontSize: 13, // High Information Density
    lineHeight: 1.5,
    controlOutline: 'none',
  },
  components: {
    Layout: {
      siderBg: '#1a2129', // Stitch: terminal-bg
      triggerBg: '#2f3131', // Stitch: inverse-surface
      headerBg: '#ffffff',
      headerColor: '#1a1c1c',
    },
    Menu: {
      itemBg: '#1a2129',
      itemColor: '#727784',
      itemHoverBg: '#2f3131',
      itemHoverColor: '#ffffff',
      itemSelectedBg: '#1c69d4',
      itemSelectedColor: '#ffffff',
      itemHeight: 40,
      itemBorderRadius: 0,
    },
    Button: {
      fontWeight: 600,
      borderRadius: 0,
      controlHeight: 32, // High density
    },
    Card: {
      borderRadius: 0,
      headerFontSize: 14,
      headerFontSizeSM: 13,
      paddingLG: 16, // Reduced padding
    },
    Table: {
      borderRadius: 0,
      fontSize: 12, // High density for data tables
      headerBg: '#ffffff', // Clean white headers
      headerColor: '#64748b', // Stitch: table-header
      rowHoverBg: '#f1f5f9', // Soft gray fade on hover
      cellPaddingBlock: 8, // Compact Table
    },
    Input: {
      borderRadius: 0, // Sharp edges
      controlHeight: 32,
    },
    Select: {
      borderRadius: 0,
      controlHeight: 32,
    },
    Tag: {
      borderRadius: 0,
      fontSize: 11, // Micro badges
    },
    Statistic: {
      titleFontSize: 12,
    },
  },
}

function ConfiguredApp() {
  const { i18n } = useTranslation()
  const locale = useMemo(() => {
    return i18n.language === 'zh' ? zhCN : enUS
  }, [i18n.language])

  return (
    <ConfigProvider locale={locale} theme={theme}>
      <AppRouter />
      <GeminiKeyModal />
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <ConfiguredApp />
    </Provider>
  )
}
