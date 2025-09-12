// frontend/src/hooks/useBehaviorTracking.ts (Mouse and keyboard behavior tracking hook)
import { useState, useEffect, useRef, useCallback } from 'react';

interface MouseData {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  acceleration: number;
}

interface BehaviorData {
  mouseMovements: MouseData[];
  clicks: { x: number; y: number; timestamp: number }[];
  keystrokes: { key: string; timestamp: number; duration: number }[];
  sessionDuration: number;
  pageVisible: boolean;
}

export const useBehaviorTracking = () => {
  const [behaviorData, setBehaviorData] = useState<BehaviorData>({
    mouseMovements: [],
    clicks: [],
    keystrokes: [],
    sessionDuration: 0,
    pageVisible: true
  });

  const lastMousePos = useRef<{ x: number; y: number; timestamp: number }>({ x: 0, y: 0, timestamp: 0 });
  const sessionStart = useRef(Date.now());
  const keyPressStart = useRef<{ [key: string]: number }>({});

  // Calculate mouse velocity and acceleration
  const calculateVelocity = useCallback((x1: number, y1: number, x2: number, y2: number, timeDiff: number) => {
    const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return timeDiff > 0 ? distance / timeDiff : 0;
  }, []);

  // Mouse movement handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    const { x: lastX, y: lastY, timestamp: lastTime } = lastMousePos.current;

    const timeDiff = now - lastTime;
    const velocity = calculateVelocity(lastX, lastY, e.clientX, e.clientY, timeDiff);

    // Calculate acceleration (change in velocity)
    const acceleration = timeDiff > 0 ? velocity / timeDiff : 0;

    const mouseData: MouseData = {
      x: e.clientX,
      y: e.clientY,
      timestamp: now,
      velocity,
      acceleration
    };

    setBehaviorData(prev => ({
      ...prev,
      mouseMovements: [...prev.mouseMovements.slice(-49), mouseData], // Keep last 50 movements
      sessionDuration: now - sessionStart.current
    }));

    lastMousePos.current = { x: e.clientX, y: e.clientY, timestamp: now };
  }, [calculateVelocity]);

  // Click handler
  const handleClick = useCallback((e: MouseEvent) => {
    const clickData = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    };

    setBehaviorData(prev => ({
      ...prev,
      clicks: [...prev.clicks.slice(-19), clickData] // Keep last 20 clicks
    }));
  }, []);

  // Keystroke handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keyPressStart.current[e.key] = Date.now();
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const startTime = keyPressStart.current[e.key];
    if (startTime) {
      const duration = Date.now() - startTime;

      const keystrokeData = {
        key: e.key,
        timestamp: startTime,
        duration
      };

      setBehaviorData(prev => ({
        ...prev,
        keystrokes: [...prev.keystrokes.slice(-29), keystrokeData] // Keep last 30 keystrokes
      }));

      delete keyPressStart.current[e.key];
    }
  }, []);

  // Page visibility handler
  const handleVisibilityChange = useCallback(() => {
    setBehaviorData(prev => ({
      ...prev,
      pageVisible: !document.hidden
    }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown, { passive: true });
    document.addEventListener('keyup', handleKeyUp, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleMouseMove, handleClick, handleKeyDown, handleKeyUp, handleVisibilityChange]);

  // Get behavior analytics
  const getAnalytics = useCallback(() => {
    const { mouseMovements, clicks, keystrokes } = behaviorData;

    return {
      // Mouse metrics
      avgVelocity: mouseMovements.length > 0
        ? mouseMovements.reduce((sum, m) => sum + m.velocity, 0) / mouseMovements.length
        : 0,
      maxVelocity: mouseMovements.length > 0
        ? Math.max(...mouseMovements.map(m => m.velocity))
        : 0,

      // Click metrics
      clickFrequency: clicks.length > 0 && behaviorData.sessionDuration > 0
        ? clicks.length / (behaviorData.sessionDuration / 1000)
        : 0,

      // Keystroke metrics
      avgKeystrokeDuration: keystrokes.length > 0
        ? keystrokes.reduce((sum, k) => sum + k.duration, 0) / keystrokes.length
        : 0,

      // Session metrics
      sessionDuration: behaviorData.sessionDuration,
      isHuman: calculateHumanProbability()
    };
  }, [behaviorData]);

  // Simple human vs bot classification
  const calculateHumanProbability = useCallback(() => {
    const analytics = {
      avgVelocity: behaviorData.mouseMovements.length > 0
        ? behaviorData.mouseMovements.reduce((sum, m) => sum + m.velocity, 0) / behaviorData.mouseMovements.length
        : 0,
      clickFrequency: behaviorData.clicks.length > 0 && behaviorData.sessionDuration > 0
        ? behaviorData.clicks.length / (behaviorData.sessionDuration / 1000)
        : 0
    };

    let score = 0.5; // Neutral start

    // Human-like mouse velocity (not too fast, not too slow)
    if (analytics.avgVelocity > 0.1 && analytics.avgVelocity < 5.0) score += 0.2;

    // Human-like click frequency (not too frequent)
    if (analytics.clickFrequency > 0.01 && analytics.clickFrequency < 5.0) score += 0.2;

    // Has mouse movement variation
    if (behaviorData.mouseMovements.length > 10) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }, [behaviorData]);

  return {
    behaviorData,
    analytics: getAnalytics(),
    isTracking: true,
    reset: () => {
      setBehaviorData({
        mouseMovements: [],
        clicks: [],
        keystrokes: [],
        sessionDuration: 0,
        pageVisible: true
      });
      sessionStart.current = Date.now();
    }
  };
};
