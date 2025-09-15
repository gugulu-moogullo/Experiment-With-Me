// frontend/src/components/analytics/DeviceFingerprint.tsx
import React, { useState, useEffect, useMemo } from 'react';

interface DeviceInfo {
  // Screen properties
  screenWidth: number;
  screenHeight: number;
  screenColorDepth: number;
  screenPixelDepth: number;
  availWidth: number;
  availHeight: number;
  devicePixelRatio: number;

  // Browser properties
  userAgent: string;
  language: string;
  languages: string[];
  platform: string;
  cookieEnabled: boolean;
  doNotTrack: string | null;
  maxTouchPoints: number;
  hardwareConcurrency: number;

  // Browser capabilities
  webGL: string;
  webGL2: string;
  canvas2D: string;
  audioContext: boolean;
  webRTC: boolean;
  indexedDB: boolean;
  localStorage: boolean;
  sessionStorage: boolean;

  // Time zone and locale
  timezone: string;
  timezoneOffset: number;

  // Hardware features
  deviceMemory?: number;
  connection?: any;

  // Plugins and fonts (simplified for privacy)
  pluginsCount: number;
  mimeTypesCount: number;

  // Additional fingerprinting data
  batteryLevel?: number;
  charging?: boolean;
  gamepadSupport: boolean;
  speechSynthesis: boolean;
  webAuthentication: boolean;
}

interface DeviceFingerprintProps {
  onFingerprintGenerated?: (fingerprint: string) => void;
  showPrivacyInfo?: boolean;
}

