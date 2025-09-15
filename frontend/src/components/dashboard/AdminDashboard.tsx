// frontend/src/components/dashboard/AdminDashboard.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';

interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  humanVerified: number;
  botDetected: number;
  challengesPresented: number;
  averageResponseTime: number;
  systemUptime: number;
  errorRate: number;
}

interface ThreatAlert {
  id: string;
  type: 'high-risk' | 'suspicious' | 'anomaly' | 'system';
  message: string;
  timestamp: number;
  sessionId: string;
  riskScore: number;
  resolved: boolean;
}

interface UserSession {
  id: string;
  startTime: number;
  endTime?: number;
  ipAddress: string;
  userAgent: string;
  behaviorScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  challengesCompleted: number;
  verification: 'pending' | 'human' | 'bot' | 'failed';
  deviceFingerprint: string;
}

interface AdminDashboardProps {
  refreshInterval?: number;
  showRealTimeUpdates?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  refreshInterval = 5000,
  showRealTimeUpdates = true
}) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    humanVerified: 0,
    botDetected: 0,
    challengesPresented: 0,
    averageResponseTime: 0,
    systemUptime: 0,
    errorRate: 0
  });

  const [alerts, setAlerts] = useState<ThreatAlert[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'threats' | 'sessions' | 'analytics'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const metricsHistoryRef = useRef<SystemMetrics[]>([]);

  // Simulate real-time data updates
  useEffect(() => {
    const generateMockData = () => {
      // Generate mock system metrics
      const newMetrics: SystemMetrics = {
        totalSessions: Math.floor(Math.random() * 10000) + 5000,
        activeSessions: Math.floor(Math.random() * 50) + 10,
        humanVerified: Math.floor(Math.random() * 8000) + 4000,
        botDetected: Math.floor(Math.random() * 1000) + 200,
        challengesPresented: Math.floor(Math.random() * 2000) + 500,
        averageResponseTime: Math.floor(Math.random() * 200) + 50,
        systemUptime: Math.floor(Math.random() * 86400) + 86400, // 1-2 days
        errorRate: Math.random() * 5 // 0-5%
      };

      setMetrics(newMetrics);
      metricsHistoryRef.current = [...metricsHistoryRef.current.slice(-50), newMetrics];

      // Generate mock alerts
      if (Math.random() < 0.3) { // 30% chance of new alert
        const alertTypes: ThreatAlert['type'][] = ['high-risk', 'suspicious', 'anomaly', 'system'];
        const messages = {
          'high-risk': 'Potential bot attack detected from multiple IPs',
          'suspicious': 'Unusual behavioral patterns detected',
          'anomaly': 'Traffic spike detected from single source',
          'system': 'ML model confidence temporarily degraded'
        };

        const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        const newAlert: ThreatAlert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: alertType,
          message: messages[alertType],
          timestamp: Date.now(),
          sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
          riskScore: Math.random() * 100,
          resolved: false
        };

        setAlerts(prev => [newAlert, ...prev.slice(0, 19)]);
      }

      // Generate mock sessions
      if (Math.random() < 0.4) { // 40% chance of new session
        const newSession: UserSession = {
          id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          startTime: Date.now(),
          ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          behaviorScore: Math.random() * 100,
          riskLevel: Math.random() < 0.7 ? 'low' : Math.random() < 0.9 ? 'medium' : 'high',
          challengesCompleted: Math.floor(Math.random() * 3),
          verification: Math.random() < 0.8 ? 'human' : Math.random() < 0.9 ? 'pending' : 'bot',
          deviceFingerprint: Math.random().toString(16).substr(2, 16)
        };

        setSessions(prev => [newSession, ...prev.slice(0, 49)]);
      }
    };

    generateMockData(); // Initial load

    if (autoRefresh) {
      const interval = setInterval(generateMockData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoRefresh]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const totalVerifications = metrics.humanVerified + metrics.botDetected;
    const humanRate = totalVerifications > 0 ? (metrics.humanVerified / totalVerifications) * 100 : 0;
    const botRate = totalVerifications > 0 ? (metrics.botDetected / totalVerifications) * 100 : 0;
    const challengeRate = metrics.totalSessions > 0 ? (metrics.challengesPresented / metrics.totalSessions) * 100 : 0;

    const systemHealth = Math.max(0, 100 - metrics.errorRate * 10);
    const performanceScore = Math.max(0, 100 - (metrics.averageResponseTime - 100) / 10);

    return {
      humanRate: Math.round(humanRate * 10) / 10,
      botRate: Math.round(botRate * 10) / 10,
      challengeRate: Math.round(challengeRate * 10) / 10,
      systemHealth: Math.round(systemHealth),
      performanceScore: Math.round(performanceScore)
    };
  }, [metrics]);

  // Component helper functions
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getAlertColor = (type: ThreatAlert['type']): string => {
    switch (type) {
      case 'high-risk': return '#e74c3c';
      case 'suspicious': return '#f39c12';
      case 'anomaly': return '#9b59b6';
      case 'system': return '#3498db';
      default: return '#95a5a6';
    }
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const clearAllAlerts = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, resolved: true })));
  };

  // Mini chart component for metrics visualization
  const MetricsChart: React.FC<{ data: number[]; color: string; height?: number }> = ({
    data, color, height = 40
  }) => {
    const max = Math.max(...data, 1);
    const width = 200;

    return (
      <div style={{ width, height, position: 'relative', marginTop: '8px' }}>
        <svg width={width} height={height} style={{ backgroundColor: '#1a252f', borderRadius: '4px' }}>
          <polyline
            points={data.map((value, index) =>
              `${(index / (data.length - 1)) * width},${height - (value / max) * height}`
            ).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </svg>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#2c3e50',
      color: '#ecf0f1',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#34495e',
        padding: '20px',
        borderBottom: '2px solid #3498db'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, color: '#3498db' }}>Behavioral CAPTCHA Admin</h1>
            <div style={{ fontSize: '14px', color: '#95a5a6', marginTop: '5px' }}>
              System Status: {analytics.systemHealth > 80 ? 'Healthy' : analytics.systemHealth > 60 ? 'Warning' : 'Critical'} •
              Uptime: {formatUptime(metrics.systemUptime)} •
              {showRealTimeUpdates ? 'Live Updates' : 'Static View'}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              style={{
                backgroundColor: '#2c3e50',
                color: '#ecf0f1',
                border: '1px solid #3498db',
                padding: '5px 10px',
                borderRadius: '4px'
              }}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>

            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              style={{
                backgroundColor: autoRefresh ? '#27ae60' : '#e74c3c',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {(['overview', 'threats', 'sessions', 'analytics'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                backgroundColor: activeTab === tab ? '#3498db' : '#2c3e50',
                color: '#ecf0f1',
                border: '1px solid #3498db',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        {activeTab === 'overview' && (
          <div>
            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px', border: '2px solid #3498db' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Active Sessions</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3498db' }}>{metrics.activeSessions}</div>
                <div style={{ color: '#95a5a6', fontSize: '14px' }}>
                  {metrics.totalSessions} total sessions
                </div>
                <MetricsChart
                  data={metricsHistoryRef.current.slice(-20).map(m => m.activeSessions)}
                  color="#3498db"
                />
              </div>

              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px', border: '2px solid #27ae60' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>Human Verification</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#27ae60' }}>{analytics.humanRate}%</div>
                <div style={{ color: '#95a5a6', fontSize: '14px' }}>
                  {metrics.humanVerified} humans verified
                </div>
                <MetricsChart
                  data={metricsHistoryRef.current.slice(-20).map(m => (m.humanVerified / (m.humanVerified + m.botDetected)) * 100 || 0)}
                  color="#27ae60"
                />
              </div>

              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px', border: '2px solid #e74c3c' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#e74c3c' }}>Bot Detection</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#e74c3c' }}>{analytics.botRate}%</div>
                <div style={{ color: '#95a5a6', fontSize: '14px' }}>
                  {metrics.botDetected} bots detected
                </div>
                <MetricsChart
                  data={metricsHistoryRef.current.slice(-20).map(m => (m.botDetected / (m.humanVerified + m.botDetected)) * 100 || 0)}
                  color="#e74c3c"
                />
              </div>

              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px', border: '2px solid #f39c12' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#f39c12' }}>Performance</h3>
                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f39c12' }}>{metrics.averageResponseTime}ms</div>
                <div style={{ color: '#95a5a6', fontSize: '14px' }}>
                  Score: {analytics.performanceScore}/100
                </div>
                <MetricsChart
                  data={metricsHistoryRef.current.slice(-20).map(m => m.averageResponseTime)}
                  color="#f39c12"
                />
              </div>
            </div>

            {/* System Health Overview */}
            <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <h3 style={{ color: '#9b59b6', marginTop: 0 }}>System Health Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>System Health</div>
                  <div style={{
                    backgroundColor: '#1a252f',
                    height: '20px',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${analytics.systemHealth}%`,
                      backgroundColor: analytics.systemHealth > 80 ? '#27ae60' : analytics.systemHealth > 60 ? '#f39c12' : '#e74c3c',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
                    {analytics.systemHealth}% ({metrics.errorRate.toFixed(1)}% error rate)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>Challenge Rate</div>
                  <div style={{
                    backgroundColor: '#1a252f',
                    height: '20px',
                    borderRadius: '10px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${analytics.challengeRate}%`,
                      backgroundColor: '#3498db',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#95a5a6', marginTop: '5px' }}>
                    {analytics.challengeRate}% ({metrics.challengesPresented} challenges)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}>Active Alerts</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: alerts.filter(a => !a.resolved).length > 0 ? '#e74c3c' : '#27ae60' }}>
                    {alerts.filter(a => !a.resolved).length}
                  </div>
                  <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                    {alerts.length} total alerts
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'threats' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Threat Detection & Alerts</h3>
              <button
                onClick={clearAllAlerts}
                style={{
                  backgroundColor: '#e67e22',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear All Alerts
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {alerts.length === 0 ? (
                <div style={{
                  backgroundColor: '#34495e',
                  padding: '40px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  color: '#95a5a6'
                }}>
                  No alerts detected
                </div>
              ) : (
                alerts.map(alert => (
                  <div
                    key={alert.id}
                    style={{
                      backgroundColor: alert.resolved ? '#1a252f' : '#34495e',
                      padding: '15px',
                      borderRadius: '8px',
                      border: `2px solid ${getAlertColor(alert.type)}`,
                      opacity: alert.resolved ? 0.6 : 1
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            backgroundColor: getAlertColor(alert.type),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            textTransform: 'uppercase'
                          }}>
                            {alert.type}
                          </span>
                          <span style={{ fontSize: '12px', color: '#95a5a6' }}>
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                          {alert.resolved && (
                            <span style={{ color: '#27ae60', fontSize: '12px' }}>RESOLVED</span>
                          )}
                        </div>
                        <div style={{ marginBottom: '8px' }}>{alert.message}</div>
                        <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                          Session: {alert.sessionId} • Risk Score: {alert.riskScore.toFixed(1)}
                        </div>
                      </div>
                      {!alert.resolved && (
                        <button
                          onClick={() => resolveAlert(alert.id)}
                          style={{
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div>
            <h3 style={{ marginBottom: '20px' }}>Active Sessions</h3>
            <div style={{ display: 'grid', gap: '10px' }}>
              {sessions.length === 0 ? (
                <div style={{
                  backgroundColor: '#34495e',
                  padding: '40px',
                  textAlign: 'center',
                  borderRadius: '8px',
                  color: '#95a5a6'
                }}>
                  No active sessions
                </div>
              ) : (
                sessions.slice(0, 20).map(session => (
                  <div
                    key={session.id}
                    style={{
                      backgroundColor: '#34495e',
                      padding: '15px',
                      borderRadius: '8px',
                      border: `2px solid ${getRiskColor(session.riskLevel)}`
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                          {session.id.slice(-8)}...
                        </div>
                        <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                          {new Date(session.startTime).toLocaleTimeString()}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '14px', marginBottom: '5px' }}>
                          {session.ipAddress}
                        </div>
                        <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                          {session.deviceFingerprint.slice(0, 8)}...
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: getRiskColor(session.riskLevel),
                          marginBottom: '5px'
                        }}>
                          {session.behaviorScore.toFixed(1)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: getRiskColor(session.riskLevel),
                          textTransform: 'uppercase'
                        }}>
                          {session.riskLevel} Risk
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          backgroundColor: session.verification === 'human' ? '#27ae60' :
                                         session.verification === 'bot' ? '#e74c3c' :
                                         session.verification === 'failed' ? '#c0392b' : '#f39c12',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textTransform: 'uppercase',
                          marginBottom: '5px'
                        }}>
                          {session.verification}
                        </div>
                        <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                          {session.challengesCompleted} challenges
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <h3 style={{ marginBottom: '20px' }}>System Analytics</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#3498db', marginTop: 0 }}>Verification Distribution</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '10px' }}>
                      <span>Humans: {analytics.humanRate}%</span>
                      <div style={{
                        backgroundColor: '#1a252f',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '5px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${analytics.humanRate}%`,
                          backgroundColor: '#27ae60'
                        }} />
                      </div>
                    </div>
                    <div>
                      <span>Bots: {analytics.botRate}%</span>
                      <div style={{
                        backgroundColor: '#1a252f',
                        height: '8px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        marginTop: '5px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${analytics.botRate}%`,
                          backgroundColor: '#e74c3c'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#9b59b6', marginTop: 0 }}>Performance Metrics</h4>
                <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                  <div>Average Response Time: <strong>{metrics.averageResponseTime}ms</strong></div>
                  <div>Error Rate: <strong>{metrics.errorRate.toFixed(2)}%</strong></div>
                  <div>System Health: <strong>{analytics.systemHealth}%</strong></div>
                  <div>Performance Score: <strong>{analytics.performanceScore}/100</strong></div>
                </div>
              </div>
            </div>

            {/* Historical Metrics Chart */}
            <div style={{ backgroundColor: '#34495e', padding: '20px', borderRadius: '8px' }}>
              <h4 style={{ color: '#e67e22', marginTop: 0 }}>Historical Metrics ({selectedTimeRange})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <div style={{ fontSize: '14px', marginBottom: '10px', color: '#3498db' }}>Active Sessions</div>
                  <MetricsChart
                    data={metricsHistoryRef.current.map(m => m.activeSessions)}
                    color="#3498db"
                    height={60}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '14px', marginBottom: '10px', color: '#e74c3c' }}>Bot Detection Rate</div>
                  <MetricsChart
                    data={metricsHistoryRef.current.map(m => (m.botDetected / (m.humanVerified + m.botDetected)) * 100 || 0)}
                    color="#e74c3c"
                    height={60}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
