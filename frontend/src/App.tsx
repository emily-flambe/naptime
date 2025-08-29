import { useState, useEffect } from 'react'
import './App.css'

interface ApiResponse {
  message: string
  backend?: string
  frontend?: string
}

function App() {
  const [message, setMessage] = useState<string>('Loading...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Determine API URL based on environment
    const apiUrl = import.meta.env.PROD 
      ? '/api/hello'  // In production, use relative path (same domain)
      : 'http://localhost:8000/api/hello'  // In development, use local backend

    fetch(apiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        return response.json()
      })
      .then((data: ApiResponse) => {
        setMessage(data.message)
      })
      .catch(err => {
        console.error('Failed to fetch:', err)
        setError('Failed to connect to backend')
        setMessage('Hello from Frontend Only!')
      })
  }, [])

  return (
    <div className="App">
      <h1>Google Cloud Run Demo</h1>
      <div className="card">
        <h2>{message}</h2>
        {error && (
          <p style={{ color: 'orange', fontSize: '0.9em' }}>
            Note: {error}
          </p>
        )}
        <p className="tech-stack">
          Built with React + TypeScript + Vite + FastAPI
        </p>
      </div>
    </div>
  )
}

export default App
