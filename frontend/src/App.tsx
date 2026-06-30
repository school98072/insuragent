import React, { useMemo } from 'react'
import { Provider } from 'react-redux'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useTranslation } from 'react-i18next'
import { store } from './store'
import AppRouter from './routes'

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
