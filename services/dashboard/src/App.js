import React, { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import IdentityManager from './components/IdentityManager';
import MediaSubmission from './components/MediaSubmission';
import IncidentsList from './components/IncidentsList';
import SystemStatus from './components/SystemStatus';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [systemHealth, setSystemHealth] = useState({ status: 'checking' });

  useEffect(() => {
    // Check system health on mount
    fetch('/healthz')
      .then(res => res.json())
      .then(data => setSystemHealth(data))
      .catch(() => setSystemHealth({ status: 'error' }));
  }, []);

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
            <div className="logo-section">
            <div className="logo-icon">🛡️</div>
            <div>
              <h1>CyberSentry</h1>
              <p className="tagline">Real-time Digital Identity Protection</p>
            </div>
          </div>
          <div className="health-indicator">
            <span className={`status-dot ${systemHealth.status === 'ok' ? 'healthy' : 'unhealthy'}`}></span>
            <span>System {systemHealth.status === 'ok' ? 'Healthy' : 'Checking...'}</span>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={activeTab === 'identities' ? 'active' : ''} 
          onClick={() => setActiveTab('identities')}
        >
          👤 Identities
        </button>
        <button 
          className={activeTab === 'submit' ? 'active' : ''} 
          onClick={() => setActiveTab('submit')}
        >
          📤 Submit Media
        </button>
        <button 
          className={activeTab === 'incidents' ? 'active' : ''} 
          onClick={() => setActiveTab('incidents')}
        >
          🚨 Incidents
        </button>
        <button 
          className={activeTab === 'system' ? 'active' : ''} 
          onClick={() => setActiveTab('system')}
        >
          ⚙️ System
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'identities' && <IdentityManager />}
        {activeTab === 'submit' && <MediaSubmission />}
        {activeTab === 'incidents' && <IncidentsList />}
        {activeTab === 'system' && <SystemStatus />}
      </main>

      <footer className="app-footer">
        <p>© 2026 CyberSentry | Production-Grade Deepfake Detection Platform</p>
      </footer>
    </div>
  );
}

export default App;
