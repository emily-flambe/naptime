/**
 * Main Express Server
 * Emily Nap App - Does Emily Need a Nap?
 */

const express = require('express');
const session = require('express-session');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 8080;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CORS middleware for development
if (process.env.NODE_ENV !== 'production') {
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
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store API configuration in app locals  
app.locals.ouraApiToken = process.env.OURA_API_TOKEN;

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Routes
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    configuration: {
      ouraApiToken: process.env.OURA_API_TOKEN ? 'configured' : 'missing',
      sessionSecret: process.env.SESSION_SECRET ? 'configured' : 'missing'
    }
  });
});

// Root route - serve frontend
app.get('/', (req, res) => {
  const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
  res.sendFile(frontendPath, (err) => {
    if (err) {
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
                    <a href="/auth/login" class="button">Connect Oura Ring</a>
                    <a href="/api/nap-status" class="button">Check Nap Status</a>
                </div>
                <div class="status">
                    <p>Backend is running! 🚀</p>
                    <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
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
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    const startupTime = new Date().toISOString();
    const mountainTime = new Date().toLocaleString("en-US", { timeZone: "America/Denver" });
    
    console.log(`=== Emily Nap Server Started ===`);
    console.log(`Startup Time (UTC): ${startupTime}`);
    console.log(`Current Mountain Time: ${mountainTime}`);
    console.log(`Running on port: ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Node.js version: ${process.version}`);
    
    // Debug environment variables
    console.log(`=== Environment Configuration ===`);
    console.log(`OURA_API_TOKEN: ${process.env.OURA_API_TOKEN ? 'SET (' + process.env.OURA_API_TOKEN.substring(0, 8) + '...)' : 'NOT SET'}`);
    console.log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? 'SET (****)' : 'NOT SET'}`);
    console.log(`================================`);
  });
}

// Export for testing
module.exports = app;