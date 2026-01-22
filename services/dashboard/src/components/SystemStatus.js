import React, { useState, useEffect } from 'react';

function SystemStatus() {
  const [services, setServices] = useState([
    { name: 'Gateway', status: 'healthy', uptime: '9h 23m', requests: '1,247' },
    { name: 'Identity', status: 'healthy', uptime: '9h 23m', requests: '89' },
    { name: 'Ingestion', status: 'healthy', uptime: '9h 23m', requests: '523' },
    { name: 'Forensics', status: 'healthy', uptime: '9h 23m', requests: '498' },
    { name: 'Ensemble', status: 'healthy', uptime: '9h 23m', requests: '487' },
    { name: 'Alerts', status: 'healthy', uptime: '9h 23m', requests: '12' },
  ]);

  const [infrastructure, setInfrastructure] = useState([
    { name: 'Postgres', status: 'healthy', version: 'PostgreSQL 16 + pgvector', connections: '12/100' },
    { name: 'Kafka', status: 'healthy', version: 'Redpanda 3.6', topics: '4' },
    { name: 'MinIO', status: 'healthy', version: 'Latest', storage: '2.3 GB / 100 GB' },
    { name: 'Kafka UI', status: 'healthy', version: 'Latest', port: '8080' },
  ]);

  const [metrics, setMetrics] = useState({
    cpu: 45,
    memory: 62,
    disk: 23,
    network: 38
  });

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setMetrics({
        cpu: Math.floor(Math.random() * 30) + 30,
        memory: Math.floor(Math.random() * 20) + 50,
        disk: Math.floor(Math.random() * 10) + 20,
        network: Math.floor(Math.random() * 40) + 20
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    return status === 'healthy' ? '#10b981' : '#ef4444';
  };

  const getMetricColor = (value) => {
    if (value >= 80) return '#ef4444';
    if (value >= 60) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div className="system-status">
      <div className="card">
        <h2>⚙️ System Status</h2>
        <div className="alert alert-success">
          <span>✓</span>
          <div>
            <strong>All Systems Operational</strong> - Platform is running smoothly with no issues detected.
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🚀 Application Services</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Status</th>
              <th>Uptime</th>
              <th>Requests</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map(service => (
              <tr key={service.name}>
                <td>
                  <strong>{service.name}</strong>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getStatusColor(service.status)
                    }} />
                    <span className={`badge ${service.status === 'healthy' ? 'badge-success' : 'badge-danger'}`}>
                      {service.status}
                    </span>
                  </div>
                </td>
                <td>{service.uptime}</td>
                <td>{service.requests}</td>
                <td>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                    View Logs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>🗄️ Infrastructure</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Status</th>
              <th>Version</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {infrastructure.map(infra => (
              <tr key={infra.name}>
                <td><strong>{infra.name}</strong></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: getStatusColor(infra.status)
                    }} />
                    <span className={`badge ${infra.status === 'healthy' ? 'badge-success' : 'badge-danger'}`}>
                      {infra.status}
                    </span>
                  </div>
                </td>
                <td>{infra.version}</td>
                <td>
                  {infra.connections && <span>Connections: {infra.connections}</span>}
                  {infra.topics && <span>Topics: {infra.topics}</span>}
                  {infra.storage && <span>Storage: {infra.storage}</span>}
                  {infra.port && <span>Port: {infra.port}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>📊 System Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '500', color: '#374151', textTransform: 'capitalize' }}>
                  {key === 'cpu' ? 'CPU Usage' : key === 'memory' ? 'Memory Usage' : key === 'disk' ? 'Disk Usage' : 'Network I/O'}
                </span>
                <span style={{ color: getMetricColor(value), fontWeight: 'bold' }}>
                  {value}%
                </span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '12px', 
                background: '#e5e7eb', 
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${value}%`,
                  height: '100%',
                  background: getMetricColor(value),
                  transition: 'width 0.5s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>🔗 Quick Links</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <a 
            href="http://localhost:8000/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              padding: '1rem', 
              background: '#f0f4f8', 
              borderRadius: '8px', 
              textDecoration: 'none',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f0f4f8'}
          >
            <span style={{ fontSize: '1.5rem' }}>📚</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>API Docs</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>OpenAPI Spec</div>
            </div>
          </a>

          <a 
            href="http://localhost:8080" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              padding: '1rem', 
              background: '#f0f4f8', 
              borderRadius: '8px', 
              textDecoration: 'none',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f0f4f8'}
          >
            <span style={{ fontSize: '1.5rem' }}>📨</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>Kafka UI</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Message Broker</div>
            </div>
          </a>

          <a 
            href="http://localhost:9001" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              padding: '1rem', 
              background: '#f0f4f8', 
              borderRadius: '8px', 
              textDecoration: 'none',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#e5e7eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#f0f4f8'}
          >
            <span style={{ fontSize: '1.5rem' }}>🗄️</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>MinIO Console</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Object Storage</div>
            </div>
          </a>

          <div
            style={{ 
              padding: '1rem', 
              background: '#f0f4f8', 
              borderRadius: '8px', 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>🗃️</span>
            <div>
              <div style={{ fontWeight: 'bold' }}>PostgreSQL</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Port 5432</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>🔧 Configuration</h3>
        <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.875rem' }}>
          <div style={{ marginBottom: '0.5rem' }}><strong>Environment:</strong> Development</div>
          <div style={{ marginBottom: '0.5rem' }}><strong>Gateway Port:</strong> 8000</div>
          <div style={{ marginBottom: '0.5rem' }}><strong>Kafka Bootstrap:</strong> localhost:9092</div>
          <div style={{ marginBottom: '0.5rem' }}><strong>Database:</strong> postgresql://localhost:5432/idprotect</div>
          <div style={{ marginBottom: '0.5rem' }}><strong>Object Storage:</strong> http://localhost:9000</div>
          <div><strong>Detection Threshold:</strong> 0.70 (70%)</div>
        </div>
      </div>

      <div className="card">
        <h3>📈 Platform Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>99.9%</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Uptime</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>< 300ms</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Avg Latency</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>2,847</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Total Requests</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: '#f0f4f8', borderRadius: '8px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>0</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemStatus;
