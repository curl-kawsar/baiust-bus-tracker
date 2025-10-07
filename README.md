# Bus Tracker - TurboRepo Monorepo

A real-time bus tracking application built with TurboRepo, featuring a Next.js frontend and Express.js backend with live updates via Server-Sent Events.

## Architecture

- **Frontend** (`apps/web`): Next.js 14 with React 18, Tailwind CSS, shadcn/ui, and Leaflet for maps
- **Backend** (`apps/api`): Express.js proxy server with SSE support
- **Shared Packages**: UI components and configuration (empty placeholders)

## Features

- 🗺️ Interactive map with user location and bus tracking
- 🚌 Real-time bus location updates via Server-Sent Events
- 📏 Distance calculation between user and selected bus
- 📱 Responsive design with modern UI components
- 🔄 Live updates with connection status indicator

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   - Backend uses these default values:
     - `PORT=3001`
     - `BASE_URL=http://172.104.160.132:3000`  
     - `AUTH_TOKEN=BCC2025`

3. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Frontend at `http://localhost:3000`
   - Backend at `http://localhost:3001`

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build all applications
- `npm run lint` - Lint all applications

## API Endpoints (Backend)

The Express backend proxies requests to the external bus tracking API:

- `GET /proxy/devices` - List all available buses
- `GET /proxy/data?device_id=<bus_id>` - Get current bus location
- `GET /proxy/history?device_id=<bus_id>` - Get bus movement history  
- `GET /proxy/live?device_id=<bus_id>` - Server-Sent Events for real-time updates

All requests include `Authorization: Bearer BCC2025` header.

## Frontend Features

- **Bus Selection**: Dropdown to choose from available buses
- **Live Map**: Shows user location, bus location, and distance line
- **Real-time Updates**: Automatic updates via SSE with connection status
- **Distance Display**: Shows calculated distance in km/meters
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
bus-tracker/
├── apps/
│   ├── api/           # Express backend
│   └── web/           # Next.js frontend
├── packages/
│   ├── config/        # Shared configuration (placeholder)
│   └── ui/           # Shared UI components (placeholder)
├── package.json       # Root package with workspaces
├── turbo.json         # TurboRepo configuration
└── README.md
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui, Leaflet, react-leaflet
- **Backend**: Express.js, axios, cors, Server-Sent Events
- **Monorepo**: TurboRepo with npm workspaces
- **Maps**: OpenStreetMap tiles via Leaflet
- **Real-time**: Server-Sent Events for live bus tracking

## Development Notes

- The frontend uses dynamic imports for the map component to avoid SSR issues with Leaflet
- User location is obtained via browser geolocation API with fallback coordinates
- Distance calculation uses the Haversine formula for accurate results
- SSE connections automatically retry on failure with error handling
