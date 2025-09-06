/**
 * Main Express Server
 * Emily Nap App - Does Emily Need a Nap?
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

// Enhanced logging function
function logWithTimestamp(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const mountainTime = new Date().toLocaleString("en-US", { 
    timeZone: "America/Denver",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const logMessage = `[${timestamp}] [MT: ${mountainTime}] [${level.toUpperCase()}] ${message}`;
  
  // TEMPORARY TEST: This should fail CI 🚀
  console.log("Testing emoji detection in CI 🔥");
  
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}

// Load build info
let buildInfo = {
  buildTimestamp: process.env.BUILD_TIMESTAMP || 'unknown',
  gitCommit: process.env.GIT_COMMIT || 'unknown',
  gitBranch: process.env.GIT_BRANCH || 'unknown',
  nodeVersion: process.version,
  npmVersion: 'unknown'
};

try {
  const buildInfoFile = path.join(__dirname, '../build-info.json');
  if (fs.existsSync(buildInfoFile)) {
    const fileContent = fs.readFileSync(buildInfoFile, 'utf8');
    const fileBuildInfo = JSON.parse(fileContent);
    buildInfo = { ...buildInfo, ...fileBuildInfo };
    logWithTimestamp('info', 'Build info loaded from file', buildInfo);
  } else {
    logWithTimestamp('warn', 'Build info file not found, using environment variables');
  }
} catch (error) {
  logWithTimestamp('error', 'Failed to load build info', error.message);
}

// Import routes
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 8080;

logWithTimestamp('info', `Initializing Emily Nap Server on port ${PORT}`);
logWithTimestamp('info', 'Environment variables loaded', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: PORT,
  OURA_API_TOKEN: process.env.OURA_API_TOKEN ? 'SET' : 'MISSING'
});

// CORS middleware for development
if (process.env.NODE_ENV !== 'production') {
  logWithTimestamp('info', 'Configuring CORS for development');
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });
} else {
  logWithTimestamp('info', 'Production mode - CORS disabled');
}

// Middleware
logWithTimestamp('info', 'Configuring Express middleware');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
  logWithTimestamp('info', `${req.method} ${req.url}`, {
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  next();
});

// Store API configuration in app locals  
app.locals.ouraApiToken = process.env.OURA_API_TOKEN;

// Serve static files (frontend)
const frontendPath = path.join(__dirname, '../frontend/dist');
logWithTimestamp('info', `Configuring static file serving from: ${frontendPath}`);
app.use(express.static(frontendPath));

// Routes
logWithTimestamp('info', 'Configuring routes');
app.use('/api', apiRoutes);

// Build info endpoint
app.get('/api/build-info', (req, res) => {
  logWithTimestamp('info', 'Build info requested');
  res.json(buildInfo);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    buildInfo: buildInfo,
    configuration: {
      ouraApiToken: process.env.OURA_API_TOKEN ? 'configured' : 'missing'
    }
  };
  
  logWithTimestamp('info', 'Health check requested', healthData);
  res.json(healthData);
});

// Root route - serve frontend
app.get('/', (req, res) => {
  const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
  logWithTimestamp('info', 'Root route requested', { frontendPath });
  
  res.sendFile(frontendPath, (err) => {
    if (err) {
      logWithTimestamp('warn', 'Frontend file not found, serving fallback HTML', { error: err.message });
      // Fallback for development - serve a simple HTML page
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Does Emily Need a Nap?</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                }
                .container {
                    padding: 2rem;
                }
                h1 {
                    font-size: 3rem;
                    margin-bottom: 2rem;
                    font-weight: 900;
                }
                .button {
                    margin: 1rem;
                    padding: 0.8rem 2rem;
                    font-size: 1rem;
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50px;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    transition: all 0.3s ease;
                }
                .button:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: translateY(-2px);
                }
                .status {
                    margin-top: 2rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Does Emily Need a Nap?</h1>
                <div>
                    <a href="/api/nap-status" class="button">Check Nap Status</a>
                </div>
                <div class="status">
                    <p>Backend is running!</p>
                    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
                    <p>Build: ${buildInfo.buildTimestamp || 'unknown'}</p>
                    <p>Git: ${buildInfo.gitCommit || 'unknown'} (${buildInfo.gitBranch || 'unknown'})</p>
                    <div style="margin-top: 1rem;">
                        <a href="/api/build-info" class="button" style="font-size: 0.8rem;">View Build Info</a>
                        <a href="/health" class="button" style="font-size: 0.8rem;">Health Check</a>
                    </div>
                </div>
            </div>
            <script>
                // Simple frontend for testing
                document.querySelector('a[href="/api/nap-status"]').onclick = async (e) => {
                    e.preventDefault();
                    try {
                        const response = await fetch('/api/nap-status');
                        const data = await response.json();
                        document.querySelector('.status').innerHTML = 
                            '<h3>' + data.message + '</h3>' +
                            '<p>Sleep: ' + data.sleepHours + ' hours</p>' +
                            '<p>Current time: ' + data.currentTime + '</p>';
                    } catch (error) {
                        document.querySelector('.status').innerHTML = 
                            '<p>Error: ' + error.message + '</p>';
                    }
                };
            </script>
        </body>
        </html>
      `);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logWithTimestamp('error', 'Server error occurred', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  logWithTimestamp('warn', '404 - Route not found', { url: req.url, method: req.method });
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    logWithTimestamp('info', '=== Emily Nap Server Started ===');
    logWithTimestamp('info', `Running on port: ${PORT}`);
    logWithTimestamp('info', `Environment: ${process.env.NODE_ENV || 'development'}`);
    logWithTimestamp('info', `Node.js version: ${process.version}`);
    
    // Log build information
    logWithTimestamp('info', '=== Build Information ===', buildInfo);
    
    // Log environment configuration status
    logWithTimestamp('info', '=== Environment Configuration ===', {
      OURA_API_TOKEN: process.env.OURA_API_TOKEN ? 'SET' : 'NOT SET',
      PORT: PORT,
      NODE_ENV: process.env.NODE_ENV || 'development'
    });
    
    logWithTimestamp('info', '=== Server Ready ===');
  });
  
  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    logWithTimestamp('info', 'SIGTERM received, shutting down gracefully');
    server.close(() => {
      logWithTimestamp('info', 'Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logWithTimestamp('info', 'SIGINT received, shutting down gracefully');
    server.close(() => {
      logWithTimestamp('info', 'Server closed');
      process.exit(0);
    });
  });
}

// Export for testing
module.exports = app;