const DeviceFingerprint: React.FC<DeviceFingerprintProps> = ({
  onFingerprintGenerated,
  showPrivacyInfo = true
}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [fingerprint, setFingerprint] = useState<string>('');
  const [isCollecting, setIsCollecting] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Collect device information
  const collectDeviceInfo = async (): Promise<DeviceInfo> => {
    setIsCollecting(true);

    const info: DeviceInfo = {
      // Screen properties
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenColorDepth: screen.colorDepth,
      screenPixelDepth: screen.pixelDepth,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      devicePixelRatio: window.devicePixelRatio,

      // Browser properties
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages as string[],
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,

      // Browser capabilities
      webGL: '',
      webGL2: '',
      canvas2D: '',
      audioContext: false,
      webRTC: false,
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      sessionStorage: 'sessionStorage' in window,

      // Time zone
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),

      // Plugins
      pluginsCount: navigator.plugins.length,
      mimeTypesCount: navigator.mimeTypes.length,

      // Additional features
      gamepadSupport: 'getGamepads' in navigator,
      speechSynthesis: 'speechSynthesis' in window,
      webAuthentication: 'credentials' in navigator
    };

    // WebGL fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          info.webGL = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        } else {
          info.webGL = 'WebGL available';
        }
      }

      const gl2 = canvas.getContext('webgl2');
      if (gl2) {
        info.webGL2 = 'WebGL2 supported';
      }
    } catch (e) {
      info.webGL = 'WebGL blocked';
    }

    // Canvas 2D fingerprinting
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('Device fingerprint test 123', 2, 2);
        info.canvas2D = canvas.toDataURL().slice(-50); // Last 50 chars for privacy
      }
    } catch (e) {
      info.canvas2D = 'Canvas blocked';
    }

    // Audio context
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      info.audioContext = true;
      audioContext.close();
    } catch (e) {
      info.audioContext = false;
    }

    // WebRTC detection
    try {
      const pc = new RTCPeerConnection();
      info.webRTC = true;
      pc.close();
    } catch (e) {
      info.webRTC = false;
    }

    // Device memory (experimental)
    if ('deviceMemory' in navigator) {
      info.deviceMemory = (navigator as any).deviceMemory;
    }

    // Network connection info
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      info.connection = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt
      };
    }

    // Battery API (mostly deprecated but still useful)
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        info.batteryLevel = Math.round(battery.level * 100);
        info.charging = battery.charging;
      }
    } catch (e) {
      // Battery API not available
    }

    setIsCollecting(false);
    return info;
  };

  // Generate fingerprint hash
  const generateFingerprint = (info: DeviceInfo): string => {
    if (privacyMode) {
      // Privacy-conscious fingerprinting (less identifying)
      const privacyData = [
        info.screenWidth,
        info.screenHeight,
        info.language,
        info.platform,
        info.timezone,
        info.cookieEnabled
      ].join('|');

      return btoa(privacyData).slice(0, 16);
    }

    // Full fingerprinting
    const fingerprintData = [
      info.userAgent,
      info.screenWidth,
      info.screenHeight,
      info.screenColorDepth,
      info.devicePixelRatio,
      info.language,
      info.languages.join(','),
      info.platform,
      info.timezone,
      info.timezoneOffset,
      info.webGL,
      info.canvas2D,
      info.audioContext,
      info.hardwareConcurrency,
      info.maxTouchPoints,
      info.pluginsCount,
      info.mimeTypesCount,
      info.deviceMemory,
      JSON.stringify(info.connection),
      info.gamepadSupport,
      info.speechSynthesis,
      info.webAuthentication
    ].join('|');

    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < fingerprintData.length; i++) {
      const char = fingerprintData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(16);
  };

  // Initialize device info collection
  useEffect(() => {
    const initializeFingerprinting = async () => {
      try {
        const info = await collectDeviceInfo();
        setDeviceInfo(info);

        const fp = generateFingerprint(info);
        setFingerprint(fp);

        if (onFingerprintGenerated) {
          onFingerprintGenerated(fp);
        }
      } catch (error) {
        console.error('Error collecting device info:', error);
      }
    };

    initializeFingerprinting();
  }, [privacyMode, onFingerprintGenerated]);

  // Analytics based on device info
  const analytics = useMemo(() => {
    if (!deviceInfo) return null;

    const riskFactors: string[] = [];
    let privacyScore = 100;
    let uniquenessScore = 50;

    // Analyze risk factors
    if (deviceInfo.doNotTrack === null) {
      riskFactors.push('Do Not Track not set');
      privacyScore -= 10;
    }

    if (!deviceInfo.cookieEnabled) {
      riskFactors.push('Cookies disabled');
      uniquenessScore += 20;
    }

    if (deviceInfo.pluginsCount === 0) {
      riskFactors.push('No browser plugins');
      uniquenessScore += 15;
    }

    if (deviceInfo.webGL.includes('blocked')) {
      riskFactors.push('WebGL blocked');
      uniquenessScore += 25;
    }

    // Unusual screen resolutions
    const commonResolutions = [
      '1920x1080', '1366x768', '1440x900', '1536x864', '1280x720'
    ];
    const currentRes = `${deviceInfo.screenWidth}x${deviceInfo.screenHeight}`;
    if (!commonResolutions.includes(currentRes)) {
      uniquenessScore += 10;
    }

    // Mobile device detection
    const isMobile = deviceInfo.maxTouchPoints > 0;
    const isDesktop = !isMobile;

    // Browser detection
    const browserInfo = {
      isChrome: deviceInfo.userAgent.includes('Chrome'),
      isFirefox: deviceInfo.userAgent.includes('Firefox'),
      isSafari: deviceInfo.userAgent.includes('Safari') && !deviceInfo.userAgent.includes('Chrome'),
      isEdge: deviceInfo.userAgent.includes('Edg/')
    };

    // Device class estimation
    let deviceClass = 'unknown';
    if (deviceInfo.hardwareConcurrency >= 8) {
      deviceClass = 'high-end';
    } else if (deviceInfo.hardwareConcurrency >= 4) {
      deviceClass = 'mid-range';
    } else if (deviceInfo.hardwareConcurrency >= 2) {
      deviceClass = 'low-end';
    }

    return {
      riskFactors,
      privacyScore,
      uniquenessScore,
      isMobile,
      isDesktop,
      browserInfo,
      deviceClass,
      fingerprintEntropy: fingerprint.length * 4 // Rough entropy estimate
    };
  }, [deviceInfo, fingerprint]);

  if (!deviceInfo || !analytics) {
    return (
      <div style={{
        backgroundColor: '#34495e',
        color: '#ecf0f1',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <h2>Device Fingerprint Analyzer</h2>
        <div style={{ marginTop: '20px' }}>
          {isCollecting ? 'Collecting device information...' : 'Initializing...'}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#34495e',
      color: '#ecf0f1',
      padding: '20px',
      borderRadius: '12px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Device Fingerprint Analyzer</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={(e) => setPrivacyMode(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Privacy Mode
          </label>
        </div>
      </div>

      {/* Fingerprint overview */}
      <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: '#3498db', marginTop: 0 }}>Device Fingerprint</h3>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '18px',
          color: '#e74c3c',
          backgroundColor: '#1a252f',
          padding: '10px',
          borderRadius: '4px',
          letterSpacing: '2px'
        }}>
          {fingerprint}
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#95a5a6' }}>
          Uniqueness Score: {analytics.uniquenessScore}% •
          Privacy Score: {analytics.privacyScore}% •
          Entropy: ~{analytics.fingerprintEntropy} bits
        </div>
      </div>

      {/* Main metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #27ae60' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#27ae60' }}>Device Type</h4>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {analytics.isMobile ? 'Mobile' : 'Desktop'}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>
            {deviceInfo.maxTouchPoints} touch points
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #3498db' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Screen</h4>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {deviceInfo.screenWidth}×{deviceInfo.screenHeight}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>
            {deviceInfo.screenColorDepth}-bit color
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #9b59b6' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#9b59b6' }}>Hardware</h4>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
            {deviceInfo.hardwareConcurrency} cores
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>
            {analytics.deviceClass} device
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px', border: '2px solid #f39c12' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#f39c12' }}>Browser</h4>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
            {Object.entries(analytics.browserInfo).find(([_, isActive]) => isActive)?.[0]?.slice(2) || 'Unknown'}
          </div>
          <div style={{ fontSize: '12px', color: '#95a5a6' }}>
            {deviceInfo.language}
          </div>
        </div>
      </div>

      {/* Detailed information */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ color: '#1abc9c', marginTop: 0 }}>System Information</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <div><strong>Platform:</strong> {deviceInfo.platform}</div>
            <div><strong>Timezone:</strong> {deviceInfo.timezone}</div>
            <div><strong>Languages:</strong> {deviceInfo.languages.slice(0, 3).join(', ')}</div>
            {deviceInfo.deviceMemory && <div><strong>Memory:</strong> {deviceInfo.deviceMemory}GB</div>}
            {deviceInfo.connection && (
              <div><strong>Connection:</strong> {deviceInfo.connection.effectiveType}</div>
            )}
            <div><strong>Pixel Ratio:</strong> {deviceInfo.devicePixelRatio}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#2c3e50', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ color: '#e67e22', marginTop: 0 }}>Browser Capabilities</h4>
          <div style={{ fontSize: '14px' }}>
            <div>WebGL: <span style={{ color: deviceInfo.webGL.includes('blocked') ? '#e74c3c' : '#27ae60' }}>
              {deviceInfo.webGL.includes('blocked') ? 'Blocked' : 'Supported'}
            </span></div>
            <div>Audio Context: <span style={{ color: deviceInfo.audioContext ? '#27ae60' : '#e74c3c' }}>
              {deviceInfo.audioContext ? 'Yes' : 'No'}
            </span></div>
            <div>WebRTC: <span style={{ color: deviceInfo.webRTC ? '#27ae60' : '#e74c3c' }}>
              {deviceInfo.webRTC ? 'Yes' : 'No'}
            </span></div>
            <div>Local Storage: <span style={{ color: deviceInfo.localStorage ? '#27ae60' : '#e74c3c' }}>
              {deviceInfo.localStorage ? 'Yes' : 'No'}
            </span></div>
            <div>Cookies: <span style={{ color: deviceInfo.cookieEnabled ? '#27ae60' : '#e74c3c' }}>
              {deviceInfo.cookieEnabled ? 'Enabled' : 'Disabled'}
            </span></div>
            <div>Plugins: {deviceInfo.pluginsCount}</div>
          </div>
        </div>
      </div>

      {/* Risk factors */}
      {analytics.riskFactors.length > 0 && (
        <div style={{
          backgroundColor: '#c0392b',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h4 style={{ color: '#fff', marginTop: 0 }}>Privacy & Security Notes</h4>
          {analytics.riskFactors.map((factor, index) => (
            <div key={index} style={{ color: '#fff', fontSize: '14px', marginBottom: '5px' }}>
              • {factor}
            </div>
          ))}
        </div>
      )}

      {/* Privacy information */}
      {showPrivacyInfo && (
        <div style={{
          backgroundColor: '#1a252f',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          fontSize: '12px',
          color: '#95a5a6'
        }}>
          <strong>Privacy Notice:</strong> Device fingerprinting is used for security purposes.
          {privacyMode ? ' Privacy mode uses minimal identifying information.' : ' Full mode provides comprehensive device analysis.'}
          No personal data is stored or transmitted.
        </div>
      )}
    </div>
  );
};

export default DeviceFingerprint;
