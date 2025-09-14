// frontend/src/components/testing/AnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';

interface BehaviorData {
  mouseMovements: Array<{
    x: number;
    y: number;
    timestamp: number;
    velocity: number;
    acceleration: number;
  }>;
  clicks: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  keystrokes: Array<{
    key: string;
    timestamp: number;
    duration: number;
  }>;
  sessionDuration: number;
  pageVisible: boolean;
}

interface AnalyticsDashboardProps {
  behaviorData: BehaviorData;
  mlResults?: any;
  refreshInterval?: number;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  behaviorData,
  mlResults,
  refreshInterval = 1000
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedMetric, setSelectedMetric] = useState<'velocity' | 'acceleration' | 'timing'>('velocity');

  // Update current time for real-time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Comprehensive analytics calculations
  const analytics = useMemo(() => {
    const { mouseMovements, clicks, keystrokes, sessionDuration } = behaviorData;

    // Mouse Analytics
    const mouseAnalytics = {
      totalPoints: mouseMovements.length,
      avgVelocity: mouseMovements.length > 0
        ? mouseMovements.reduce((sum, m) => sum + m.velocity, 0) / mouseMovements.length
        : 0,
      maxVelocity: mouseMovements.length > 0 ? Math.max(...mouseMovements.map(m => m.velocity)) : 0,
      minVelocity: mouseMovements.length > 0 ? Math.min(...mouseMovements.map(m => m.velocity)) : 0,
      velocityVariance: 0,
      avgAcceleration: mouseMovements.length > 0
        ? mouseMovements.reduce((sum, m) => sum + m.acceleration, 0) / mouseMovements.length
        : 0,
      directionChanges: 0,
      mouseArea: { minX: 0, maxX: 0, minY: 0, maxY: 0, coverage: 0 }
    };

    // Calculate velocity variance
    if (mouseMovements.length > 1) {
      const velocities = mouseMovements.map(m => m.velocity);
      const mean = mouseAnalytics.avgVelocity;
      mouseAnalytics.velocityVariance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;

      // Calculate direction changes
      for (let i = 2; i < mouseMovements.length; i++) {
        const prev2 = mouseMovements[i-2];
        const prev1 = mouseMovements[i-1];
        const current = mouseMovements[i];

        const angle1 = Math.atan2(prev1.y - prev2.y, prev1.x - prev2.x);
        const angle2 = Math.atan2(current.y - prev1.y, current.x - prev1.x);
        const angleDiff = Math.abs(angle2 - angle1);

        if (angleDiff > Math.PI / 4) { // 45 degrees
          mouseAnalytics.directionChanges++;
        }
      }

      // Calculate mouse coverage area
      const xCoords = mouseMovements.map(m => m.x);
      const yCoords = mouseMovements.map(m => m.y);
      mouseAnalytics.mouseArea = {
        minX: Math.min(...xCoords),
        maxX: Math.max(...xCoords),
        minY: Math.min(...yCoords),
        maxY: Math.max(...yCoords),
        coverage: 0
      };
      mouseAnalytics.mouseArea.coverage =
        (mouseAnalytics.mouseArea.maxX - mouseAnalytics.mouseArea.minX) *
        (mouseAnalytics.mouseArea.maxY - mouseAnalytics.mouseArea.minY);
    }

    // Click Analytics
    const clickAnalytics = {
      totalClicks: clicks.length,
      clickFrequency: clicks.length > 0 && sessionDuration > 0
        ? clicks.length / (sessionDuration / 1000)
        : 0,
      avgClickInterval: 0,
      clickDistribution: { left: 0, right: 0, center: 0 },
      doubleClicks: 0
    };

    if (clicks.length > 1) {
      const intervals = clicks.slice(1).map((click, i) => click.timestamp - clicks[i].timestamp);
      clickAnalytics.avgClickInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

      // Count potential double clicks (within 500ms)
      clickAnalytics.doubleClicks = intervals.filter(interval => interval < 500).length;

      // Click position distribution
      clicks.forEach(click => {
        if (click.x < window.innerWidth / 3) clickAnalytics.clickDistribution.left++;
        else if (click.x > (window.innerWidth * 2) / 3) clickAnalytics.clickDistribution.right++;
        else clickAnalytics.clickDistribution.center++;
      });
    }

    // Keystroke Analytics
    const keystrokeAnalytics = {
      totalKeystrokes: keystrokes.length,
      avgKeystrokeDuration: keystrokes.length > 0
        ? keystrokes.reduce((sum, k) => sum + k.duration, 0) / keystrokes.length
        : 0,
      typingSpeed: 0, // WPM
      keystrokeRhythm: 0,
      commonKeys: {} as { [key: string]: number },
      typingPattern: 'unknown' as 'hunt-peck' | 'touch-typing' | 'unknown'
    };

    if (keystrokes.length > 0) {
      // Calculate WPM (assuming average word length of 5 characters)
      const totalChars = keystrokes.filter(k => k.key.length === 1).length;
      const timeInMinutes = sessionDuration / (1000 * 60);
      keystrokeAnalytics.typingSpeed = timeInMinutes > 0 ? (totalChars / 5) / timeInMinutes : 0;

      // Key frequency analysis
      keystrokes.forEach(k => {
        keystrokeAnalytics.commonKeys[k.key] = (keystrokeAnalytics.commonKeys[k.key] || 0) + 1;
      });

      // Rhythm analysis (variance in keystroke timing)
      if (keystrokes.length > 1) {
        const intervals = keystrokes.slice(1).map((k, i) => k.timestamp - keystrokes[i].timestamp);
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        keystrokeAnalytics.keystrokeRhythm = Math.sqrt(
          intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length
        );

        // Typing pattern detection (simplified)
        if (keystrokeAnalytics.keystrokeRhythm < 50) {
          keystrokeAnalytics.typingPattern = 'touch-typing';
        } else if (keystrokeAnalytics.keystrokeRhythm > 200) {
          keystrokeAnalytics.typingPattern = 'hunt-peck';
        }
      }
    }

    // Session Analytics
    const sessionAnalytics = {
      duration: sessionDuration,
      interactionDensity: (mouseMovements.length + clicks.length + keystrokes.length) / Math.max(sessionDuration / 1000, 1),
      engagementScore: 0,
      suspiciousActivity: [] as string[]
    };

    // Calculate engagement score (0-100)
    sessionAnalytics.engagementScore = Math.min(100,
      (mouseAnalytics.totalPoints > 0 ? 25 : 0) +
      (clickAnalytics.totalClicks > 0 ? 25 : 0) +
      (keystrokeAnalytics.totalKeystrokes > 0 ? 25 : 0) +
      (sessionDuration > 3000 ? 25 : Math.floor(sessionDuration / 120))
    );

    // Detect suspicious patterns
    if (mouseAnalytics.avgVelocity > 10) sessionAnalytics.suspiciousActivity.push('Abnormally fast mouse movement');
    if (mouseAnalytics.velocityVariance < 0.01) sessionAnalytics.suspiciousActivity.push('Too consistent mouse velocity');
    if (clickAnalytics.clickFrequency > 5) sessionAnalytics.suspiciousActivity.push('Excessive clicking frequency');
    if (keystrokeAnalytics.avgKeystrokeDuration < 20) sessionAnalytics.suspiciousActivity.push('Unnaturally fast keystrokes');

    return {
      mouse: mouseAnalytics,
      click: clickAnalytics,
      keystroke: keystrokeAnalytics,
      session: sessionAnalytics
    };
  }, [behaviorData]);

  // Helper function to render metric cards
  const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> = ({
    title, value, subtitle, color = '#3498db'
  }) => (
    <div style={{
      backgroundColor: '#2c3e50',
      padding: '15px',
      borderRadius: '8px',
      border: `2px solid ${color}`,
      minWidth: '150px'
    }}>
      <h4 style={{ margin: '0 0 5px 0', color: '#ecf0f1', fontSize: '14px' }}>{title}</h4>
      <div style={{ color: color, fontSize: '20px', fontWeight: 'bold', margin: '5px 0' }}>
        {typeof value === 'number' ? value.toFixed(2) : value}
      </div>
      {subtitle && <div style={{ color: '#95a5a6', fontSize: '12px' }}>{subtitle}</div>}
    </div>
  );

  // Render velocity chart
  const VelocityChart: React.FC = () => {
    const recentMovements = behaviorData.mouseMovements.slice(-50);
    const maxVelocity = Math.max(...recentMovements.map(m => m.velocity), 1);

    return (
      <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
        <h4 style={{ color: '#ecf0f1', marginTop: 0 }}>Recent Mouse Velocity</h4>
        <div style={{ display: 'flex', alignItems: 'end', height: '100px', gap: '2px' }}>
          {recentMovements.map((movement, index) => (
            <div
              key={index}
              style={{
                width: '4px',
                height: `${(movement.velocity / maxVelocity) * 100}%`,
                backgroundColor: movement.velocity > 3 ? '#e74c3c' : movement.velocity > 1.5 ? '#f39c12' : '#27ae60',
                opacity: 0.7 + (index / recentMovements.length) * 0.3
              }}
            />
          ))}
        </div>
        <div style={{ color: '#95a5a6', fontSize: '12px', marginTop: '5px' }}>
          Last {recentMovements.length} movements
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#34495e',
      color: '#ecf0f1',
      padding: '20px',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Behavioral Analytics Dashboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            style={{
              backgroundColor: '#2c3e50',
              color: '#ecf0f1',
              border: '1px solid #3498db',
              padding: '5px 10px',
              borderRadius: '4px'
            }}
          >
            <option value="velocity">Velocity Analysis</option>
            <option value="acceleration">Acceleration Analysis</option>
            <option value="timing">Timing Analysis</option>
          </select>
          <div style={{ color: '#95a5a6', fontSize: '14px' }}>
            Live • {Math.floor(behaviorData.sessionDuration / 1000)}s
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <MetricCard title="Mouse Points" value={analytics.mouse.totalPoints} color="#3498db" />
        <MetricCard title="Avg Velocity" value={analytics.mouse.avgVelocity} subtitle="px/ms" color="#27ae60" />
        <MetricCard title="Total Clicks" value={analytics.click.totalClicks} color="#e67e22" />
        <MetricCard title="Keystrokes" value={analytics.keystroke.totalKeystrokes} color="#9b59b6" />
        <MetricCard title="Engagement" value={`${analytics.session.engagementScore}%`} color="#f39c12" />
      </div>

      {/* Detailed Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Mouse Analytics */}
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ color: '#3498db', marginTop: 0 }}>Mouse Behavior</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px' }}>
            <div>Max Velocity: <strong>{analytics.mouse.maxVelocity.toFixed(2)}</strong></div>
            <div>Min Velocity: <strong>{analytics.mouse.minVelocity.toFixed(2)}</strong></div>
            <div>Avg Acceleration: <strong>{analytics.mouse.avgAcceleration.toFixed(2)}</strong></div>
            <div>Direction Changes: <strong>{analytics.mouse.directionChanges}</strong></div>
            <div>Coverage Area: <strong>{Math.floor(analytics.mouse.mouseArea.coverage)}</strong> px²</div>
            <div>Velocity Variance: <strong>{analytics.mouse.velocityVariance.toFixed(2)}</strong></div>
          </div>
        </div>

        {/* Click Analytics */}
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ color: '#e67e22', marginTop: 0 }}>Click Behavior</h3>
          <div style={{ fontSize: '14px' }}>
            <div style={{ marginBottom: '8px' }}>
              Click Frequency: <strong>{analytics.click.clickFrequency.toFixed(2)}</strong> /sec
            </div>
            <div style={{ marginBottom: '8px' }}>
              Avg Interval: <strong>{analytics.click.avgClickInterval.toFixed(0)}</strong> ms
            </div>
            <div style={{ marginBottom: '8px' }}>
              Double Clicks: <strong>{analytics.click.doubleClicks}</strong>
            </div>
            <div>
              Distribution: L:{analytics.click.clickDistribution.left}
              C:{analytics.click.clickDistribution.center}
              R:{analytics.click.clickDistribution.right}
            </div>
          </div>
        </div>
      </div>

      {/* Keystroke Analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h3 style={{ color: '#9b59b6', marginTop: 0 }}>Typing Behavior</h3>
          <div style={{ fontSize: '14px' }}>
            <div style={{ marginBottom: '8px' }}>
              Typing Speed: <strong>{analytics.keystroke.typingSpeed.toFixed(1)}</strong> WPM
            </div>
            <div style={{ marginBottom: '8px' }}>
              Avg Duration: <strong>{analytics.keystroke.avgKeystrokeDuration.toFixed(0)}</strong> ms
            </div>
            <div style={{ marginBottom: '8px' }}>
              Rhythm Variance: <strong>{analytics.keystroke.keystrokeRhythm.toFixed(1)}</strong>
            </div>
            <div>
              Pattern: <strong style={{
                color: analytics.keystroke.typingPattern === 'touch-typing' ? '#27ae60' :
                      analytics.keystroke.typingPattern === 'hunt-peck' ? '#e74c3c' : '#95a5a6'
              }}>
                {analytics.keystroke.typingPattern}
              </strong>
            </div>
          </div>
        </div>

        <VelocityChart />
      </div>

      {/* ML Results Integration */}
      {mlResults && (
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3 style={{ color: '#f39c12', marginTop: 0 }}>ML Risk Assessment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div>
              Classification: <strong style={{ color: mlResults.result?.isHuman ? '#27ae60' : '#e74c3c' }}>
                {mlResults.result?.isHuman ? 'HUMAN' : 'BOT'}
              </strong>
            </div>
            <div>
              Risk Score: <strong>{(mlResults.result?.riskScore * 100).toFixed(1)}%</strong>
            </div>
            <div>
              Confidence: <strong>{(mlResults.result?.confidence * 100).toFixed(1)}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* Suspicious Activity Alerts */}
      {analytics.session.suspiciousActivity.length > 0 && (
        <div style={{
          backgroundColor: '#c0392b',
          padding: '15px',
          borderRadius: '8px',
          border: '2px solid #e74c3c'
        }}>
          <h3 style={{ color: '#fff', marginTop: 0 }}>Security Alerts</h3>
          {analytics.session.suspiciousActivity.map((activity, index) => (
            <div key={index} style={{ color: '#fff', fontSize: '14px', marginBottom: '5px' }}>
              ⚠ {activity}
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#1a252f',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#95a5a6'
      }}>
        Dashboard refreshes every {refreshInterval / 1000}s •
        Session active for {Math.floor(behaviorData.sessionDuration / 1000)}s •
        Interaction density: {analytics.session.interactionDensity.toFixed(2)} events/sec
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
