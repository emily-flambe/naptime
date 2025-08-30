# Naptime

did I FUCKING stutter

## Features

- **Oura Ring Integration**: OAuth 2.0 authentication with Oura Ring API v2
- **Smart Nap Logic**: Determines nap need based on sleep duration (<6 hours) and time window (2-5 PM MT)
- **Mountain Time Support**: Accurate timezone handling with DST support
- **RESTful API**: Comprehensive endpoints for nap status, sleep history, and user management
- **Session Management**: Secure session handling with Express sessions
- **Caching**: Performance optimization with in-memory caching
- **React Frontend**: Modern React 18 frontend with TypeScript

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React 18, TypeScript, Vite
- **Authentication**: OAuth 2.0 with Oura Ring
- **Testing**: Jest with comprehensive test coverage
- **Deployment**: Google Cloud Run (containerized)

## Quick Start

### Prerequisites

- Node.js 20+
- Oura Ring account with OAuth application
- Google Cloud account (for deployment)

### Installation

```bash
git clone https://github.com/emily-flambe/naptime.git
cd naptime
npm install
```

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure OAuth credentials:
```bash
OURA_CLIENT_ID=your_oura_client_id
OURA_CLIENT_SECRET=your_oura_client_secret
SESSION_SECRET=your_random_session_secret
NODE_ENV=development
PORT=8080
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/auth/login` | Start OAuth flow |
| GET | `/auth/callback` | OAuth callback handler |
| GET | `/auth/status` | Authentication status |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Logout user |
| GET | `/api/nap-status` | Get current nap recommendation |
| GET | `/api/nap-recommendations` | Detailed nap recommendations |
| GET | `/api/sleep-history` | 7-day sleep history |
| GET | `/api/user` | User information |

## Nap Logic

Emily needs a nap if:
1. She got less than 6 hours of sleep last night **AND**
2. Current time is between 2:00 PM and 5:00 PM Mountain Time

## Deployment

### Google Cloud Run

1. Build and deploy:
```bash
make build
make deploy
```

2. Configure OAuth redirect URI to: `https://your-domain.com/auth/callback`

3. Set production environment variables in Cloud Run

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Core business logic and services
- **Integration Tests**: API endpoints and authentication flow
- **Mock Testing**: External API dependencies properly mocked

```bash
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate coverage report
```

## Project Structure

```
src/
├── index.js              # Express server
├── routes/
│   ├── auth.js           # OAuth authentication
│   └── api.js            # API endpoints
├── services/
│   ├── oura.js           # Oura Ring API integration
│   ├── nap-calculator.js # Nap determination logic
│   └── cache.js          # Caching service
└── tests/                # Test suites
```

## License

ISC
