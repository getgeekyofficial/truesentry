import React, { useState } from 'react';

function MediaSubmission() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [formData, setFormData] = useState({
    url: '',
    source_hint: '',
    identity_ids: []
  });
  const [submissionHistory, setSubmissionHistory] = useState([
    { id: 1, url: 'https://example.com/video1.mp4', status: 'processing', time: '2 min ago', confidence: null },
    { id: 2, url: 'https://example.com/video2.mp4', status: 'completed', time: '15 min ago', confidence: 0.42 },
    { id: 3, url: 'https://example.com/video3.mp4', status: 'completed', time: '1 hour ago', confidence: 0.87 },
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/v1/media/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.url,
          source_hint: formData.source_hint || null,
          identity_ids: formData.identity_ids.length > 0 ? formData.identity_ids : null
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ 
          type: 'success', 
          text: 'Media submitted successfully! Processing will begin shortly.' 
        });
        
        // Add to history
        setSubmissionHistory([
          {
            id: Date.now(),
            url: formData.url,
            status: 'processing',
            time: 'Just now',
            confidence: null
          },
          ...submissionHistory
        ]);

        // Reset form
        setFormData({ url: '', source_hint: '', identity_ids: [] });
      } else {
        setMessage({ type: 'error', text: 'Failed to submit media. Please check the URL and try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getStatusBadge = (status) => {
    const badges = {
      processing: 'badge-info',
      completed: 'badge-success',
      failed: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence === null) return null;
    if (confidence >= 0.7) return 'badge-danger';
    if (confidence >= 0.5) return 'badge-warning';
    return 'badge-success';
  };

  return (
    <div className="media-submission">
      <div className="card">
        <h2>📤 Submit Media for Detection</h2>
        
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
            <span>{message.type === 'success' ? '✓' : '✕'}</span>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Media URL *</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="https://example.com/video.mp4"
              required
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Supported: Video (MP4, AVI, MOV), Audio (MP3, WAV), Images (JPG, PNG)
            </small>
          </div>

          <div className="form-group">
            <label>Source Platform (Optional)</label>
            <select name="source_hint" value={formData.source_hint} onChange={handleInputChange}>
              <option value="">-- Select Platform --</option>
              <option value="twitter">Twitter / X</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target Identity IDs (Optional)</label>
            <input
              type="text"
              name="identity_ids"
              value={formData.identity_ids.join(', ')}
              onChange={(e) => setFormData({
                ...formData,
                identity_ids: e.target.value.split(',').map(id => id.trim()).filter(id => id)
              })}
              placeholder="id_000001, id_000002"
            />
            <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Leave empty to check against all registered identities
            </small>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Submitting...' : '🚀 Submit for Analysis'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>📊 Submission History</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>URL</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissionHistory.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No submissions yet. Submit media above to start detection.
                </td>
              </tr>
            ) : (
              submissionHistory.map(item => (
                <tr key={item.id}>
                  <td>
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>
                      {item.url.length > 50 ? item.url.substring(0, 50) + '...' : item.url}
                    </a>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    {item.confidence !== null ? (
                      <span className={`badge ${getConfidenceBadge(item.confidence)}`}>
                        {(item.confidence * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Pending</span>
                    )}
                  </td>
                  <td>{item.time}</td>
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
        <h3>🔍 How Detection Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>1️⃣</div>
            <strong>Ingestion</strong>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Media is downloaded and preprocessed
            </p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>2️⃣</div>
            <strong>Forensics</strong>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              5 detectors analyze face, audio, artifacts
            </p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>3️⃣</div>
            <strong>Ensemble</strong>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Scores fused and calibrated
            </p>
          </div>
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>4️⃣</div>
            <strong>Decision</strong>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Confidence score and alert if needed
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>💡 Tips for Best Results</h3>
        <ul style={{ paddingLeft: '1.5rem', color: '#374151' }}>
          <li style={{ marginBottom: '0.5rem' }}>Use direct media URLs (not landing pages)</li>
          <li style={{ marginBottom: '0.5rem' }}>Higher quality media yields better detection accuracy</li>
          <li style={{ marginBottom: '0.5rem' }}>Specify identity IDs to speed up processing</li>
          <li style={{ marginBottom: '0.5rem' }}>Check submission history for results (typically &lt; 30 seconds)</li>
        </ul>
      </div>
    </div>
  );
}

export default MediaSubmission;
