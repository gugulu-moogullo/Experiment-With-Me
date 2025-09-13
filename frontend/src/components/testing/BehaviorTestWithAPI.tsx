// frontend/src/components/testing/BehaviorTestWithAPI.tsx
import React, { useState, useEffect } from 'react';
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking';
import CaptchaApiService from '../../services/captchaApi';

const BehaviorTestWithAPI: React.FC = () => {
  const { behaviorData, analytics, reset } = useBehaviorTracking();
  const [apiService] = useState(new CaptchaApiService());
  const [apiResults, setApiResults] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  // Auto-validate every 3 seconds when there's behavior data
  useEffect(() => {
    if (behaviorData.mouseMovements.length > 5) {
      const now = new Date();
      const timeSinceLastValidation = lastValidation ? now.getTime() - lastValidation.getTime() : 9999;

      if (timeSinceLastValidation > 3000) { // 3 seconds
        validateBehavior();
      }
    }
  }, [behaviorData, lastValidation]);

  const validateBehavior = async () => {
    setApiStatus('loading');
    try {
      const response = await apiService.validateBehavior(behaviorData);
      setApiResults(response);
      setApiStatus('success');
      setLastValidation(new Date());
    } catch (error) {
      console.error('Validation failed:', error);
      setApiStatus('error');
    }
  };

  const testHealthCheck = async () => {
    try {
      const health = await apiService.healthCheck();
      alert(`Backend Status: ${health.status}\nService: ${health.service}`);
    } catch (error) {
      alert('Backend connection failed! Make sure server is running on port 5000');
    }
  };

  const resetAll = () => {
    reset();
    setApiResults(null);
    setApiStatus('idle');
    setLastValidation(null);
    apiService.resetSession();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>[TRACKER] Behavior Tracker with Backend API</h1>

      {/* Connection Status */}
      <div style={{
        backgroundColor: apiStatus === 'error' ? '#ffebee' : '#e8f5e8',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: `2px solid ${apiStatus === 'error' ? '#f44336' : '#4caf50'}`
      }}>
        <h3>[CONNECTION] Backend Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div><strong>API Status:</strong> {apiStatus.toUpperCase()}</div>
          <div><strong>Session ID:</strong> {apiService.getSessionId().slice(-8)}...</div>
          <div><strong>Last Check:</strong> {lastValidation?.toLocaleTimeString() || 'Never'}</div>
          <div><strong>Auto-validation:</strong> Every 3 seconds</div>
        </div>
        <button
          onClick={testHealthCheck}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Backend Connection
        </button>
        <button
          onClick={validateBehavior}
          disabled={apiStatus === 'loading'}
          style={{
            padding: '8px 16px',
            backgroundColor: apiStatus === 'loading' ? '#ccc' : '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: apiStatus === 'loading' ? 'not-allowed' : 'pointer'
          }}
        >
          {apiStatus === 'loading' ? 'Validating...' : 'Validate Now'}
        </button>
      </div>

      {/* Frontend Analytics */}
      <div style={{
        backgroundColor: '#f0f8ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>[ANALYTICS] Frontend Real-time Data</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><strong>Frontend Human Score:</strong> {(analytics.isHuman * 100).toFixed(1)}%</div>
          <div><strong>Avg Velocity:</strong> {analytics.avgVelocity.toFixed(2)} px/ms</div>
          <div><strong>Max Velocity:</strong> {analytics.maxVelocity.toFixed(2)} px/ms</div>
          <div><strong>Click Frequency:</strong> {analytics.clickFrequency.toFixed(2)} /sec</div>
          <div><strong>Session Duration:</strong> {(analytics.sessionDuration / 1000).toFixed(1)}s</div>
          <div><strong>Avg Keystroke:</strong> {analytics.avgKeystrokeDuration.toFixed(0)}ms</div>
        </div>
      </div>

      {/* Backend API Results */}
      {apiResults && (
        <div style={{
          backgroundColor: apiResults.result?.isHuman ? '#e8f5e8' : '#ffebee',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `3px solid ${apiResults.result?.isHuman ? '#4caf50' : '#f44336'}`
        }}>
          <h2>[BACKEND] ML Risk Assessment</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div><strong>ML Classification:</strong> {apiResults.result?.isHuman ? 'HUMAN' : 'BOT'}</div>
            <div><strong>Risk Score:</strong> {(apiResults.result?.riskScore * 100).toFixed(1)}%</div>
            <div><strong>Confidence:</strong> {(apiResults.result?.confidence * 100).toFixed(1)}%</div>
            <div><strong>Needs Challenge:</strong> {apiResults.result?.needsChallenge ? 'YES' : 'NO'}</div>
          </div>

          <div style={{ fontSize: '14px', color: '#666' }}>
            <strong>Backend Analysis:</strong> Mouse:{apiResults.result?.analysis.mouseMovements},
            Clicks:{apiResults.result?.analysis.clicks},
            Keys:{apiResults.result?.analysis.keystrokes},
            Duration:{(apiResults.result?.analysis.sessionDuration/1000).toFixed(1)}s
          </div>
        </div>
      )}

      {/* Data Collection */}
      <div style={{
        backgroundColor: '#fff5ee',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>[MOUSE] Collected Data</h2>
        <div><strong>Mouse Movements:</strong> {behaviorData.mouseMovements.length}</div>
        <div><strong>Clicks:</strong> {behaviorData.clicks.length}</div>
        <div><strong>Keystrokes:</strong> {behaviorData.keystrokes.length}</div>
      </div>

      {/* Test Area */}
      <div style={{
        backgroundColor: '#f0fff0',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        height: '200px',
        border: '2px dashed #32cd32'
      }}>
        <h3>[TEST] Interactive Test Area</h3>
        <p>Move mouse, click, and type to generate behavior data. Backend validates automatically every 3 seconds.</p>
        <input
          type="text"
          placeholder="Type here to test keystroke analysis..."
          style={{ width: '100%', padding: '10px', marginTop: '10px' }}
        />
        <button
          onClick={() => alert('Click detected!')}
          style={{
            padding: '10px 20px',
            margin: '10px 5px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Generate Click Data
        </button>
        <button
          onClick={resetAll}
          style={{
            padding: '10px 20px',
            margin: '10px 5px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Reset Everything
        </button>
      </div>

      {/* Raw Data Display */}
      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <h4>[ACTIVITY] Recent Activity</h4>
        <div><strong>Last Mouse Position:</strong>
          {behaviorData.mouseMovements.length > 0 &&
            ` (${behaviorData.mouseMovements[behaviorData.mouseMovements.length - 1]?.x},
            ${behaviorData.mouseMovements[behaviorData.mouseMovements.length - 1]?.y})`
          }
        </div>
        <div><strong>Last Click:</strong>
          {behaviorData.clicks.length > 0 &&
            ` (${behaviorData.clicks[behaviorData.clicks.length - 1]?.x},
            ${behaviorData.clicks[behaviorData.clicks.length - 1]?.y})`
          }
        </div>
        <div><strong>Last Key:</strong>
          {behaviorData.keystrokes.length > 0 &&
            ` "${behaviorData.keystrokes[behaviorData.keystrokes.length - 1]?.key}"`
          }
        </div>
      </div>
    </div>
  );
};

export default BehaviorTestWithAPI;
