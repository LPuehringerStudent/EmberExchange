# OAuth Setup Guide

This document explains how to configure Google and GitHub OAuth for Ember Exchange.

## Overview

The application supports OAuth authentication via:
- **Google OAuth 2.0**
- **GitHub OAuth**

OAuth users are stored in the database with `provider` and `providerId` fields. Their password is `NULL` since they authenticate via the OAuth provider.

## Environment Variables

Add these to your `.env` file or environment:

```bash
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth (from GitHub Developer Settings)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Base URL for callbacks
BASE_URL=http://localhost:3000
```

## Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Configure the OAuth consent screen if prompted
6. Select **Web application** as the application type
7. Add authorized redirect URI: `http://localhost:3000/api/oauth/google/callback`
8. Copy the Client ID and Client Secret

## GitHub Developer Settings Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click **New OAuth App**
3. Fill in the application name and homepage URL
4. Set Authorization callback URL: `http://localhost:3000/api/oauth/github/callback`
5. Click **Register application**
6. Copy the Client ID and generate/copy the Client Secret

## Database Schema

The Player table includes OAuth fields:

```sql
provider text check (provider in ('google', 'github')),  -- OAuth provider
providerId text unique                                    -- Provider's user ID
```

## OAuth Flow

1. User clicks "Login with Google/GitHub" button
2. Frontend redirects to `/api/oauth/google` or `/api/oauth/github`
3. Backend redirects to provider's OAuth page
4. User authenticates with provider
5. Provider redirects back to `/api/oauth/{provider}/callback`
6. Backend:
   - Verifies the OAuth token
   - Finds or creates the user
   - Creates a session
   - Redirects to `/oauth/callback?sessionId=xxx&playerId=yyy`
7. Frontend OAuthCallbackComponent stores session and redirects to home

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/oauth/google` | Initiate Google OAuth |
| `GET /api/oauth/google/callback` | Google OAuth callback |
| `GET /api/oauth/github` | Initiate GitHub OAuth |
| `GET /api/oauth/github/callback` | GitHub OAuth callback |
| `GET /api/oauth/status` | Check which providers are configured |

## Frontend Components

- **Login Component** (`/login`): Shows OAuth buttons (disabled if not configured)
- **OAuth Callback Component** (`/oauth/callback`): Handles post-OAuth redirect

## Security Notes

- OAuth users cannot change their password (no password stored)
- OAuth users cannot log in with email/password
- If an email already exists for a regular account, OAuth with the same email will fail
- Sessions expire after 24 hours
