# ID-Protect Dashboard

Professional web-based GUI for the ID-Protect platform.

## Features

- **Dashboard**: Real-time overview with statistics and activity feed
- **Identity Management**: Register and manage protected identities
- **Media Submission**: Submit media URLs for deepfake detection
- **Incidents**: View and manage detection incidents with detailed forensics
- **System Status**: Monitor all services and infrastructure health

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Backend services running (Gateway on port 8000)

### Installation

```bash
cd services/dashboard
npm install
```

### Development

```bash
npm start
```

Opens at http://localhost:3000 with hot reload.

### Production Build

```bash
npm run build
```

Outputs to `build/` directory.

## Architecture

- **React 18**: Modern hooks-based components
- **Proxy**: API requests proxied to http://localhost:8000
- **No external state management**: Uses React hooks (useState, useEffect)
- **Responsive**: Mobile-friendly design

## Components

- `Dashboard.js`: Main overview with stats and activity
- `IdentityManager.js`: Identity registration and listing
- `MediaSubmission.js`: Media URL submission form
- `IncidentsList.js`: Incidents table with detailed view
- `SystemStatus.js`: Service health and metrics

## API Integration

All API calls go through the proxy to the Gateway service:
- `POST /v1/identities` - Create identity
- `POST /v1/media/submit` - Submit media
- `GET /healthz` - Health check

## Styling

Custom CSS with:
- Gradient backgrounds
- Card-based layout
- Responsive grid
- Smooth animations
- Professional color scheme (purple/blue gradient)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
