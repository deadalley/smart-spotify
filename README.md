# Smart Spotify

A full-stack application for analyzing and managing your Spotify music library. Discover insights about your playlists, artists, and tracks, with intelligent playlist recommendations powered by genre and artist analysis.

## Features

- **Playlist Analysis**: View detailed statistics about your playlists including genre distribution, time period analysis, and consistency metrics
- **Artist Insights**: Browse your favorite artists and see which tracks you have saved from each
- **Saved Tracks**: View and analyze all your liked songs with intelligent playlist suggestions
- **Smart Recommendations**: Get playlist suggestions for your tracks based on genre similarity and artist overlap
- **Playlist Management**: Add tracks to playlists directly from the app
- **Data Synchronization**: Sync your Spotify data to a local Redis cache for fast analysis
- **Decade Distribution**: Visual breakdown of tracks by decade with outlier detection
- **Search & Filter**: Quickly find playlists and artists with built-in search

## Prerequisites

- Node.js (v24 or higher)
- pnpm
- Redis
- Spotify Developer Account

## Local development

Create env file:

```env
CLIENT_ID=your_spotify_client_id
CLIENT_SECRET=your_spotify_client_secret
REDIRECT_URI=http://localhost:3000/api/auth/callback
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your_random_session_secret
REDIS_HOST=localhost
REDIS_PORT=6379
```

Start the local development server

```bash
# In the root directory
pnpm dev
```

This will start:

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Project Structure

```
smart-spotify/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API client
│   │   └── utils/       # Utility functions
├── backend/           # Express backend server
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Express middleware
│   │   └── jobs/        # Background jobs
└── shared/            # Shared TypeScript types
    └── src/
        ├── types.ts     # Type definitions
        └── parser.ts    # Data transformers
```

## API Endpoints

### Authentication

- `GET /api/auth/login` - Initiate Spotify OAuth flow
- `GET /api/auth/callback` - OAuth callback
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Data Persistence

- `POST /api/persist` - Start data sync job
- `GET /api/persist/status` - Get sync status
- `DELETE /api/persist` - Delete cached data

### Playlists

- `GET /api/playlists` - Get all playlists
- `GET /api/playlists/:id` - Get playlist details
- `GET /api/playlists/:id/tracks` - Get playlist tracks
- `GET /api/playlists/:id/analyze` - Get playlist analysis
- `POST /api/playlists/:id/tracks` - Add track to playlist
- `PATCH /api/playlists/:id/type` - Update playlist type

### Artists

- `GET /api/artists` - Get all artists
- `GET /api/artists/:id` - Get artist details
- `GET /api/artists/:id/tracks` - Get artist tracks

### Tracks

- `GET /api/tracks/saved` - Get saved tracks
- `GET /api/tracks/aggregate` - Get track recommendations

## License

MIT
