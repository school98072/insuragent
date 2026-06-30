import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAppSelector } from '@/store/hooks'
import AppLayout from '@/components/layout/Layout'

const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/components/RegisterPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/components/DashboardPage'))
const ClaimsListPage = lazy(() => import('@/features/claims/components/ClaimsListPage'))
const ClaimIntakePage = lazy(() => import('@/features/claims/components/ClaimIntakePage'))
const ClaimDetailPage = lazy(() => import('@/features/claims/components/ClaimDetailPage'))
const TriageInboxPage = lazy(() => import('@/features/audit/components/TriageInboxPage'))
const KnowledgePage = lazy(() => import('@/features/knowledge/components/KnowledgePage'))
const RiskAnalysisPage = lazy(() => import('@/features/risk/components/RiskAnalysisPage'))
const ReportingPage = lazy(() => import('@/features/reporting/components/ReportingPage'))
const SystemLogsPage = lazy(() => import('@/features/logs/components/SystemLogsPage'))
const AdjusterNetworkPage = lazy(() => import('@/features/network/components/AdjusterNetworkPage'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function RoleRoute({ children, allowed }: { children: React.ReactNode; allowed: string[] }) {
  const user = useAppSelector((s) => s.auth.user)
  const role = user?.role || 'ROLE_BROKER'
  if (!allowed.includes(role)) {
    return <Navigate to="/403" replace />
  }
  return <>{children}</>
}

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
)

const ForbiddenPage = () => (
  <div className="flex flex-col items-center justify-center h-full text-center">
    <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
    <h2 className="text-2xl text-gray-800 mb-2">Access Denied</h2>
    <p className="text-gray-500">You do not have permission to view this page.</p>
  </div>
)

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={<PrivateRoute><AppLayout /></PrivateRoute>}
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="claims" element={<ClaimsListPage />} />
            <Route path="claims/new" element={<RoleRoute allowed={['ROLE_BROKER', 'ROLE_ADMIN']}><ClaimIntakePage /></RoleRoute>} />
            <Route path="claims/:id" element={<ClaimDetailPage />} />
            <Route path="audit" element={<RoleRoute allowed={['ROLE_ADJUSTER', 'ROLE_BROKER', 'ROLE_ADMIN']}><TriageInboxPage /></RoleRoute>} />
            <Route path="knowledge" element={<RoleRoute allowed={['ROLE_ADJUSTER', 'ROLE_ADMIN']}><KnowledgePage /></RoleRoute>} />
            <Route path="network" element={<RoleRoute allowed={['ROLE_ADMIN', 'ROLE_ADJUSTER']}><AdjusterNetworkPage /></RoleRoute>} />
            <Route path="risk-analysis" element={<RoleRoute allowed={['ROLE_ADJUSTER', 'ROLE_ADMIN']}><RiskAnalysisPage /></RoleRoute>} />
            <Route path="reporting" element={<RoleRoute allowed={['ROLE_ADJUSTER', 'ROLE_ADMIN', 'ROLE_BROKER']}><ReportingPage /></RoleRoute>} />
            <Route path="system-logs" element={<RoleRoute allowed={['ROLE_ADMIN']}><SystemLogsPage /></RoleRoute>} />
            <Route path="403" element={<ForbiddenPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
