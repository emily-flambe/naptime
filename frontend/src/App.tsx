import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface ApiResponse {
  message: string
  backend?: string
  frontend?: string
}

interface NapStatus {
  message: string
  shouldNap: boolean
  sleepHours?: string
  currentTime?: string
  recommendation?: string
  quality?: string
  sleepScore?: number
  cached?: boolean
  error?: string
  details?: {
    totalSleepDurationSeconds?: number
    efficiency?: number
    deepSleepMinutes?: number
    remSleepMinutes?: number
    lightSleepMinutes?: number
  }
}

interface SleepHistory {
  dateRange: string
  processedData: Array<{
    date: string
    sleepHours: string
    totalSleepDurationSeconds: number
    quality: string
  }>
}

function App() {
  const [message, setMessage] = useState<string>('Loading...')
  const [error, setError] = useState<string | null>(null)
  const [napStatus, setNapStatus] = useState<NapStatus | null>(null)
  const [loadingNap, setLoadingNap] = useState(false)
  const [sleepHistory, setSleepHistory] = useState<SleepHistory | null>(null)

  const getApiUrl = useCallback((endpoint: string) => {
    return import.meta.env.PROD 
      ? endpoint  // In production, use relative path
      : `http://localhost:8080${endpoint}`  // In development, use local backend
  }, [])

  const fetchNapStatus = useCallback(async () => {
    setLoadingNap(true)
    try {
      const response = await fetch(getApiUrl('/api/nap-status'))
      const data: NapStatus = await response.json()
      setNapStatus(data)
    } catch (err) {
      console.error('Failed to fetch nap status:', err)
      setNapStatus({
        message: 'Failed to fetch nap status',
        shouldNap: false,
        error: 'Connection error'
      })
    } finally {
      setLoadingNap(false)
    }
  }, [getApiUrl])

  const fetchSleepHistory = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl('/api/debug/sleep'))
      const data: SleepHistory = await response.json()
      setSleepHistory(data)
    } catch (err) {
      console.error('Failed to fetch sleep history:', err)
    }
  }, [getApiUrl])

  useEffect(() => {
    // Fetch hello message and nap status on component mount
    const fetchInitialData = async () => {
      try {
        const response = await fetch(getApiUrl('/api/hello'))
        const data: ApiResponse = await response.json()
        setMessage(data.message)
      } catch (err) {
        console.error('Failed to fetch:', err)
        setError('Failed to connect to backend')
        setMessage('Hello from Frontend Only!')
      }
    }

    fetchInitialData()
    fetchNapStatus()
    fetchSleepHistory()
  }, [getApiUrl, fetchNapStatus, fetchSleepHistory])

  return (
    <div className="App">
      <h1>Emily Needs A Nap</h1>
      
      <div className="card">
        <h2>{message}</h2>
        {error && (
          <p style={{ color: 'orange', fontSize: '0.9em' }}>
            Note: {error}
          </p>
        )}
      </div>

      {/* Nap Status */}
      <div className="card">
        <h3>Nap Status</h3>
        {loadingNap ? (
          <p>Loading nap status...</p>
        ) : napStatus ? (
          <div>
            {napStatus.error ? (
              <div>
                <p style={{ color: 'red' }}>Error: {napStatus.error}</p>
                <button 
                  onClick={fetchNapStatus}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#007cba',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginTop: '10px'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div>
                <h2 style={{ color: napStatus.shouldNap ? '#ff6b6b' : '#51cf66' }}>
                  {napStatus.message}
                </h2>
                {napStatus.sleepHours && (
                  <p>Last night's sleep: {napStatus.sleepHours} hours</p>
                )}
                {napStatus.sleepScore && (
                  <p>Sleep score: {napStatus.sleepScore}/100</p>
                )}
                {napStatus.quality && (
                  <p>Sleep quality: {napStatus.quality}</p>
                )}
                {napStatus.details && (
                  <div style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
                    <p>Deep: {napStatus.details.deepSleepMinutes}min | 
                       REM: {napStatus.details.remSleepMinutes}min | 
                       Light: {napStatus.details.lightSleepMinutes}min</p>
                    <p>Sleep efficiency: {napStatus.details.efficiency}%</p>
                  </div>
                )}
                {napStatus.recommendation && (
                  <p style={{ 
                    backgroundColor: '#f0f0f0', 
                    padding: '10px', 
                    borderRadius: '5px',
                    marginTop: '10px'
                  }}>
                    Recommendation: {napStatus.recommendation}
                  </p>
                )}
                {napStatus.cached && (
                  <p style={{ fontSize: '0.8em', color: '#666' }}>
                    Cached result (refreshes every 5 minutes)
                  </p>
                )}
                <p style={{ fontSize: '0.8em', color: '#666' }}>
                  Current time: {napStatus.currentTime || new Date().toLocaleString()}
                </p>
                <button 
                  onClick={fetchNapStatus}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    fontSize: '14px'
                  }}
                >
                  Refresh Status
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={fetchNapStatus}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Check Nap Status
          </button>
        )}
      </div>

      {/* Sleep History for Past 3 Days */}
      {sleepHistory && sleepHistory.processedData && sleepHistory.processedData.length > 0 && (
        <div className="card">
          <h3>Recent Sleep History ({sleepHistory.dateRange})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sleepHistory.processedData.map((sleep, index) => (
              <div key={index} style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '10px', 
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 'bold' }}>
                  {new Date(sleep.date).toLocaleDateString()}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <div>{sleep.sleepHours} hours</div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    Quality: {sleep.quality}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <p className="tech-stack">
          Built with React + TypeScript + Vite + Node.js + Express
        </p>
      </div>
    </div>
  )
}

export default App
