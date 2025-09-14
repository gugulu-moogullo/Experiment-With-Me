// frontend/src/components/testing/MouseVisualizer.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

interface MousePoint {
  x: number;
  y: number;
  timestamp: number;
  velocity: number;
  pressure?: number;
}

interface MouseVisualizerProps {
  mouseData: MousePoint[];
  showTrail?: boolean;
  showHeatmap?: boolean;
  showVelocityColors?: boolean;
  width?: number;
  height?: number;
}

const MouseVisualizer: React.FC<MouseVisualizerProps> = ({
  mouseData,
  showTrail = true,
  showHeatmap = false,
  showVelocityColors = true,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const trailRef = useRef<MousePoint[]>([]);

  // Handle mouse movement within visualizer
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setCurrentMouse({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Get color based on velocity
  const getVelocityColor = useCallback((velocity: number): string => {
    if (velocity < 0.5) return '#00ff00'; // Green - slow
    if (velocity < 1.5) return '#ffff00'; // Yellow - medium
    if (velocity < 3.0) return '#ff8000'; // Orange - fast
    return '#ff0000'; // Red - very fast
  }, []);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333366';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (mouseData.length === 0) return;

    // Draw heatmap
    if (showHeatmap) {
      const heatmapData: { [key: string]: number } = {};
      mouseData.forEach(point => {
        const gridX = Math.floor(point.x / 20) * 20;
        const gridY = Math.floor(point.y / 20) * 20;
        const key = `${gridX},${gridY}`;
        heatmapData[key] = (heatmapData[key] || 0) + 1;
      });

      const maxCount = Math.max(...Object.values(heatmapData));
      Object.entries(heatmapData).forEach(([key, count]) => {
        const [x, y] = key.split(',').map(Number);
        const intensity = count / maxCount;
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
        ctx.fillRect(x, y, 20, 20);
      });
    }

    // Draw mouse trail
    if (showTrail && mouseData.length > 1) {
      for (let i = 1; i < mouseData.length; i++) {
        const current = mouseData[i];
        const previous = mouseData[i - 1];

        ctx.lineWidth = 2;

        if (showVelocityColors) {
          ctx.strokeStyle = getVelocityColor(current.velocity);
        } else {
          const alpha = Math.max(0.1, 1 - (mouseData.length - i) / mouseData.length);
          ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
        }

        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();

        // Draw velocity indicators
        if (current.velocity > 2.0) {
          ctx.fillStyle = getVelocityColor(current.velocity);
          ctx.beginPath();
          ctx.arc(current.x, current.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw individual points
    mouseData.forEach((point, index) => {
      const age = (Date.now() - point.timestamp) / 1000; // Age in seconds
      if (age > 10) return; // Don't draw very old points

      const alpha = Math.max(0.1, 1 - age / 10);
      const size = showVelocityColors ? Math.max(1, point.velocity) : 2;

      ctx.fillStyle = showVelocityColors
        ? getVelocityColor(point.velocity)
        : `rgba(100, 200, 255, ${alpha})`;

      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw current mouse position (if mouse is over canvas)
    if (isMouseOver) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(currentMouse.x, currentMouse.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Draw crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(currentMouse.x - 10, currentMouse.y);
      ctx.lineTo(currentMouse.x + 10, currentMouse.y);
      ctx.moveTo(currentMouse.x, currentMouse.y - 10);
      ctx.lineTo(currentMouse.x, currentMouse.y + 10);
      ctx.stroke();
    }

    // Draw statistics
    drawStatistics(ctx);
  }, [mouseData, showTrail, showHeatmap, showVelocityColors, width, height, currentMouse, isMouseOver, getVelocityColor]);

  const drawStatistics = useCallback((ctx: CanvasRenderingContext2D) => {
    if (mouseData.length === 0) return;

    const velocities = mouseData.map(p => p.velocity).filter(v => v > 0);
    const avgVelocity = velocities.length > 0 ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0;
    const maxVelocity = velocities.length > 0 ? Math.max(...velocities) : 0;

    // Background for stats
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 250, 120);

    // Text styles
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';

    // Draw stats
    ctx.fillText(`Points: ${mouseData.length}`, 20, 30);
    ctx.fillText(`Avg Velocity: ${avgVelocity.toFixed(2)} px/ms`, 20, 50);
    ctx.fillText(`Max Velocity: ${maxVelocity.toFixed(2)} px/ms`, 20, 70);
    ctx.fillText(`Current: (${currentMouse.x}, ${currentMouse.y})`, 20, 90);
    ctx.fillText(`Duration: ${mouseData.length > 0 ? ((Date.now() - mouseData[0].timestamp) / 1000).toFixed(1) : 0}s`, 20, 110);

    // Velocity legend
    if (showVelocityColors) {
      const legendY = height - 80;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Velocity Legend:', 20, legendY);

      const colors = [
        { color: '#00ff00', label: 'Slow (0-0.5)' },
        { color: '#ffff00', label: 'Medium (0.5-1.5)' },
        { color: '#ff8000', label: 'Fast (1.5-3.0)' },
        { color: '#ff0000', label: 'Very Fast (3.0+)' }
      ];

      colors.forEach((item, index) => {
        ctx.fillStyle = item.color;
        ctx.fillRect(20, legendY + 15 + (index * 15), 10, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(item.label, 35, legendY + 25 + (index * 15));
      });
    }
  }, [mouseData, currentMouse, height, showVelocityColors]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      requestAnimationFrame(animate);
    };
    animate();
  }, [draw]);

  // Clear old points periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      trailRef.current = trailRef.current.filter(point => now - point.timestamp < 30000); // Keep for 30 seconds
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const clearTrail = () => {
    trailRef.current = [];
  };

  return (
    <div style={{
      border: '2px solid #333',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#1a1a2e'
    }}>
      <div style={{
        backgroundColor: '#16213e',
        padding: '10px',
        borderBottom: '1px solid #333',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0 }}>Mouse Movement Visualizer</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={clearTrail}
            style={{
              padding: '5px 10px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Clear Trail
          </button>
          <span style={{ fontSize: '12px', color: '#aaa' }}>
            {mouseData.length} points tracked
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsMouseOver(true)}
        onMouseLeave={() => setIsMouseOver(false)}
        style={{
          display: 'block',
          cursor: 'crosshair'
        }}
      />

      <div style={{
        backgroundColor: '#16213e',
        padding: '8px',
        borderTop: '1px solid #333',
        color: '#aaa',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div>
          Trail: {showTrail ? 'ON' : 'OFF'} |
          Heatmap: {showHeatmap ? 'ON' : 'OFF'} |
          Velocity Colors: {showVelocityColors ? 'ON' : 'OFF'}
        </div>
        <div>
          Move mouse to see real-time tracking
        </div>
      </div>
    </div>
  );
};

export default MouseVisualizer;
