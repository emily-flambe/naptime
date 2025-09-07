import { useState, useEffect, useCallback } from 'react'
import './App.css'

interface SleepRecord {
  id?: string
  day?: string
  type?: string
  bedtime_start?: string
  bedtime_end?: string
  total_sleep_duration?: number
  time_in_bed?: number
  efficiency?: number
  score?: number
  deep_sleep_duration?: number
  rem_sleep_duration?: number
  light_sleep_duration?: number
  average_breath?: number
  average_heart_rate?: number
  average_hrv?: number
  awake_time?: number
  readiness?: {
    score?: number
    contributors?: {
      activity_balance?: number
      body_temperature?: number
      hrv_balance?: number
      previous_day_activity?: number
      previous_night?: number
      recovery_index?: number
      resting_heart_rate?: number
      sleep_balance?: number
    }
    temperature_deviation?: number
    temperature_trend_deviation?: number
  }
}

interface ApiResponse {
  data?: SleepRecord[]
}

interface DateRange {
  requested?: string
  apiParams?: {
    start_date?: string
    end_date?: string
  }
}

interface NapStatus {
  message: string
  shouldNap: boolean
  hasNappedToday?: boolean
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
  debugData?: {
    apiResponse?: ApiResponse
    fetchTimestamp?: string
    dateRange?: DateRange
    recordsFound?: number
    selectedRecord?: SleepRecord
  }
}

function App() {
  const [napStatus, setNapStatus] = useState<NapStatus | null>(null)
  const [loadingNap, setLoadingNap] = useState(true)  // Start with true for initial load
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const [debugExpanded, setDebugExpanded] = useState(false)

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
      // Remove noisy console log
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

  // Update favicon based on nap status
  useEffect(() => {
    if (!napStatus) return

    // Determine if it's sleep time (11 PM - 7 AM)
    const currentHour = new Date().getHours()
    const isSleepTime = currentHour >= 23 || currentHour < 7
    
    // Use i-sleep.png when should nap OR it's sleep time
    // Use real-shit.png otherwise
    const shouldUseSleepIcon = napStatus.shouldNap || isSleepTime
    const faviconPath = shouldUseSleepIcon ? '/i-sleep.png' : '/real-shit.png'
    
    // Update the favicon
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link')
    link.type = 'image/png'
    link.rel = 'icon'
    link.href = faviconPath
    if (!document.querySelector("link[rel*='icon']")) {
      document.getElementsByTagName('head')[0].appendChild(link)
    }
  }, [napStatus])

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
                  {napStatus.hasNappedToday ? 'Napping Has Occurred' : napStatus.message}
                </h1>
                
                {napStatus.hasNappedToday && (
                  <img 
                    src="/good-for-her.gif" 
                    alt="Good for her" 
                    className="nap-gif"
                  />
                )}
                
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
                    
                    {/* Even more details button */}
                    <button 
                      className="debug-toggle"
                      onClick={() => setDebugExpanded(!debugExpanded)}
                      aria-expanded={debugExpanded}
                    >
                      (even more details)
                    </button>
                    
                    {debugExpanded && napStatus.debugData && (
                      <div className="debug-panel">
                        <div className="debug-section">
                          <h4>API Debug Information</h4>
                          <div className="debug-row">
                            <span className="label">Fetch Time:</span>
                            <span className="value">{napStatus.debugData.fetchTimestamp}</span>
                          </div>
                          <div className="debug-row">
                            <span className="label">Records Found:</span>
                            <span className="value">{napStatus.debugData.recordsFound}</span>
                          </div>
                          {napStatus.debugData.selectedRecord && (
                            <>
                              <div className="debug-row">
                                <span className="label">Selected Day:</span>
                                <span className="value">{napStatus.debugData.selectedRecord.day}</span>
                              </div>
                              <div className="debug-row">
                                <span className="label">Sleep Type:</span>
                                <span className="value">{napStatus.debugData.selectedRecord.type}</span>
                              </div>
                              <div className="debug-row">
                                <span className="label">Bedtime:</span>
                                <span className="value">
                                  {napStatus.debugData.selectedRecord.bedtime_start} to {napStatus.debugData.selectedRecord.bedtime_end}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {napStatus.debugData.apiResponse?.data && (
                          <div className="debug-section">
                            <h4>All Sleep Records</h4>
                            {napStatus.debugData.apiResponse.data.map((record: SleepRecord, index: number) => (
                              <div key={index} className="debug-record">
                                <div className="debug-row">
                                  <strong>Record {index + 1}: {record.day} ({record.type})</strong>
                                </div>
                                <div className="debug-row">
                                  <span className="label">Duration:</span>
                                  <span className="value">{record.total_sleep_duration ? (record.total_sleep_duration / 3600).toFixed(2) : 'N/A'} hours</span>
                                </div>
                                <div className="debug-row">
                                  <span className="label">Time in Bed:</span>
                                  <span className="value">{record.time_in_bed ? (record.time_in_bed / 3600).toFixed(2) : 'N/A'} hours</span>
                                </div>
                                <div className="debug-row">
                                  <span className="label">Efficiency:</span>
                                  <span className="value">{record.efficiency}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="debug-section">
                          <h4>Raw API Response</h4>
                          <pre className="debug-json">
                            {JSON.stringify(napStatus.debugData.apiResponse, null, 2)}
                          </pre>
                        </div>
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
