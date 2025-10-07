# Bus Tracker - TurboRepo Monorepo

A real-time bus tracking application built with TurboRepo, featuring a Next.js frontend and Express.js backend with live updates via Server-Sent Events.

## 🚀 **Deployment on Vercel**

This project is configured for easy deployment on Vercel with the following setup:

### **Quick Deploy**

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/bus-tracker.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will automatically detect the monorepo structure
   - Click "Deploy"

### **Environment Variables**

Set these environment variables in your Vercel dashboard:

```
BASE_URL=http://172.104.160.132:3000
AUTH_TOKEN=BCC2025
```

### **Project Structure for Vercel**

```
bus-tracker/
├── apps/
│   ├── web/           # Next.js frontend (deployed to Vercel)
│   │   ├── src/app/api/   # API routes for production
│   │   └── ...
│   └── api/           # Express backend (for local development)
├── vercel.json        # Vercel configuration
├── .vercelignore      # Files to ignore during deployment
└── README.md
```

## 🏗️ **Architecture**

- **Frontend** (`apps/web`): Next.js 14 with React 18, Tailwind CSS, shadcn/ui, and Leaflet for maps
- **Backend** (`apps/api`): Express.js proxy server (local development only)
- **Production API**: Next.js API routes in `apps/web/src/app/api/`
- **Shared Packages**: UI components and configuration

## 🌟 **Features**

- 🗺️ Interactive map with multiple view modes (Street, Satellite, Hybrid, Terrain, Dark)
- 🚌 Real-time bus location tracking
- 📍 User location detection with human icon
- 🛣️ Road-based routing using OSRM API
- 📏 Distance calculation between user and bus
- 🔄 Live updates via Server-Sent Events
- 📱 Responsive design for all devices
- 🎨 Modern UI with shadcn/ui components

## 🚀 **Local Development**

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development servers:**
   ```bash
   npm run dev
   ```

   This starts:
   - Frontend at `http://localhost:3000`
   - Backend at `http://localhost:3001`

## 📦 **Available Scripts**

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build all applications
- `npm run lint` - Lint all applications

## 🔧 **Configuration**

### **Local Development**
- Uses Express backend on port 3001
- API calls proxied from frontend to backend

### **Production (Vercel)**
- Uses Next.js API routes
- Serverless functions for API endpoints
- Automatic scaling and edge deployment

## 🌐 **API Endpoints**

- `GET /api/devices` - List all available buses
- `GET /api/data?device_id=<bus_id>` - Get current bus location
- `GET /api/history?device_id=<bus_id>` - Get bus movement history
- `GET /api/live?device_id=<bus_id>` - Server-Sent Events for real-time updates

## 🛠️ **Technology Stack**

- **Frontend**: Next.js 14, React 18, Tailwind CSS, shadcn/ui, Leaflet, react-leaflet
- **Backend**: Express.js (dev), Next.js API routes (prod)
- **Monorepo**: TurboRepo with npm workspaces
- **Maps**: OpenStreetMap tiles via Leaflet
- **Routing**: OSRM API for road-based directions
- **Real-time**: Server-Sent Events
- **Deployment**: Vercel

## 📝 **Deployment Notes**

- The project automatically switches between local Express backend (development) and Next.js API routes (production)
- Environment variables are configured in `vercel.json` and can be overridden in Vercel dashboard
- The monorepo structure is fully supported by Vercel
- API routes use Next.js 14 App Router format

## 🔒 **Security**

- All API requests include proper authorization headers
- Environment variables are used for sensitive configuration
- CORS is properly configured for cross-origin requests

---

**Ready to deploy!** 🚀 Just push to GitHub and connect to Vercel for instant deployment.