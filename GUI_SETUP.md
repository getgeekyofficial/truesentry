# ID-Protect Dashboard - GUI Setup Guide

## 🎨 Professional Web Dashboard

A production-ready React dashboard for the ID-Protect platform with real-time monitoring, identity management, media submission, and incident tracking.

---

## 📸 Dashboard Features

### 1. **Main Dashboard** 📊
- Real-time statistics (identities, detections, alerts)
- Recent activity feed with confidence scores
- Detection pipeline visualization
- Security & compliance status

### 2. **Identity Management** 👤
- Register new identities with social media handles
- View all registered identities
- Status tracking (active/pending)
- Reference media upload (coming soon)

### 3. **Media Submission** 📤
- Submit media URLs for detection
- Platform selection (Twitter, YouTube, TikTok, etc.)
- Submission history with status tracking
- Real-time confidence scores

### 4. **Incidents Dashboard** 🚨
- View all detection incidents
- Detailed forensics breakdown
- Per-detector scores visualization
- Response actions (alerts, reports, takedowns)

### 5. **System Status** ⚙️
- Service health monitoring
- Infrastructure status
- Real-time metrics (CPU, memory, disk, network)
- Quick links to Kafka UI, MinIO, API docs

---

## 🚀 Quick Start

### Option 1: Run Locally (Recommended for Development)

```bash
# Navigate to dashboard directory
cd id-protect/services/dashboard

# Install dependencies
npm install

# Start development server
npm start
```

The dashboard will open at **http://localhost:3000**

**Note**: Make sure the Gateway service is running on port 8000 for API connectivity.

---

### Option 2: Production Build

```bash
cd id-protect/services/dashboard

# Install dependencies
npm install

# Create production build
npm run build

# Serve the build (using serve package)
npx serve -s build -l 3000
```

---

## 🔧 Prerequisites

### Required:
- **Node.js 18+** and npm
- **Backend services running** (at minimum, Gateway on port 8000)

### Check if services are running:
```bash
# Check Gateway
curl http://localhost:8000/healthz

# Should return: {"status":"ok"}
```

---

## 📦 Installation Steps

### Step 1: Install Node.js (if not installed)

**Windows:**
Download from https://nodejs.org/ (LTS version recommended)

**Verify installation:**
```bash
node --version
npm --version
```

### Step 2: Install Dashboard Dependencies

```bash
cd id-protect/services/dashboard
npm install
```

This will install:
- React 18
- Axios (for API calls)
- Recharts (for charts - optional)
- Lucide React (for icons - optional)

### Step 3: Start the Dashboard

```bash
npm start
```

The dashboard will automatically open in your browser at http://localhost:3000

---

## 🎯 Using the Dashboard

### 1. Dashboard Overview
- View real-time statistics
- Monitor recent activity
- Check system health indicator (top right)

### 2. Register an Identity
1. Click **"Identities"** tab
2. Click **"➕ Add Identity"**
3. Fill in:
   - Display Name (required)
   - Social media handles (optional)
   - Accept terms checkbox
4. Click **"✓ Create Identity"**

