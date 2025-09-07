# Naptime

did I FUCKING stutter

## Setup

```bash
# Clone and install
git clone https://github.com/emily-flambe/naptime.git
cd naptime
make install

# Configure environment
cp .env.example .env
# Add your OURA_API_TOKEN to .env
```

## Development

```bash
make dev        # Start dev server
make test       # Run tests
make lint       # Run linting
```

## Deployment

```bash
make build      # Build for production
make deploy     # Deploy to Google Cloud Run
```

## API

- `GET /health` - Health check
- `GET /api/nap-status` - Current nap recommendation
- `GET /api/sleep-history` - 7-day sleep history

## Nap Logic

Emily needs a nap if:
1. < 6 hours sleep last night **AND**
2. Current time is 2-5 PM Mountain Time

## License

ISC
