// frontend/src/components/analytics/TouchBehavior.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
  radiusX?: number;
  radiusY?: number;
  rotationAngle?: number;
  force?: number;
}

interface TouchEvent {
  type: 'start' | 'move' | 'end';
  touches: TouchPoint[];
  timestamp: number;
}

interface Gesture {
  type: 'tap' | 'long-press' | 'swipe' | 'pinch' | 'scroll' | 'multi-touch';
  startTime: number;
  endTime: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  velocity: number;
  distance: number;
  pressure: number[];
  confidence: number;
}

interface TouchBehaviorProps {
  touchEvents: TouchEvent[];
  realTimeMode?: boolean;
  showHeatmap?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
}

const TouchBehavior: React.FC<TouchBehaviorProps> = ({
  touchEvents,
  realTimeMode = true,
  showHeatmap = true,
  canvasWidth = 400,
  canvasHeight = 600
}) => {
  const [currentTouches, setCurrentTouches] = useState<TouchPoint[]>([]);
  const [detectedGestures, setDetectedGestures] = useState<Gesture[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchHeatmapRef = useRef<{ [key: string]: number }>({});

  // Gesture detection logic
  const detectGesture = useCallback((events: TouchEvent[]): Gesture | null => {
    if (events.length < 2) return null;

    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const duration = lastEvent.timestamp - firstEvent.timestamp;

    if (firstEvent.touches.length === 0 || lastEvent.touches.length === 0) return null;

    const startTouch = firstEvent.touches[0];
    const endTouch = lastEvent.touches[0];

    const distance = Math.sqrt(
      Math.pow(endTouch.x - startTouch.x, 2) + Math.pow(endTouch.y - startTouch.y, 2)
    );

    const velocity = duration > 0 ? distance / duration : 0;

    const pressures = events
      .flatMap(e => e.touches)
      .map(t => t.pressure || 0)
      .filter(p => p > 0);

    const avgPressure = pressures.length > 0
      ? pressures.reduce((sum, p) => sum + p, 0) / pressures.length
      : 0;

    // Gesture classification
    let gestureType: Gesture['type'] = 'tap';
    let confidence = 0.5;

    if (duration > 500 && distance < 20) {
      gestureType = 'long-press';
      confidence = 0.8;
    } else if (distance > 50 && velocity > 0.1) {
      gestureType = 'swipe';
      confidence = 0.7;
    } else if (distance < 30 && duration < 300) {
      gestureType = 'tap';
      confidence = 0.9;
    } else if (firstEvent.touches.length > 1 || events.some(e => e.touches.length > 1)) {
      gestureType = 'multi-touch';
      confidence = 0.6;
    }

    return {
      type: gestureType,
      startTime: firstEvent.timestamp,
      endTime: lastEvent.timestamp,
      startPosition: { x: startTouch.x, y: startTouch.y },
      endPosition: { x: endTouch.x, y: endTouch.y },
      velocity,
      distance,
      pressure: pressures,
      confidence
    };
  }, []);

  // Process touch events for gesture detection
  useEffect(() => {
    if (touchEvents.length < 2) return;

    // Group consecutive events into potential gestures
    const gestureGroups: TouchEvent[][] = [];
    let currentGroup: TouchEvent[] = [];

    touchEvents.forEach((event, index) => {
      if (event.type === 'start') {
        if (currentGroup.length > 0) {
          gestureGroups.push(currentGroup);
        }
        currentGroup = [event];
      } else {
        currentGroup.push(event);
        if (event.type === 'end') {
          gestureGroups.push(currentGroup);
          currentGroup = [];
        }
      }
    });

    // Detect gestures from groups
    const newGestures: Gesture[] = [];
    gestureGroups.forEach(group => {
      const gesture = detectGesture(group);
      if (gesture) {
        newGestures.push(gesture);
      }
    });

    setDetectedGestures(prev => [...prev.slice(-20), ...newGestures].slice(-50));

    // Update heatmap
    touchEvents.forEach(event => {
      event.touches.forEach(touch => {
        const gridX = Math.floor(touch.x / 20) * 20;
        const gridY = Math.floor(touch.y / 20) * 20;
        const key = `${gridX},${gridY}`;
        touchHeatmapRef.current[key] = (touchHeatmapRef.current[key] || 0) + 1;
      });
    });
  }, [touchEvents, detectGesture]);

  // Comprehensive touch analytics
  const analytics = useMemo(() => {
    if (touchEvents.length === 0) {
      return {
        totalTouches: 0,
        avgPressure: 0,
        avgTouchDuration: 0,
        avgVelocity: 0,
        gestureFrequency: {},
        touchDistribution: { top: 0, middle: 0, bottom: 0 },
        multiTouchEvents: 0,
        dominantHand: 'unknown' as 'left' | 'right' | 'unknown',
        touchPrecision: 0,
        behaviorPattern: 'insufficient-data' as 'natural' | 'synthetic' | 'erratic' | 'insufficient-data'
      };
    }

    const allTouches = touchEvents.flatMap(e => e.touches);
    const totalTouches = allTouches.length;

    // Pressure analysis
    const pressures = allTouches.map(t => t.pressure || 0).filter(p => p > 0);
    const avgPressure = pressures.length > 0
      ? pressures.reduce((sum, p) => sum + p, 0) / pressures.length
      : 0;

    // Duration analysis
    const touchDurations: number[] = [];
    let currentTouchStart: { [id: number]: number } = {};

    touchEvents.forEach(event => {
      if (event.type === 'start') {
        event.touches.forEach(touch => {
          currentTouchStart[touch.id] = event.timestamp;
        });
      } else if (event.type === 'end') {
        event.touches.forEach(touch => {
          if (currentTouchStart[touch.id]) {
            touchDurations.push(event.timestamp - currentTouchStart[touch.id]);
            delete currentTouchStart[touch.id];
          }
        });
      }
    });

    const avgTouchDuration = touchDurations.length > 0
      ? touchDurations.reduce((sum, d) => sum + d, 0) / touchDurations.length
      : 0;

    // Velocity analysis
    const velocities: number[] = [];
    for (let i = 1; i < touchEvents.length; i++) {
      const prevEvent = touchEvents[i - 1];
      const currentEvent = touchEvents[i];

      if (prevEvent.touches.length > 0 && currentEvent.touches.length > 0) {
        const prevTouch = prevEvent.touches[0];
        const currentTouch = currentEvent.touches[0];

        const distance = Math.sqrt(
          Math.pow(currentTouch.x - prevTouch.x, 2) +
          Math.pow(currentTouch.y - prevTouch.y, 2)
        );

        const timeDiff = currentEvent.timestamp - prevEvent.timestamp;
        if (timeDiff > 0) {
          velocities.push(distance / timeDiff);
        }
      }
    }

    const avgVelocity = velocities.length > 0
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
      : 0;

    // Gesture frequency analysis
    const gestureFrequency: { [key: string]: number } = {};
    detectedGestures.forEach(gesture => {
      gestureFrequency[gesture.type] = (gestureFrequency[gesture.type] || 0) + 1;
    });

    // Touch distribution analysis
    const screenHeight = canvasHeight;
    const touchDistribution = { top: 0, middle: 0, bottom: 0 };

    allTouches.forEach(touch => {
      if (touch.y < screenHeight / 3) {
        touchDistribution.top++;
      } else if (touch.y < (screenHeight * 2) / 3) {
        touchDistribution.middle++;
      } else {
        touchDistribution.bottom++;
      }
    });

    // Multi-touch detection
    const multiTouchEvents = touchEvents.filter(e => e.touches.length > 1).length;

    // Dominant hand detection (simplified heuristic)
    const screenWidth = canvasWidth;
    const leftSideTouches = allTouches.filter(t => t.x < screenWidth / 2).length;
    const rightSideTouches = allTouches.filter(t => t.x >= screenWidth / 2).length;

    let dominantHand: 'left' | 'right' | 'unknown' = 'unknown';
    if (leftSideTouches > rightSideTouches * 1.5) {
      dominantHand = 'right'; // Right-handed users tend to touch more on the left side
    } else if (rightSideTouches > leftSideTouches * 1.5) {
      dominantHand = 'left';
    }

    // Touch precision analysis
    const touchAreas = allTouches.map(t => (t.radiusX || 5) * (t.radiusY || 5));
    const avgTouchArea = touchAreas.length > 0
      ? touchAreas.reduce((sum, area) => sum + area, 0) / touchAreas.length
      : 25;
    const touchPrecision = Math.max(0, 100 - avgTouchArea); // Smaller area = higher precision

    // Behavior pattern detection
    let behaviorPattern: 'natural' | 'synthetic' | 'erratic' | 'insufficient-data' = 'insufficient-data';

    if (totalTouches > 10) {
      const pressureVariance = pressures.length > 1
        ? pressures.reduce((sum, p) => sum + Math.pow(p - avgPressure, 2), 0) / pressures.length
        : 0;

      const velocityVariance = velocities.length > 1
        ? velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length
        : 0;

      if (pressureVariance < 0.01 && velocityVariance < 0.1) {
        behaviorPattern = 'synthetic'; // Too consistent
      } else if (pressureVariance > 0.5 || velocityVariance > 2) {
        behaviorPattern = 'erratic'; // Too inconsistent
      } else {
        behaviorPattern = 'natural';
      }
    }

    return {
      totalTouches,
      avgPressure: Math.round(avgPressure * 1000) / 1000,
      avgTouchDuration: Math.round(avgTouchDuration),
      avgVelocity: Math.round(avgVelocity * 1000) / 1000,
      gestureFrequency,
      touchDistribution,
      multiTouchEvents,
      dominantHand,
      touchPrecision: Math.round(touchPrecision),
      behaviorPattern
    };
  }, [touchEvents, detectedGestures, canvasWidth, canvasHeight]);

  // Draw touch visualization
  const drawVisualization = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw heatmap
    if (showHeatmap) {
      const maxHeat = Math.max(...Object.values(touchHeatmapRef.current), 1);
      Object.entries(touchHeatmapRef.current).forEach(([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        const intensity = count / maxHeat;
        ctx.fillStyle = `rgba(255, 100, 100, ${intensity * 0.6})`;
        ctx.fillRect(x, y, 20, 20);
      });
    }

    // Draw recent touch points
    const recentEvents = touchEvents.slice(-20);
    recentEvents.forEach((event, eventIndex) => {
      event.touches.forEach(touch => {
        const age = (Date.now() - event.timestamp) / 1000;
        const alpha = Math.max(0.2, 1 - age / 10);

        // Touch point
        ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(touch.x, touch.y, (touch.pressure || 0.5) * 20, 0, Math.PI * 2);
        ctx.fill();

        // Touch ID
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(touch.id.toString(), touch.x + 15, touch.y - 15);
      });
    });

    // Draw detected gestures
    detectedGestures.slice(-10).forEach((gesture, index) => {
      const alpha = Math.max(0.3, 1 - index / 10);

      ctx.strokeStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gesture.startPosition.x, gesture.startPosition.y);
      ctx.lineTo(gesture.endPosition.x, gesture.endPosition.y);
      ctx.stroke();

      // Gesture label
      ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.font = '12px Arial';
      ctx.fillText(
        gesture.type,
        (gesture.startPosition.x + gesture.endPosition.x) / 2,
        (gesture.startPosition.y + gesture.endPosition.y) / 2
      );
    });

    // Current touches
    currentTouches.forEach(touch => {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(touch.x, touch.y, 15, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, [touchEvents, detectedGestures, currentTouches, showHeatmap, canvasWidth, canvasHeight]);

  // Update visualization
  useEffect(() => {
    if (realTimeMode) {
      drawVisualization();
    }
  }, [drawVisualization, realTimeMode]);

  const getBehaviorColor = (pattern: string) => {
    switch (pattern) {
      case 'natural': return '#27ae60';
      case 'synthetic': return '#e74c3c';
      case 'erratic': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getBehaviorDescription = (pattern: string) => {
    switch (pattern) {
      case 'natural': return 'Normal human touch patterns detected';
      case 'synthetic': return 'Suspiciously consistent touch behavior';
      case 'erratic': return 'Highly variable touch patterns';
      default: return 'Insufficient data for pattern analysis';
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
      <h2 style={{ margin: '0 0 20px 0' }}>Touch Behavior Analyzer</h2>

      {/* Main metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #3498db' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Touch Activity</h4>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3498db' }}>{analytics.totalTouches}</div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>Total touches</div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #27ae60' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>Pressure</h4>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#27ae60' }}>{analytics.avgPressure}</div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>Average pressure</div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #e67e22' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#e67e22' }}>Duration</h4>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e67e22' }}>{analytics.avgTouchDuration}ms</div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>Average touch</div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: `2px solid ${getBehaviorColor(analytics.behaviorPattern)}` }}>
          <h4 style={{ margin: '0 0 10px 0', color: getBehaviorColor(analytics.behaviorPattern) }}>Pattern</h4>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: getBehaviorColor(analytics.behaviorPattern) }}>
            {analytics.behaviorPattern.toUpperCase()}
          </div>
          <div style={{ fontSize: '11px', color: '#95a5a6', marginTop: '5px' }}>
            {getBehaviorDescription(analytics.behaviorPattern)}
          </div>
        </div>
      </div>

      {/* Visualization and detailed analytics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ color: '#9b59b6', marginTop: 0 }}>Touch Visualization</h4>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            style={{
              border: '1px solid #34495e',
              borderRadius: '4px',
              backgroundColor: '#1a1a2e',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
          <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
            {showHeatmap ? 'Heatmap + ' : ''}Recent touches and gestures
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {/* Gesture analysis */}
          <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: '#1abc9c', marginTop: 0 }}>Detected Gestures</h4>
            <div style={{ fontSize: '14px' }}>
              {Object.entries(analytics.gestureFrequency).map(([gesture, count]) => (
                <div key={gesture} style={{ marginBottom: '5px' }}>
                  {gesture}: <strong>{count}</strong>
                </div>
              ))}
              {Object.keys(analytics.gestureFrequency).length === 0 && (
                <div style={{ color: '#95a5a6' }}>No gestures detected yet</div>
              )}
            </div>
          </div>

          {/* Touch distribution */}
          <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: '#f39c12', marginTop: 0 }}>Touch Distribution</h4>
            <div style={{ fontSize: '14px' }}>
              <div>Top: <strong>{analytics.touchDistribution.top}</strong></div>
              <div>Middle: <strong>{analytics.touchDistribution.middle}</strong></div>
              <div>Bottom: <strong>{analytics.touchDistribution.bottom}</strong></div>
              <div style={{ marginTop: '8px' }}>
                Dominant Hand: <strong style={{ color: analytics.dominantHand === 'unknown' ? '#95a5a6' : '#fff' }}>
                  {analytics.dominantHand}
                </strong>
              </div>
              <div>Precision: <strong>{analytics.touchPrecision}%</strong></div>
            </div>
          </div>

          {/* Advanced metrics */}
          <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
            <h4 style={{ color: '#e67e22', marginTop: 0 }}>Advanced Metrics</h4>
            <div style={{ fontSize: '14px' }}>
              <div>Multi-touch Events: <strong>{analytics.multiTouchEvents}</strong></div>
              <div>Avg Velocity: <strong>{analytics.avgVelocity}</strong> px/ms</div>
              <div>Recent Gestures: <strong>{detectedGestures.slice(-10).length}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#1a252f',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#95a5a6'
      }}>
        Analyzed {touchEvents.length} touch events •
        Pattern: {analytics.behaviorPattern} •
        {realTimeMode ? 'Real-time analysis active' : 'Static analysis'}
      </div>
    </div>
  );
};

export default TouchBehavior;
