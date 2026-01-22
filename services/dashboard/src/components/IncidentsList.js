import React, { useState } from 'react';

function IncidentsList() {
  const [incidents] = useState([
    {
      id: 'inc_001',
      identity: 'Alice Johnson',
      identity_id: 'id_000001',
      url: 'https://example.com/deepfake_alice.mp4',
      confidence: 0.92,
      status: 'open',
      severity: 'critical',
      detectors: {
        face_xception: 0.89,
        face_vit: 0.94,
        audio_ast: 0.91,
        cross_modal: 0.93,
        sensor_artifacts: 0.88
      },
      created_at: '2024-01-15 14:30:00',
      platform: 'TikTok'
    },
    {
      id: 'inc_002',
      identity: 'Bob Smith',
      identity_id: 'id_000002',
      url: 'https://example.com/suspicious_bob.jpg',
      confidence: 0.78,
      status: 'investigating',
      severity: 'high',
      detectors: {
        face_xception: 0.82,
        face_vit: 0.76,
        audio_ast: null,
        cross_modal: null,
        sensor_artifacts: 0.75
      },
      created_at: '2024-01-15 13:15:00',
      platform: 'Twitter'
    },
    {
      id: 'inc_003',
      identity: 'Charlie Brown',
      identity_id: 'id_000003',
      url: 'https://example.com/voice_charlie.mp3',
      confidence: 0.65,
      status: 'closed',
      severity: 'medium',
      detectors: {
        face_xception: null,
        face_vit: null,
        audio_ast: 0.68,
        cross_modal: null,
        sensor_artifacts: 0.62
      },
      created_at: '2024-01-15 10:00:00',
      platform: 'YouTube'
    }
  ]);

  const [selectedIncident, setSelectedIncident] = useState(null);

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: 'badge-danger',
      high: 'badge-warning',
      medium: 'badge-info',
      low: 'badge-success'
    };
    return badges[severity] || 'badge-info';
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: 'badge-danger',
      investigating: 'badge-warning',
      closed: 'badge-success'
    };
    return badges[status] || 'badge-info';
  };

  return (
    <div className="incidents-list">
      <div className="card">
        <h2>🚨 Incidents Dashboard</h2>
        
        <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
          <span>ℹ️</span>
          <div>
            <strong>Active Monitoring:</strong> Real-time detection across all registered identities. 
            Incidents are automatically created when confidence exceeds threshold (default: 70%).
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Identity</th>
              <th>Platform</th>
              <th>Confidence</th>
              <th>Severity</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map(incident => (
              <tr key={incident.id}>
                <td><code>{incident.id}</code></td>
                <td><strong>{incident.identity}</strong></td>
                <td>
                  <span className="badge badge-info">{incident.platform}</span>
                </td>
                <td>
                  <span className={`badge ${incident.confidence >= 0.7 ? 'badge-danger' : 'badge-warning'}`}>
                    {(incident.confidence * 100).toFixed(1)}%
                  </span>
                </td>
                <td>
                  <span className={`badge ${getSeverityBadge(incident.severity)}`}>
                    {incident.severity}
                  </span>
                </td>
                <td>
                  <span className={`badge ${getStatusBadge(incident.status)}`}>
                    {incident.status}
                  </span>
                </td>
                <td style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {new Date(incident.created_at).toLocaleString()}
                </td>
                <td>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIncident && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>🔍 Incident Details: {selectedIncident.id}</h2>
            <button className="btn btn-secondary" onClick={() => setSelectedIncident(null)}>
              ✕ Close
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <strong style={{ color: '#374151' }}>Identity</strong>
              <p style={{ marginTop: '0.25rem' }}>{selectedIncident.identity}</p>
              <code style={{ fontSize: '0.875rem', color: '#6b7280' }}>{selectedIncident.identity_id}</code>
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Platform</strong>
              <p style={{ marginTop: '0.25rem' }}>
                <span className="badge badge-info">{selectedIncident.platform}</span>
              </p>
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Overall Confidence</strong>
              <p style={{ marginTop: '0.25rem' }}>
                <span className={`badge ${selectedIncident.confidence >= 0.7 ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '1.2rem' }}>
                  {(selectedIncident.confidence * 100).toFixed(1)}%
                </span>
              </p>
            </div>
            <div>
              <strong style={{ color: '#374151' }}>Status</strong>
              <p style={{ marginTop: '0.25rem' }}>
                <span className={`badge ${getStatusBadge(selectedIncident.status)}`}>
                  {selectedIncident.status}
                </span>
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <strong style={{ color: '#374151', display: 'block', marginBottom: '0.5rem' }}>Media URL</strong>
            <a 
              href={selectedIncident.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#667eea', wordBreak: 'break-all' }}
            >
              {selectedIncident.url}
            </a>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3>🔬 Detector Scores</h3>
            <div style={{ marginTop: '1rem' }}>
              {Object.entries(selectedIncident.detectors).map(([detector, score]) => (
                <div key={detector} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '500', color: '#374151' }}>
                      {detector.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span style={{ color: '#6b7280' }}>
                      {score !== null ? `${(score * 100).toFixed(1)}%` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    background: '#e5e7eb', 
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    {score !== null && (
                      <div style={{
                        width: `${score * 100}%`,
                        height: '100%',
                        background: score >= 0.7 ? '#ef4444' : score >= 0.5 ? '#f59e0b' : '#10b981',
                        transition: 'width 0.3s ease'
                      }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3>📋 Rationale</h3>
            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
              <p style={{ color: '#374151', lineHeight: '1.6' }}>
                High confidence deepfake detected based on ensemble analysis. Multiple detectors flagged anomalies:
              </p>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: '#6b7280' }}>
                <li>Face manipulation artifacts detected in facial regions</li>
                <li>Audio-visual synchronization inconsistencies</li>
                <li>Compression artifacts inconsistent with claimed source</li>
                <li>Biometric mismatch with registered identity embeddings</li>
              </ul>
            </div>
          </div>

          <div>
            <h3>⚡ Response Actions</h3>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <button className="btn btn-primary">
                📧 Send Alert
              </button>
              <button className="btn btn-primary">
                📄 Generate Report
              </button>
              <button className="btn btn-primary">
                🚫 Request Takedown
              </button>
              <button className="btn btn-secondary">
                ✓ Mark as False Positive
              </button>
              <button className="btn btn-danger">
                🗑️ Close Incident
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>📊 Incident Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#fee2e2', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#991b1b' }}>1</div>
            <div style={{ color: '#7f1d1d', fontSize: '0.875rem' }}>Critical</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>1</div>
            <div style={{ color: '#78350f', fontSize: '0.875rem' }}>High</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#dbeafe', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e40af' }}>1</div>
            <div style={{ color: '#1e3a8a', fontSize: '0.875rem' }}>Medium</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#d1fae5', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#065f46' }}>0</div>
            <div style={{ color: '#064e3b', fontSize: '0.875rem' }}>Low</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncidentsList;
