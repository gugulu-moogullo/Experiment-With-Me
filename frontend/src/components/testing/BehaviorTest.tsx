// frontend/src/components/testing/BehaviorTest.tsx
import React from 'react';
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking';

const BehaviorTest: React.FC = () => {
  const { behaviorData, analytics, reset } = useBehaviorTracking();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>[Behavior Tracker] Behavior Tracker Test</h1>

      <div style={{
        backgroundColor: '#f0f8ff',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>[Analytics] Real-time Analytics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><strong>Human Probability:</strong> {(analytics.isHuman * 100).toFixed(1)}%</div>
          <div><strong>Avg Velocity:</strong> {analytics.avgVelocity.toFixed(2)} px/ms</div>
          <div><strong>Max Velocity:</strong> {analytics.maxVelocity.toFixed(2)} px/ms</div>
          <div><strong>Click Frequency:</strong> {analytics.clickFrequency.toFixed(2)} /sec</div>
          <div><strong>Session Duration:</strong> {(analytics.sessionDuration / 1000).toFixed(1)}s</div>
          <div><strong>Avg Keystroke:</strong> {analytics.avgKeystrokeDuration.toFixed(0)}ms</div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff5ee',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>[Mouse] Mouse Data</h2>
        <div><strong>Mouse Movements:</strong> {behaviorData.mouseMovements.length}</div>
        <div><strong>Clicks:</strong> {behaviorData.clicks.length}</div>
        <div><strong>Keystrokes:</strong> {behaviorData.keystrokes.length}</div>
      </div>

      <div style={{
        backgroundColor: '#f0fff0',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        height: '200px',
        border: '2px dashed #32cd32'
      }}>
        <h3>[Test] Test Area - Move your mouse here!</h3>
        <p>Move mouse, click, and type to see data change above</p>
        <input
          type="text"
          placeholder="Type here to test keystroke tracking..."
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
          Click Me!
        </button>
        <button
          onClick={reset}
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
          Reset Data
        </button>
      </div>

      <div style={{
        backgroundColor: '#f5f5f5',
        padding: '15px',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <h4>[Activity] Recent Activity</h4>
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

export default BehaviorTest;
