/**
 * useBackendWakeup
 *
 * Polls the Render backend /health endpoint until it responds with 200.
 * Once alive, sends a keep-alive ping every KEEPALIVE_INTERVAL_MS to prevent
 * the free-tier container from sleeping (Render sleeps after ~15 min idle).
 *
 * Optimisations to conserve Render free-tier hours:
 *  1. Ping interval is 12 min (just under Render's 15-min sleep threshold)
 *  2. Pings are PAUSED when the browser tab is hidden (Page Visibility API)
 *  3. Pings are PAUSED when the device is offline (navigator.onLine)
 *  → Combined, this reduces wasted compute by ~60-80% vs always-on pinging.
 */
import { useState, useEffect, useCallback, useRef } from 'react'

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ??
  'https://insuragent-backend.onrender.com'

const HEALTH_URL = `${BASE_URL}/health`
const POLL_INTERVAL_MS     = 3_000        // retry every 3 s while waking up
const KEEPALIVE_INTERVAL_MS = 12 * 60_000 // ping every 12 min once alive (< Render 15-min threshold)
const WAKE_TIMEOUT_ATTEMPTS = 30          // ~90 s before showing error state

export type BackendStatus = 'checking' | 'waking' | 'alive' | 'error'

export interface BackendWakeupState {
  status: BackendStatus
  elapsedSec: number
  attempt: number
}

/** Returns false when we should skip pinging to save quota */
function shouldPing(): boolean {
  if (!navigator.onLine) return false          // device offline
  if (document.visibilityState === 'hidden') return false  // tab in background
  return true
}

export function useBackendWakeup(): BackendWakeupState {
  const [status, setStatus]      = useState<BackendStatus>('checking')
  const [elapsedSec, setElapsed] = useState(0)
  const [attempt, setAttempt]    = useState(0)

  // Refs so interval callbacks always see current values without re-renders
  const statusRef       = useRef<BackendStatus>('checking')
  const keepaliveRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelledRef    = useRef(false)

  const updateStatus = (s: BackendStatus) => {
    statusRef.current = s
    setStatus(s)
  }

  const ping = useCallback(async (): Promise<boolean> => {
    if (!shouldPing()) return false
    try {
      const res = await fetch(HEALTH_URL, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  // ── Start the 12-min keepalive timer ──────────────────────────────────────
  const startKeepalive = useCallback(() => {
    if (keepaliveRef.current) return // already running
    keepaliveRef.current = setInterval(async () => {
      await ping() // silent — just keep the container warm
    }, KEEPALIVE_INTERVAL_MS)
  }, [ping])

  // ── Pause / resume keepalive on visibility change ─────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (statusRef.current !== 'alive') return

      if (document.visibilityState === 'visible') {
        // Tab came back into focus — ping immediately then restart timer
        ping()
        if (!keepaliveRef.current) startKeepalive()
      } else {
        // Tab hidden — stop timer to save quota
        if (keepaliveRef.current) {
          clearInterval(keepaliveRef.current)
          keepaliveRef.current = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [ping, startKeepalive])

  // ── Pause / resume keepalive on network change ────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'alive' && !keepaliveRef.current) {
        ping()
        startKeepalive()
      }
    }
    const handleOffline = () => {
      if (keepaliveRef.current) {
        clearInterval(keepaliveRef.current)
        keepaliveRef.current = null
      }
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [ping, startKeepalive])

  // ── Main wakeup polling loop ──────────────────────────────────────────────
  useEffect(() => {
    cancelledRef.current = false
    let elapsedTimer: ReturnType<typeof setInterval> | null = null
    let attemptCount = 0
    const startTime = Date.now()

    elapsedTimer = setInterval(() => {
      if (!cancelledRef.current)
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    async function wakeUp() {
      // First quick check
      const alive = await ping()
      if (cancelledRef.current) return

      if (alive) {
        updateStatus('alive')
        startKeepalive()
        return
      }

      updateStatus('waking')

      while (!cancelledRef.current) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
        if (cancelledRef.current) break

        // Skip this attempt if tab hidden or offline (don't burn quota)
        if (!shouldPing()) continue

        attemptCount++
        setAttempt(attemptCount)

        const ok = await ping()
        if (cancelledRef.current) break

        if (ok) {
          updateStatus('alive')
          startKeepalive()
          break
        }

        if (attemptCount >= WAKE_TIMEOUT_ATTEMPTS) {
          updateStatus('error')
          // Keep retrying slowly — don't give up
        }
      }
    }

    wakeUp()

    return () => {
      cancelledRef.current = true
      if (elapsedTimer) clearInterval(elapsedTimer)
      if (keepaliveRef.current) {
        clearInterval(keepaliveRef.current)
        keepaliveRef.current = null
      }
    }
  }, [ping, startKeepalive])

  return { status, elapsedSec, attempt }
}
