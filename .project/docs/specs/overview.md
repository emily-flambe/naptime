# "Does Emily Need a Nap?" - Project Overview

## Purpose
A minimalist web application that determines if Emily needs a nap based on:
- Previous night's sleep data from Oura Ring
- Current time of day (Mountain Time)

## Nap Logic
Emily needs a nap if:
1. She got less than 6 hours of sleep last night AND
2. Current time is between 2:00 PM and 5:00 PM Mountain Time

## Tech Stack
- **Frontend**: Static HTML/CSS/JavaScript
- **Backend**: Node.js/Express on Cloud Run  
- **Data Source**: Oura API v2
- **Deployment**: Google Cloud Run
- **Authentication**: OAuth 2.0 with Oura
- **Secrets Management**: Google Secret Manager
- **Database** (optional): Firestore for token storage

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│                 │       │                  │       │             │
│  Browser/User   │──────▶│  Cloud Run       │──────▶│  Oura API   │
│                 │       │  Container       │       │             │
└─────────────────┘       └──────────────────┘       └─────────────┘
                                 │
                                 ▼
                          ┌──────────────────┐
                          │                  │
                          │  Firestore/      │
                          │  Memory Cache    │
                          │                  │
                          └──────────────────┘
```

## Current Status
- Spec analyzed and documented
- Ready for TDD implementation
- Oura OAuth credentials added to .env.example