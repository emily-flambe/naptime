import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface NapStatus {
  message: string
  shouldNap: boolean
  sleepHours?: string
  sleepCategory?: string
  napPriority?: string
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

function App() {
  const [napStatus, setNapStatus] = useState<NapStatus | null>(null)
  const [loadingNap, setLoadingNap] = useState(true)  // Start with true for initial load
  const [detailsExpanded, setDetailsExpanded] = useState(false)

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
      console.log('Nap status response:', data)  // Debug log
      setNapStatus(data)
      setLoadingNap(false)  // Move this here to ensure it runs after setNapStatus
    } catch (err) {
      console.error('Failed to fetch nap status:', err)
      setNapStatus({
        message: 'Failed to fetch nap status',
        shouldNap: false,
        error: 'Connection error'
      })
      setLoadingNap(false)
    }
  }, [getApiUrl])


  useEffect(() => {
    fetchNapStatus()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNapStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNapStatus])

  return (
    <div className="app">
      <main className="nap-container">
        {(loadingNap || !napStatus) ? (
          <div className="loading">checking...</div>
        ) : (
          <>
            {napStatus.error ? (
              <div className="error">
                <div className="message">unable to check nap status</div>
                <button onClick={fetchNapStatus} className="retry-btn">
                  retry
                </button>
              </div>
            ) : (
              <>
                <h1 className={`nap-message ${napStatus.shouldNap ? 'needs-nap' : 'no-nap'}`}>
                  {napStatus.message}
                </h1>
                
                <button 
                  className="details-toggle"
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  aria-expanded={detailsExpanded}
                >
                  (details)
                </button>
                
                {detailsExpanded && (
                  <div className="details-panel">
                    {napStatus.sleepHours && (
                      <div className="detail-row sleep-summary">
                        <span>Emily got <span className={`sleep-hours ${napStatus.sleepCategory || 'good'}`}>{napStatus.sleepHours}</span> hours of sleep last night.</span>
                      </div>
                    )}
                    {napStatus.sleepScore && (
                      <div className="detail-row">
                        <span className="label">sleep score:</span>
                        <span className="value">{napStatus.sleepScore}/100</span>
                      </div>
                    )}
                    {napStatus.quality && (
                      <div className="detail-row">
                        <span className="label">quality:</span>
                        <span className="value">{napStatus.quality}</span>
                      </div>
                    )}
                    {napStatus.details && (
                      <>
                        {napStatus.details.efficiency && (
                          <div className="detail-row">
                            <span className="label">efficiency:</span>
                            <span className="value">{napStatus.details.efficiency}%</span>
                          </div>
                        )}
                        <div className="detail-row sleep-phases">
                          <span className="label">phases:</span>
                          <div className="sleep-bar">
                            {(() => {
                              const deep = napStatus.details.deepSleepMinutes || 0;
                              const rem = napStatus.details.remSleepMinutes || 0;
                              const light = napStatus.details.lightSleepMinutes || 0;
                              const total = deep + rem + light;
                              
                              return total > 0 ? (
                                <>
                                  <div 
                                    className="sleep-segment deep" 
                                    style={{ width: `${(deep / total) * 100}%` }}
                                    title={`Deep: ${deep}m`}
                                  />
                                  <div 
                                    className="sleep-segment rem" 
                                    style={{ width: `${(rem / total) * 100}%` }}
                                    title={`REM: ${rem}m`}
                                  />
                                  <div 
                                    className="sleep-segment light" 
                                    style={{ width: `${(light / total) * 100}%` }}
                                    title={`Light: ${light}m`}
                                  />
                                </>
                              ) : null;
                            })()}
                          </div>
                          <div className="sleep-legend">
                            <span className="legend-item"><span className="legend-dot deep"></span>deep {napStatus.details.deepSleepMinutes || 0}m</span>
                            <span className="legend-item"><span className="legend-dot rem"></span>rem {napStatus.details.remSleepMinutes || 0}m</span>
                            <span className="legend-item"><span className="legend-dot light"></span>light {napStatus.details.lightSleepMinutes || 0}m</span>
                          </div>
                        </div>
                      </>
                    )}
                    {napStatus.recommendation && (
                      <div className="detail-row recommendation">
                        <span className="label">note:</span>
                        <span className="value">{napStatus.recommendation}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default App
