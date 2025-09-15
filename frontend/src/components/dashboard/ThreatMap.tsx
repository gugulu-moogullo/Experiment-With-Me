// frontend/src/components/dashboard/ThreatMap.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface ThreatEvent {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  ipAddress: string;
  country: string;
  city: string;
  threatType: 'bot-attack' | 'suspicious-behavior' | 'challenge-failure' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  userAgent: string;
  sessionId: string;
  attackVector?: string;
}

interface ThreatCluster {
  id: string;
  centerLat: number;
  centerLng: number;
  events: ThreatEvent[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  radius: number;
}

interface ThreatMapProps {
  width?: number;
  height?: number;
  autoRefresh?: boolean;
  showClusters?: boolean;
  timeWindow?: number; // minutes
}

const ThreatMap: React.FC<ThreatMapProps> = ({
  width = 1200,
  height = 700,
  autoRefresh = true,
  showClusters = true,
  timeWindow = 60
}) => {
  const [threatEvents, setThreatEvents] = useState<ThreatEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ThreatEvent | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showClustersState, setShowClustersState] = useState(showClusters);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Generate mock threat data
  useEffect(() => {
    const generateThreatEvent = (): ThreatEvent => {
      const threatTypes: ThreatEvent['threatType'][] = ['bot-attack', 'suspicious-behavior', 'challenge-failure', 'anomaly'];
      const severities: ThreatEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
      const countries = ['USA', 'China', 'Russia', 'Brazil', 'India', 'Germany', 'UK', 'France', 'Japan', 'Australia'];
      const cities = ['New York', 'Beijing', 'Moscow', 'São Paulo', 'Mumbai', 'Berlin', 'London', 'Paris', 'Tokyo', 'Sydney'];

      return {
        id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        latitude: (Math.random() - 0.5) * 160, // -80 to 80
        longitude: (Math.random() - 0.5) * 360, // -180 to 180
        ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        country: countries[Math.floor(Math.random() * countries.length)],
        city: cities[Math.floor(Math.random() * cities.length)],
        threatType: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        riskScore: Math.random() * 100,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
        attackVector: Math.random() > 0.5 ? 'Automated Bot' : 'Suspicious Pattern'
      };
    };

    // Initial data
    const initialEvents = Array.from({ length: 50 }, generateThreatEvent);
    setThreatEvents(initialEvents);

    if (autoRefresh) {
      const interval = setInterval(() => {
        if (Math.random() < 0.7) { // 70% chance of new event
          const newEvent = generateThreatEvent();
          setThreatEvents(prev => {
            const cutoffTime = Date.now() - (timeWindow * 60 * 1000);
            const filtered = prev.filter(event => event.timestamp > cutoffTime);
            return [newEvent, ...filtered].slice(0, 200); // Keep max 200 events
          });
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeWindow]);

  // Calculate threat clusters
  const threatClusters = useMemo(() => {
    if (!showClustersState) return [];

    const clusters: ThreatCluster[] = [];
    const processedEvents = new Set<string>();

    threatEvents.forEach(event => {
      if (processedEvents.has(event.id)) return;

      // Find nearby events within 50 units
      const nearbyEvents = threatEvents.filter(other => {
        const distance = Math.sqrt(
          Math.pow(event.latitude - other.latitude, 2) +
          Math.pow(event.longitude - other.longitude, 2)
        );
        return distance <= 50 && !processedEvents.has(other.id);
      });

      if (nearbyEvents.length > 1) {
        const cluster: ThreatCluster = {
          id: `cluster_${event.id}`,
          centerLat: nearbyEvents.reduce((sum, e) => sum + e.latitude, 0) / nearbyEvents.length,
          centerLng: nearbyEvents.reduce((sum, e) => sum + e.longitude, 0) / nearbyEvents.length,
          events: nearbyEvents,
          severity: nearbyEvents.some(e => e.severity === 'critical') ? 'critical' :
                   nearbyEvents.some(e => e.severity === 'high') ? 'high' :
                   nearbyEvents.some(e => e.severity === 'medium') ? 'medium' : 'low',
          radius: Math.max(10, nearbyEvents.length * 3)
        };

        clusters.push(cluster);
        nearbyEvents.forEach(e => processedEvents.add(e.id));
      }
    });

    return clusters;
  }, [threatEvents, showClustersState]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return threatEvents;
    return threatEvents.filter(event => event.threatType === filterType);
  }, [threatEvents, filterType]);

  // Convert lat/lng to SVG coordinates
  const projectCoordinates = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * width * zoomLevel + panOffset.x;
    const y = ((90 - lat) / 180) * height * zoomLevel + panOffset.y;
    return { x, y };
  };

  const getSeverityColor = (severity: ThreatEvent['severity']) => {
    switch (severity) {
      case 'critical': return '#8e44ad';
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#f1c40f';
      default: return '#95a5a6';
    }
  };

  const getThreatTypeIcon = (type: ThreatEvent['threatType']) => {
    switch (type) {
      case 'bot-attack': return '🤖';
      case 'suspicious-behavior': return '⚠️';
      case 'challenge-failure': return '❌';
      case 'anomaly': return '🔍';
      default: return '•';
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  return (
    <div style={{
      backgroundColor: '#2c3e50',
      color: '#ecf0f1',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#34495e',
        padding: '15px',
        borderBottom: '2px solid #e74c3c'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, color: '#e74c3c' }}>Global Threat Intelligence</h3>
            <div style={{ fontSize: '14px', color: '#95a5a6', marginTop: '5px' }}>
              {filteredEvents.length} active threats • {threatClusters.length} clusters detected
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                backgroundColor: '#2c3e50',
                color: '#ecf0f1',
                border: '1px solid #e74c3c',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="all">All Threats</option>
              <option value="bot-attack">Bot Attacks</option>
              <option value="suspicious-behavior">Suspicious Behavior</option>
              <option value="challenge-failure">Challenge Failures</option>
              <option value="anomaly">Anomalies</option>
            </select>

            <button
              onClick={() => setShowClustersState(!showClustersState)}
              style={{
                backgroundColor: showClustersState ? '#27ae60' : '#95a5a6',
                color: 'white',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {showClustersState ? 'Clusters ON' : 'Clusters OFF'}
            </button>

            <div style={{ fontSize: '12px', color: '#95a5a6' }}>
              Zoom: {(zoomLevel * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{
            backgroundColor: '#1a252f',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* World map grid */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#34495e" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Continental outlines (simplified) */}
          <g opacity="0.3">
            <rect x={width * 0.1} y={height * 0.2} width={width * 0.25} height={height * 0.4}
                  fill="none" stroke="#7f8c8d" strokeWidth="1" rx="20" />
            <rect x={width * 0.4} y={height * 0.15} width={width * 0.35} height={height * 0.5}
                  fill="none" stroke="#7f8c8d" strokeWidth="1" rx="30" />
            <rect x={width * 0.8} y={height * 0.3} width={width * 0.15} height={height * 0.3}
                  fill="none" stroke="#7f8c8d" strokeWidth="1" rx="15" />
          </g>

          {/* Threat clusters */}
          {showClustersState && threatClusters.map(cluster => {
            const { x, y } = projectCoordinates(cluster.centerLat, cluster.centerLng);
            return (
              <g key={cluster.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={cluster.radius}
                  fill={getSeverityColor(cluster.severity)}
                  opacity={0.2}
                  stroke={getSeverityColor(cluster.severity)}
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill={getSeverityColor(cluster.severity)}
                />
                <text
                  x={x}
                  y={y - cluster.radius - 5}
                  textAnchor="middle"
                  fill="#ecf0f1"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {cluster.events.length}
                </text>
              </g>
            );
          })}

          {/* Individual threat events */}
          {filteredEvents.map(event => {
            const { x, y } = projectCoordinates(event.latitude, event.longitude);
            const isSelected = selectedEvent?.id === event.id;
            const age = (Date.now() - event.timestamp) / 1000;
            const opacity = Math.max(0.3, 1 - age / (timeWindow * 60));

            if (x < -50 || x > width + 50 || y < -50 || y > height + 50) return null;

            return (
              <g key={event.id} opacity={opacity}>
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : event.severity === 'critical' ? 6 : 4}
                  fill={getSeverityColor(event.severity)}
                  stroke={isSelected ? '#ffffff' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedEvent(event)}
                />

                {/* Pulse animation for recent events */}
                {age < 10 && (
                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill="none"
                    stroke={getSeverityColor(event.severity)}
                    strokeWidth="1"
                    opacity={1 - age / 10}
                  >
                    <animate
                      attributeName="r"
                      values="4;12;4"
                      dur="2s"
                      repeatCount="5"
                    />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Event details panel */}
        {selectedEvent && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: '#34495e',
              padding: '15px',
              borderRadius: '8px',
              border: `2px solid ${getSeverityColor(selectedEvent.severity)}`,
              minWidth: '250px',
              maxWidth: '300px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, color: getSeverityColor(selectedEvent.severity) }}>
                Threat Details
              </h4>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#95a5a6',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Type:</strong> {getThreatTypeIcon(selectedEvent.threatType)} {selectedEvent.threatType.replace('-', ' ').toUpperCase()}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Severity:</strong>
                <span style={{
                  color: getSeverityColor(selectedEvent.severity),
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  marginLeft: '5px'
                }}>
                  {selectedEvent.severity}
                </span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Risk Score:</strong> {selectedEvent.riskScore.toFixed(1)}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Location:</strong> {selectedEvent.city}, {selectedEvent.country}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>IP Address:</strong> {selectedEvent.ipAddress}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Session:</strong> {selectedEvent.sessionId.slice(-8)}...
              </div>
              {selectedEvent.attackVector && (
                <div style={{ marginBottom: '8px' }}>
                  <strong>Vector:</strong> {selectedEvent.attackVector}
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                <strong>Time:</strong> {new Date(selectedEvent.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: 'rgba(52, 73, 94, 0.9)',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        >
          <h5 style={{ margin: '0 0 10px 0', color: '#ecf0f1' }}>Threat Severity</h5>
          {(['low', 'medium', 'high', 'critical'] as const).map(severity => (
            <div key={severity} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getSeverityColor(severity),
                  marginRight: '8px'
                }}
              />
              <span style={{ textTransform: 'capitalize' }}>{severity}</span>
            </div>
          ))}
          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #7f8c8d' }}>
            <div style={{ color: '#95a5a6' }}>
              Mouse: Pan • Wheel: Zoom
            </div>
          </div>
        </div>

        {/* Statistics overlay */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(52, 73, 94, 0.9)',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px'
          }}
        >
          <h5 style={{ margin: '0 0 10px 0', color: '#ecf0f1' }}>Live Statistics</h5>
          <div>Active Threats: <strong>{filteredEvents.length}</strong></div>
          <div>Critical: <strong>{filteredEvents.filter(e => e.severity === 'critical').length}</strong></div>
          <div>High Risk: <strong>{filteredEvents.filter(e => e.severity === 'high').length}</strong></div>
          <div>Clusters: <strong>{threatClusters.length}</strong></div>
          <div style={{ marginTop: '8px', color: '#95a5a6' }}>
            Last Update: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatMap;
