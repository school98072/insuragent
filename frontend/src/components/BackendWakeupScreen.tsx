/**
 * BackendWakeupScreen
 *
 * Full-screen glassmorphism overlay shown while the Render backend is waking up.
 * Disappears automatically once the backend replies with 200.
 */
import React from 'react'
import { BackendStatus } from '@/hooks/useBackendWakeup'

interface Props {
  status: BackendStatus
  elapsedSec: number
  attempt: number
}

const pulseKeyframes = `
  @keyframes insuragent-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(0.96); }
  }
  @keyframes insuragent-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes insuragent-fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes insuragent-bar {
    0%   { width: 5%; }
    20%  { width: 30%; }
    50%  { width: 55%; }
    80%  { width: 75%; }
    100% { width: 90%; }
  }
`

function ProgressBar({ elapsedSec }: { elapsedSec: number }) {
  // Estimated 40s wake time — cap visual at 95%
  const pct = Math.min(95, Math.round((elapsedSec / 40) * 100))
  return (
    <div style={{
      width: '100%', height: 4,
      background: 'rgba(255,255,255,0.15)',
      borderRadius: 2, overflow: 'hidden', marginTop: 28,
    }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
        borderRadius: 2,
        transition: 'width 1s ease',
        boxShadow: '0 0 8px rgba(139,92,246,0.6)',
      }} />
    </div>
  )
}

function Dot({ delay }: { delay: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8,
      borderRadius: '50%', background: '#818cf8', margin: '0 3px',
      animation: `insuragent-pulse 1.4s ${delay} infinite ease-in-out`,
    }} />
  )
}

export default function BackendWakeupScreen({ status, elapsedSec, attempt }: Props) {
  const isError = status === 'error'

  return (
    <>
      <style>{pulseKeyframes}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      }}>
        {/* Ambient glow orbs */}
        <div style={{
          position: 'absolute', width: 400, height: 400,
          borderRadius: '50%', top: '10%', left: '15%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', width: 300, height: 300,
          borderRadius: '50%', bottom: '15%', right: '15%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />

        {/* Glass card */}
        <div style={{
          position: 'relative',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '52px 48px',
          textAlign: 'center',
          maxWidth: 440, width: '90%',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'insuragent-fade-in 0.5s ease',
        }}>
          {/* Spinner ring */}
          <div style={{
            width: 72, height: 72, margin: '0 auto 28px',
            position: 'relative',
          }}>
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.2)',
              borderTopColor: '#6366f1',
              animation: 'insuragent-spin 1s linear infinite',
            }} />
            {/* Logo inside spinner */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26,
            }}>
              🤖
            </div>
          </div>

          {/* Brand */}
          <div style={{
            fontSize: 22, fontWeight: 700, color: '#f8fafc',
            letterSpacing: '-0.02em', marginBottom: 6,
            fontFamily: "Inter, -apple-system, sans-serif",
          }}>
            Insuragent
          </div>

          {/* Status message */}
          <div style={{
            fontSize: 13, color: '#94a3b8',
            fontFamily: "Inter, -apple-system, sans-serif",
            lineHeight: 1.6,
            marginBottom: 4,
          }}>
            {isError
              ? '連線時間較長，仍在嘗試喚醒後端...'
              : '系統後端託管於 Render 免費雲端容器，正在喚醒中'}
          </div>
          <div style={{
            fontSize: 12, color: '#64748b',
            fontFamily: "Inter, -apple-system, sans-serif",
          }}>
            首次啟動約需 30–50 秒，請勿關閉頁面
          </div>

          {/* Progress bar */}
          <ProgressBar elapsedSec={elapsedSec} />

          {/* Elapsed + dots */}
          <div style={{
            marginTop: 20, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Dot delay="0s" />
              <Dot delay="0.2s" />
              <Dot delay="0.4s" />
            </div>
            <span style={{ fontSize: 12, color: '#475569', fontVariantNumeric: 'tabular-nums' }}>
              {elapsedSec}s
              {attempt > 0 && ` · 嘗試 #${attempt}`}
            </span>
          </div>

          {/* Bottom note */}
          <div style={{
            marginTop: 28,
            padding: '10px 14px',
            background: 'rgba(99,102,241,0.08)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 10,
            fontSize: 11, color: '#818cf8',
            lineHeight: 1.6,
          }}>
            我們正在進行安全資料驗證，請稍候
            <br />
            <span style={{ color: '#64748b' }}>
              We are validating secure data · Do not close this page
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