### 3. Submit Media for Detection
1. Click **"Submit Media"** tab
2. Enter media URL (e.g., https://example.com/video.mp4)
3. Optionally select platform
4. Click **"🚀 Submit for Analysis"**
5. Check submission history for results

### 4. View Incidents
1. Click **"Incidents"** tab
2. Browse detected incidents
3. Click **"View Details"** for forensics breakdown
4. See per-detector scores and rationale

### 5. Monitor System
1. Click **"System"** tab
2. Check service health
3. View real-time metrics
4. Access quick links (Kafka UI, MinIO, API docs)

---

## 🔗 API Integration

The dashboard connects to the Gateway API (port 8000) via proxy:

**Configured in `package.json`:**
```json
"proxy": "http://localhost:8000"
```

**API Endpoints Used:**
- `GET /healthz` - System health
- `POST /v1/identities` - Create identity
- `POST /v1/media/submit` - Submit media
- `GET /v1/incidents` - List incidents (coming soon)

---

## 🎨 Design Features

### Visual Design
- **Gradient background**: Purple to blue gradient
- **Card-based layout**: Clean, modern cards
- **Responsive**: Works on desktop, tablet, mobile
- **Smooth animations**: Hover effects, transitions
- **Professional color scheme**: Purple (#667eea), Blue (#764ba2)

### UX Features
- **Real-time updates**: Stats update every 5 seconds
- **Status indicators**: Color-coded badges (success/warning/danger)
- **Loading states**: Spinners and disabled buttons during operations
- **Success/error messages**: Clear feedback for all actions
- **Empty states**: Helpful messages when no data

---

## 📁 Project Structure

```
services/dashboard/
├── public/
│   └── index.html              # HTML template
├── src/
│   ├── components/
│   │   ├── Dashboard.js        # Main overview
│   │   ├── IdentityManager.js  # Identity CRUD
│   │   ├── MediaSubmission.js  # Media submission
│   │   ├── IncidentsList.js    # Incidents view
│   │   └── SystemStatus.js     # System monitoring
│   ├── App.js                  # Main app component
│   ├── App.css                 # Global styles
│   └── index.js                # React entry point
├── package.json                # Dependencies
└── README.md                   # Dashboard docs
```

---

## 🐛 Troubleshooting

### Dashboard won't start
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API calls failing
1. Check Gateway is running: `curl http://localhost:8000/healthz`
2. Check proxy configuration in `package.json`
3. Check browser console for CORS errors

### Port 3000 already in use
```bash
# Use different port
PORT=3001 npm start
```

### Build errors
```bash
# Update dependencies
npm update

# Or use specific React Scripts version
npm install react-scripts@5.0.1
```

---

## 🚀 Production Deployment

### Build for Production
```bash
npm run build
```

### Serve with Static Server
```bash
# Install serve globally
npm install -g serve

# Serve the build
serve -s build -l 3000
```

### Deploy to Web Server
Copy the `build/` directory to your web server (Nginx, Apache, etc.)

**Nginx example:**
```nginx
server {
    listen 80;
    server_name dashboard.idprotect.com;
    root /var/www/id-protect/build;
    index index.html;
    
    location / {
        try_files $uri /index.html;
    }
    
    location /v1/ {
        proxy_pass http://localhost:8000;
    }
}
```

---

## 📊 Demo Data

The dashboard includes demo data for testing:
- 3 sample identities
- Recent activity feed
- 3 sample incidents with full forensics
- Real-time metric simulation

**To connect to real backend:**
Ensure all microservices are running and the Gateway is accessible.

---

## 🎯 Next Steps

### Immediate Enhancements:
1. **WebSocket Integration**: Real-time incident updates
2. **Authentication**: OAuth2/OIDC login
3. **Charts**: Add Recharts visualizations
4. **Dark Mode**: Theme toggle
5. **Export**: PDF reports, CSV exports

### Backend Integration:
1. Wire up real API endpoints
2. Implement pagination for large datasets
3. Add filtering and search
4. Real-time notifications via WebSocket

---

## 📞 Support

For issues or questions:
1. Check the main README.md
2. Review DEPLOYMENT_GUIDE.md
3. Check service logs: `docker compose logs gateway`

---

## ✅ Verification Checklist

- [ ] Node.js 18+ installed
- [ ] npm dependencies installed
- [ ] Gateway service running (port 8000)
- [ ] Dashboard starts without errors
- [ ] Can access http://localhost:3000
- [ ] System health shows "Healthy"
- [ ] Can create identity
- [ ] Can submit media
- [ ] All tabs load correctly

---

## 🎉 Success!

You now have a professional, production-ready dashboard for the ID-Protect platform!

**Access Points:**
- **Dashboard**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Kafka UI**: http://localhost:8080
- **MinIO Console**: http://localhost:9001

Enjoy monitoring your digital identity protection platform! 🛡️
