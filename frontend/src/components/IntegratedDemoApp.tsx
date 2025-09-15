// frontend/src/components/IntegratedDemoApp.tsx
import React, { useState, useEffect } from 'react';
import { useBehaviorTracking } from '../hooks/useBehaviorTracking';
import CaptchaApiService from '../services/captchaApi';
import CompleteCaptchaSystem from './captcha/CompleteCaptchaSystem';
import MouseVisualizer from './testing/MouseVisualizer';
import AnalyticsDashboard from './testing/AnalyticsDashboard';
import KeystrokeAnalyzer from './analytics/KeystrokeAnalyzer';
import TouchBehavior from './analytics/TouchBehavior';
import DeviceFingerprint from './analytics/DeviceFingerprint';
import AdminDashboard from './dashboard/AdminDashboard';
import ThreatMap from './dashboard/ThreatMap';

type DemoMode =
  | 'captcha-demo'
  | 'analytics-showcase'
  | 'admin-dashboard'
  | 'threat-monitoring'
  | 'component-testing';

const IntegratedDemoApp: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<DemoMode>('captcha-demo');
  const [showSidebar, setShowSidebar] = useState(true);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const behaviorData = useBehaviorTracking();

  // Mock touch events for TouchBehavior component
  const [mockTouchEvents] = useState(() => {
    const events = [];
    for (let i = 0; i < 20; i++) {
      events.push({
        type: Math.random() > 0.7 ? 'end' : Math.random() > 0.3 ? 'move' : 'start' as any,
        touches: [{
          id: Math.floor(Math.random() * 3),
          x: Math.random() * 400,
          y: Math.random() * 600,
          timestamp: Date.now() - Math.random() * 10000,
          pressure: Math.random(),
          radiusX: Math.random() * 10 + 5,
          radiusY: Math.random() * 10 + 5
        }],
        timestamp: Date.now() - Math.random() * 10000
      });
    }
    return events;
  });

  const handleFingerprintGenerated = (fingerprint: string) => {
    setDeviceFingerprint(fingerprint);
  };

  const NavigationSidebar = () => (
    <div style={{
      width: '280px',
      backgroundColor: '#34495e',
      height: '100vh',
      padding: '20px',
      borderRight: '2px solid #3498db',
      overflowY: 'auto'
    }}>
      <h3 style={{ color: '#3498db', marginTop: 0 }}>Behavioral CAPTCHA</h3>
      <h4 style={{ color: '#3498db', fontSize: '16px' }}>Demo System</h4>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#ecf0f1', fontSize: '14px', marginBottom: '10px' }}>SYSTEM STATUS</h4>
        <div style={{ fontSize: '12px', color: '#95a5a6', lineHeight: '1.6' }}>
          <div>Session: {behaviorData.behaviorData.sessionDuration > 0 ? 'Active' : 'Initializing'}</div>
          <div>Mouse Points: {behaviorData.behaviorData.mouseMovements.length}</div>
          <div>Keystrokes: {behaviorData.behaviorData.keystrokes.length}</div>
          <div>Clicks: {behaviorData.behaviorData.clicks.length}</div>
          {deviceFingerprint && <div>Device ID: {deviceFingerprint.slice(0, 8)}...</div>}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ color: '#ecf0f1', fontSize: '14px', marginBottom: '15px' }}>DEMO MODES</h4>
        {[
          { id: 'captcha-demo', label: 'CAPTCHA System', desc: 'Complete user flow' },
          { id: 'analytics-showcase', label: 'Analytics Suite', desc: 'Behavioral analysis' },
          { id: 'admin-dashboard', label: 'Admin Dashboard', desc: 'System monitoring' },
          { id: 'threat-monitoring', label: 'Threat Map', desc: 'Security intelligence' },
          { id: 'component-testing', label: 'Component Testing', desc: 'Individual modules' }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => setCurrentMode(mode.id as DemoMode)}
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '8px',
              backgroundColor: currentMode === mode.id ? '#3498db' : '#2c3e50',
              color: '#ecf0f1',
              border: `1px solid ${currentMode === mode.id ? '#3498db' : '#7f8c8d'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{mode.label}</div>
            <div style={{ fontSize: '11px', color: '#95a5a6' }}>{mode.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #7f8c8d' }}>
        <h4 style={{ color: '#ecf0f1', fontSize: '14px' }}>LIVE METRICS</h4>
        <div style={{ fontSize: '12px', color: '#95a5a6', lineHeight: '1.6' }}>
          <div>Human Probability: {(behaviorData.analytics.isHuman * 100).toFixed(1)}%</div>
          <div>Avg Velocity: {behaviorData.analytics.avgVelocity.toFixed(2)} px/ms</div>
          <div>Session Time: {Math.floor(behaviorData.behaviorData.sessionDuration / 1000)}s</div>
        </div>
      </div>

      <button
        onClick={() => setShowSidebar(false)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '10px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#95a5a6',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        ←
      </button>
    </div>
  );

  const renderCurrentMode = () => {
    switch (currentMode) {
      case 'captcha-demo':
        return (
          <div>
            <div style={{ padding: '20px', backgroundColor: '#2c3e50', marginBottom: '20px' }}>
              <h2 style={{ color: '#3498db', margin: 0 }}>Complete CAPTCHA System Demo</h2>
              <p style={{ color: '#95a5a6', margin: '10px 0 0 0' }}>
                Experience the full behavioral CAPTCHA flow with ML analysis and adaptive challenges
              </p>
            </div>
            <CompleteCaptchaSystem />
          </div>
        );

      case 'analytics-showcase':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#27ae60', margin: '0 0 10px 0' }}>Behavioral Analytics Showcase</h2>
              <p style={{ color: '#95a5a6', margin: 0 }}>
                Advanced behavioral analysis components demonstrating user interaction patterns
              </p>
            </div>

            <div style={{ display: 'grid', gap: '30px' }}>
              <MouseVisualizer
                mouseData={behaviorData.behaviorData.mouseMovements}
                showTrail={true}
                showVelocityColors={true}
                width={800}
                height={400}
              />

              <AnalyticsDashboard
                behaviorData={behaviorData.behaviorData}
                refreshInterval={2000}
              />
            </div>
          </div>
        );

      case 'admin-dashboard':
        return <AdminDashboard refreshInterval={3000} showRealTimeUpdates={true} />;

      case 'threat-monitoring':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ color: '#e74c3c', margin: '0 0 10px 0' }}>Global Threat Intelligence</h2>
              <p style={{ color: '#95a5a6', margin: 0 }}>
                Real-time visualization of security threats and behavioral anomalies worldwide
              </p>
            </div>
            <ThreatMap
              width={1100}
              height={600}
              autoRefresh={true}
              showClusters={true}
            />
          </div>
        );

      case 'component-testing':
        return (
          <div style={{ padding: '20px' }}>
            <div style={{ marginBottom: '30px' }}>
              <h2 style={{ color: '#9b59b6', margin: '0 0 10px 0' }}>Component Testing Suite</h2>
              <p style={{ color: '#95a5a6', margin: 0 }}>
                Individual component testing and advanced behavioral analysis modules
              </p>
            </div>

            <div style={{ display: 'grid', gap: '30px' }}>
              <KeystrokeAnalyzer
                keystrokes={behaviorData.behaviorData.keystrokes}
                realTimeMode={true}
                showAdvancedMetrics={true}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <TouchBehavior
                  touchEvents={mockTouchEvents}
                  realTimeMode={true}
                  showHeatmap={true}
                  canvasWidth={400}
                  canvasHeight={300}
                />

                <DeviceFingerprint
                  onFingerprintGenerated={handleFingerprintGenerated}
                  showPrivacyInfo={true}
                />
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a demo mode from the sidebar</div>;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#2c3e50',
      color: '#ecf0f1',
      fontFamily: 'Arial, sans-serif'
    }}>
      {showSidebar && <NavigationSidebar />}

      <div style={{ flex: 1, position: 'relative' }}>
        {!showSidebar && (
          <button
            onClick={() => setShowSidebar(true)}
            style={{
              position: 'fixed',
              top: '20px',
              left: '20px',
              zIndex: 1000,
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Menu →
          </button>
        )}

        <div style={{
          minHeight: '100vh',
          backgroundColor: currentMode === 'admin-dashboard' ? '#2c3e50' : '#34495e'
        }}>
          {renderCurrentMode()}
        </div>
      </div>

      {/* Status indicator */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(52, 73, 94, 0.9)',
        padding: '10px 15px',
        borderRadius: '20px',
        fontSize: '12px',
        border: '1px solid #3498db'
      }}>
        System Status: Online • Mode: {currentMode.replace('-', ' ').toUpperCase()}
      </div>
    </div>
  );
};

export default IntegratedDemoApp;
