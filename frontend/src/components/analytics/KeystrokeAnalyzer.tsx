// frontend/src/components/analytics/KeystrokeAnalyzer.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface Keystroke {
  key: string;
  timestamp: number;
  duration: number;
  keyCode?: number;
  isShift?: boolean;
  isCtrl?: boolean;
  isAlt?: boolean;
}

interface KeystrokeAnalyzerProps {
  keystrokes: Keystroke[];
  realTimeMode?: boolean;
  showAdvancedMetrics?: boolean;
}

const KeystrokeAnalyzer: React.FC<KeystrokeAnalyzerProps> = ({
  keystrokes,
  realTimeMode = true,
  showAdvancedMetrics = true
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [keyHeatmap, setKeyHeatmap] = useState<{ [key: string]: number }>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update heatmap when keystrokes change
  useEffect(() => {
    const heatmap: { [key: string]: number } = {};
    keystrokes.forEach(keystroke => {
      heatmap[keystroke.key] = (heatmap[keystroke.key] || 0) + 1;
    });
    setKeyHeatmap(heatmap);
  }, [keystrokes]);

  // Advanced keystroke analytics
  const analytics = useMemo(() => {
    if (keystrokes.length === 0) {
      return {
        wpm: 0,
        cpm: 0,
        averageDwellTime: 0,
        averageFlightTime: 0,
        rhythmVariability: 0,
        typingPattern: 'insufficient-data' as const,
        biometricSignature: [],
        keyFrequencies: {},
        digraphTimings: {},
        commonMistakes: 0,
        confidenceScore: 0
      };
    }

    // Calculate basic metrics
    const totalChars = keystrokes.filter(k => k.key.length === 1 && /[a-zA-Z0-9]/.test(k.key)).length;
    const sessionDuration = keystrokes[keystrokes.length - 1].timestamp - keystrokes[0].timestamp;
    const sessionMinutes = Math.max(sessionDuration / (1000 * 60), 0.1);

    const wpm = (totalChars / 5) / sessionMinutes;
    const cpm = totalChars / sessionMinutes;

    // Dwell time analysis (key press duration)
    const dwellTimes = keystrokes.map(k => k.duration).filter(d => d > 0 && d < 1000);
    const averageDwellTime = dwellTimes.length > 0
      ? dwellTimes.reduce((sum, time) => sum + time, 0) / dwellTimes.length
      : 0;

    // Flight time analysis (time between key releases and next key presses)
    const flightTimes: number[] = [];
    for (let i = 1; i < keystrokes.length; i++) {
      const flightTime = keystrokes[i].timestamp - (keystrokes[i-1].timestamp + keystrokes[i-1].duration);
      if (flightTime >= 0 && flightTime < 2000) {
        flightTimes.push(flightTime);
      }
    }
    const averageFlightTime = flightTimes.length > 0
      ? flightTimes.reduce((sum, time) => sum + time, 0) / flightTimes.length
      : 0;

    // Rhythm variability (consistency of typing)
    let rhythmVariability = 0;
    if (flightTimes.length > 1) {
      const mean = averageFlightTime;
      const variance = flightTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / flightTimes.length;
      rhythmVariability = Math.sqrt(variance);
    }

    // Key frequency analysis
    const keyFrequencies: { [key: string]: number } = {};
    keystrokes.forEach(k => {
      keyFrequencies[k.key] = (keyFrequencies[k.key] || 0) + 1;
    });

    // Digraph timing analysis (two-key combinations)
    const digraphTimings: { [digraph: string]: number[] } = {};
    for (let i = 1; i < keystrokes.length; i++) {
      const digraph = keystrokes[i-1].key + keystrokes[i].key;
      const timing = keystrokes[i].timestamp - keystrokes[i-1].timestamp;
      if (!digraphTimings[digraph]) digraphTimings[digraph] = [];
      if (timing > 0 && timing < 1000) {
        digraphTimings[digraph].push(timing);
      }
    }

    // Typing pattern detection
    let typingPattern: 'hunt-peck' | 'touch-typing' | 'hybrid' | 'bot-like' | 'insufficient-data' = 'insufficient-data';

    if (keystrokes.length > 10) {
      const avgDwell = averageDwellTime;
      const avgFlight = averageFlightTime;
      const rhythm = rhythmVariability;

      if (avgDwell < 30 && avgFlight < 100 && rhythm < 50) {
        typingPattern = 'bot-like'; // Too consistent and fast
      } else if (avgDwell > 200 || avgFlight > 500 || rhythm > 300) {
        typingPattern = 'hunt-peck'; // Slow and inconsistent
      } else if (avgDwell < 100 && avgFlight < 200 && rhythm < 100) {
        typingPattern = 'touch-typing'; // Fast and consistent
      } else {
        typingPattern = 'hybrid'; // Mix of patterns
      }
    }

    // Biometric signature (unique pattern fingerprint)
    const biometricSignature = [
      Math.round(averageDwellTime * 100) / 100,
      Math.round(averageFlightTime * 100) / 100,
      Math.round(rhythmVariability * 100) / 100,
      Math.round(wpm * 100) / 100
    ];

    // Detect common mistakes (repeated deletions, corrections)
    const commonMistakes = keystrokes.filter(k =>
      k.key === 'Backspace' || k.key === 'Delete'
    ).length;

    // Confidence score based on data quality
    const confidenceScore = Math.min(100,
      (keystrokes.length / 50) * 30 + // Data volume
      (sessionDuration > 10000 ? 20 : sessionDuration / 500) + // Session length
      (dwellTimes.length / keystrokes.length) * 30 + // Data quality
      (typingPattern !== 'insufficient-data' ? 20 : 0) // Pattern detection
    );

    return {
      wpm: Math.round(wpm * 10) / 10,
      cpm: Math.round(cpm),
      averageDwellTime: Math.round(averageDwellTime),
      averageFlightTime: Math.round(averageFlightTime),
      rhythmVariability: Math.round(rhythmVariability),
      typingPattern,
      biometricSignature,
      keyFrequencies,
      digraphTimings,
      commonMistakes,
      confidenceScore: Math.round(confidenceScore)
    };
  }, [keystrokes]);

  // Draw timing visualization
  const drawTimingChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || keystrokes.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);

    // Get recent keystrokes for visualization
    const recentKeystrokes = keystrokes.slice(-100);
    const timings = recentKeystrokes.slice(1).map((k, i) =>
      k.timestamp - recentKeystrokes[i].timestamp
    );

    if (timings.length === 0) return;

    const maxTiming = Math.max(...timings, 500);
    const xStep = width / Math.max(timings.length, 1);

    // Draw grid
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw timing line
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    timings.forEach((timing, index) => {
      const x = index * xStep;
      const y = height - (timing / maxTiming) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw average line
    const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
    const avgY = height - (avgTiming / maxTiming) * height;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, avgY);
    ctx.lineTo(width, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw labels
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px monospace';
    ctx.fillText(`Avg: ${Math.round(avgTiming)}ms`, 10, avgY - 5);
    ctx.fillText(`Max: ${Math.round(maxTiming)}ms`, 10, 15);
  };

  // Update visualization
  useEffect(() => {
    if (realTimeMode) {
      drawTimingChart();
    }
  }, [keystrokes, realTimeMode]);

  // Keyboard heatmap component
  const KeyboardHeatmap: React.FC = () => {
    const qwertyLayout = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    const maxFrequency = Math.max(...Object.values(keyHeatmap), 1);

    return (
      <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
        <h4 style={{ color: '#ecf0f1', marginTop: 0, marginBottom: '15px' }}>Key Usage Heatmap</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
          {qwertyLayout.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', gap: '3px' }}>
              {row.map(key => {
                const frequency = keyHeatmap[key] || 0;
                const intensity = frequency / maxFrequency;
                return (
                  <div
                    key={key}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: `rgba(52, 152, 219, ${Math.max(0.1, intensity)})`,
                      border: activeKey === key ? '2px solid #f39c12' : '1px solid #34495e',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ecf0f1',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={() => setActiveKey(key)}
                    onMouseLeave={() => setActiveKey(null)}
                    title={`${key.toUpperCase()}: ${frequency} times`}
                  >
                    {key.toUpperCase()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#95a5a6', textAlign: 'center' }}>
          Hover over keys to see usage count
        </div>
      </div>
    );
  };

  const getPatternColor = (pattern: string) => {
    switch (pattern) {
      case 'touch-typing': return '#27ae60';
      case 'hunt-peck': return '#e74c3c';
      case 'hybrid': return '#f39c12';
      case 'bot-like': return '#8e44ad';
      default: return '#95a5a6';
    }
  };

  const getPatternDescription = (pattern: string) => {
    switch (pattern) {
      case 'touch-typing': return 'Fast, consistent typing with good rhythm';
      case 'hunt-peck': return 'Slower typing with longer pauses between keys';
      case 'hybrid': return 'Mixed pattern showing both fast and slow sequences';
      case 'bot-like': return 'Suspiciously consistent timing patterns';
      case 'insufficient-data': return 'Not enough data to determine pattern';
      default: return 'Unknown pattern';
    }
  };

  return (
    <div style={{
      backgroundColor: '#34495e',
      color: '#ecf0f1',
      padding: '20px',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ margin: '0 0 20px 0' }}>Keystroke Dynamics Analyzer</h2>

      {/* Main metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #3498db' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Typing Speed</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>{analytics.wpm} WPM</div>
          <div style={{ fontSize: '14px', color: '#95a5a6' }}>{analytics.cpm} CPM</div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #27ae60' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>Timing Analysis</h4>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            Dwell: <strong>{analytics.averageDwellTime}ms</strong>
          </div>
          <div style={{ fontSize: '14px', marginBottom: '5px' }}>
            Flight: <strong>{analytics.averageFlightTime}ms</strong>
          </div>
          <div style={{ fontSize: '14px' }}>
            Rhythm Var: <strong>{analytics.rhythmVariability}ms</strong>
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: `2px solid ${getPatternColor(analytics.typingPattern)}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: getPatternColor(analytics.typingPattern) }}>Pattern Detection</h4>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: getPatternColor(analytics.typingPattern), marginBottom: '5px' }}>
            {analytics.typingPattern.toUpperCase().replace('-', ' ')}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>
            {getPatternDescription(analytics.typingPattern)}
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #f39c12' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f39c12' }}>Biometric Profile</h4>
          <div style={{ fontSize: '12px', color: '#95a5a6', marginBottom: '8px' }}>Signature:</div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#f39c12' }}>
            [{analytics.biometricSignature.join(', ')}]
          </div>
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            Confidence: <strong>{analytics.confidenceScore}%</strong>
          </div>
        </div>
      </div>

      {/* Advanced metrics */}
      {showAdvancedMetrics && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: '#9b59b6', marginTop: 0 }}>Behavioral Indicators</h4>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div>Total Keystrokes: <strong>{keystrokes.length}</strong></div>
              <div>Corrections Made: <strong>{analytics.commonMistakes}</strong></div>
              <div>Error Rate: <strong>{keystrokes.length > 0 ? ((analytics.commonMistakes / keystrokes.length) * 100).toFixed(1) : 0}%</strong></div>
              <div>Session Quality: <strong>{analytics.confidenceScore > 70 ? 'High' : analytics.confidenceScore > 40 ? 'Medium' : 'Low'}</strong></div>
            </div>
          </div>

          <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: '#e67e22', marginTop: 0 }}>Timing Visualization</h4>
            <canvas
              ref={canvasRef}
              width={300}
              height={120}
              style={{
                border: '1px solid #34495e',
                borderRadius: '4px',
                backgroundColor: '#2c3e50'
              }}
            />
            <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
              Inter-keystroke intervals (last 100 keys)
            </div>
          </div>
        </div>
      )}

      {/* Keyboard heatmap */}
      <KeyboardHeatmap />

      {/* Most used digraphs */}
      {Object.keys(analytics.digraphTimings).length > 0 && (
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
          <h4 style={{ color: '#1abc9c', marginTop: 0 }}>Common Key Combinations</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {Object.entries(analytics.digraphTimings)
              .filter(([_, timings]) => timings.length >= 2)
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 10)
              .map(([digraph, timings]) => {
                const avgTiming = timings.reduce((sum, t) => sum + t, 0) / timings.length;
                return (
                  <div
                    key={digraph}
                    style={{
                      backgroundColor: '#34495e',
                      padding: '8px 12px',
                      borderRadius: '16px',
                      fontSize: '12px'
                    }}
                  >
                    <strong>'{digraph}'</strong> {Math.round(avgTiming)}ms ({timings.length}×)
                  </div>
                );
              })
            }
          </div>
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
        Analysis based on {keystrokes.length} keystrokes •
        Pattern confidence: {analytics.confidenceScore}% •
        {realTimeMode ? 'Real-time mode active' : 'Static analysis'}
      </div>
    </div>
  );
};

export default KeystrokeAnalyzer;
