import React, { useState, useEffect } from 'react';

function IdentityManager() {
  const [identities, setIdentities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    display_name: '',
    handles: { twitter: '', instagram: '', tiktok: '' },
    consent: { terms_version: 'v1.0', signature: '' }
  });

  useEffect(() => {
    // Load demo identities
    setIdentities([
      { id: 'id_000001', display_name: 'Alice Johnson', handles: { twitter: '@alice' }, status: 'active' },
      { id: 'id_000002', display_name: 'Bob Smith', handles: { instagram: '@bobsmith' }, status: 'active' },
      { id: 'id_000003', display_name: 'Charlie Brown', handles: { tiktok: '@charlie' }, status: 'pending' },
    ]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/v1/identities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: formData.display_name,
          handles: Object.fromEntries(
            Object.entries(formData.handles).filter(([_, v]) => v)
          ),
          consent: {
            terms_version: formData.consent.terms_version,
            signature: formData.consent.signature || 'demo_signature'
          },
          reference_media: []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Identity created successfully! ID: ${data.id || 'pending'}` });
        setIdentities([...identities, {
          id: data.id || `id_${Date.now()}`,
          display_name: formData.display_name,
          handles: formData.handles,
          status: data.status || 'pending'
        }]);
        setFormData({
          display_name: '',
          handles: { twitter: '', instagram: '', tiktok: '' },
          consent: { terms_version: 'v1.0', signature: '' }
        });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to create identity. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('handle_')) {
      const platform = name.replace('handle_', '');
      setFormData({
        ...formData,
        handles: { ...formData.handles, [platform]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  return (
    <div className="identity-manager">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>👤 Identity Management</h2>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '➕ Add Identity'}
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            <span>{message.type === 'success' ? '✓' : '✕'}</span>
            <span>{message.text}</span>
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px' }}>
            <h3>Register New Identity</h3>
            
            <div className="form-group">
              <label>Display Name *</label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder="e.g., John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label>Twitter Handle</label>
              <input
                type="text"
                name="handle_twitter"
                value={formData.handles.twitter}
                onChange={handleInputChange}
                placeholder="@username"
              />
            </div>

            <div className="form-group">
              <label>Instagram Handle</label>
              <input
                type="text"
                name="handle_instagram"
                value={formData.handles.instagram}
                onChange={handleInputChange}
                placeholder="@username"
              />
            </div>

            <div className="form-group">
              <label>TikTok Handle</label>
              <input
                type="text"
                name="handle_tiktok"
                value={formData.handles.tiktok}
                onChange={handleInputChange}
                placeholder="@username"
              />
            </div>

            <div className="form-group">
              <label>
                <input type="checkbox" required style={{ width: 'auto', marginRight: '0.5rem' }} />
                I consent to the terms and conditions (v1.0)
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Creating...' : '✓ Create Identity'}
            </button>
          </form>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Handles</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {identities.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No identities registered yet. Click "Add Identity" to get started.
                </td>
              </tr>
            ) : (
              identities.map(identity => (
                <tr key={identity.id}>
                  <td><code>{identity.id}</code></td>
                  <td><strong>{identity.display_name}</strong></td>
                  <td>
                    {Object.entries(identity.handles).map(([platform, handle]) => (
                      <span key={platform} className="badge badge-info" style={{ marginRight: '0.5rem' }}>
                        {platform}: {handle}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={`badge ${identity.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {identity.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>📋 Identity Registration Process</h3>
        <ol style={{ paddingLeft: '1.5rem', color: '#374151' }}>
          <li style={{ marginBottom: '0.5rem' }}>Provide identity details and social media handles</li>
          <li style={{ marginBottom: '0.5rem' }}>Accept terms and conditions</li>
          <li style={{ marginBottom: '0.5rem' }}>Upload reference media (face, voice samples) - Coming soon</li>
          <li style={{ marginBottom: '0.5rem' }}>System generates encrypted biometric embeddings</li>
          <li style={{ marginBottom: '0.5rem' }}>Real-time monitoring begins automatically</li>
        </ol>
      </div>
    </div>
  );
}

export default IdentityManager;
