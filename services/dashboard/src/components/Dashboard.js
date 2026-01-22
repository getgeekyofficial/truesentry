import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [stats, setStats] = useState({
    totalIdentities: 0,
    activeMonitoring: 0,
    detectionsToday: 0,
    alertsTriggered: 0
  });

  const [recentActivity, setRecentActivity] = useState([
    { id: 1, type: 'detection', identity: 'Alice', confidence: 0.85, time: '2 min ago', status: 'high' },
    { id: 2, type: 'submission', identity: 'Bob', confidence: 0.42, time: '15 min ago', status: 'low' },
    { id: 3, type: 'alert', identity: 'Charlie', confidence: 0.92, time: '1 hour ago', status: 'critical' },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        detectionsToday: prev.detectionsToday + Math.floor(Math.random() * 3),
        alertsTriggered: prev.alertsTriggered + (Math.random() > 0.7 ? 1 : 0)
      }));
    }, 5000);

    // Initial stats
    setStats({
      totalIdentities: 12,
      activeMonitoring: 8,
      detectionsToday: 47,
      alertsTriggered: 3
    });

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      critical: 'badge-danger',
      high: 'badge-warning',
      low: 'badge-success'
    };
    return badges[status] || 'badge-info';
  };

  const getActivityIcon = (type) => {
    const icons = {
      detection: '🔍',
      submission: '📤',
      alert: '🚨'
    };
    return icons[type] || '📊';
  };

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalIdentities}</h3>
            <p>Total Identities</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <h3>{stats.activeMonitoring}</h3>
            <p>Active Monitoring</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <h3>{stats.detectionsToday}</h3>
            <p>Detections Today</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <h3>{stats.alertsTriggered}</h3>
            <p>Alerts Triggered</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>📊 System Overview</h2>
        <div className="alert alert-info">
          <span>ℹ️</span>
          <div>
            <strong>Platform Status:</strong> All services operational. Real-time monitoring active for {stats.activeMonitoring} identities.
          </div>
        </div>
      </div>

      <div className="card">
        <h2>⚡ Recent Activity</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Identity</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map(activity => (
              <tr key={activity.id}>
                <td>{getActivityIcon(activity.type)} {activity.type}</td>
                <td>{activity.identity}</td>
                <td>{(activity.confidence * 100).toFixed(1)}%</td>
                <td>
                  <span className={`badge ${getStatusBadge(activity.status)}`}>
                    {activity.status}
                  </span>
                </td>
                <td>{activity.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>🎯 Detection Pipeline</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📥</div>
            <div style={{ fontWeight: 'bold', color: '#667eea' }}>Ingestion</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Active</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔬</div>
            <div style={{ fontWeight: 'bold', color: '#667eea' }}>Forensics</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>5 Detectors</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎲</div>
            <div style={{ fontWeight: 'bold', color: '#667eea' }}>Ensemble</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Calibrated</div>
          </div>
          <div style={{ padding: '1rem', background: '#f0f4f8', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📢</div>
            <div style={{ fontWeight: 'bold', color: '#667eea' }}>Alerts</div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Real-time</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>🔐 Security & Compliance</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#10b981', fontSize: '1.5rem' }}>✓</span>
              <strong>End-to-End Encryption</strong>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '2rem' }}>
              All biometric data encrypted at rest
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#10b981', fontSize: '1.5rem' }}>✓</span>
              <strong>GDPR Compliant</strong>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '2rem' }}>
              Privacy-by-design architecture
            </p>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ color: '#10b981', fontSize: '1.5rem' }}>✓</span>
              <strong>Audit Logging</strong>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginLeft: '2rem' }}>
              Immutable audit trail enabled
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
