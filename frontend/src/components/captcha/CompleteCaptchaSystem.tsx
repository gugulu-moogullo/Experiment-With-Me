// frontend/src/components/captcha/CompleteCaptchaSystem.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useBehaviorTracking } from '../../hooks/useBehaviorTracking';
import CaptchaApiService from '../../services/captchaApi';
import ChallengeSystem from './ChallengeSystem';

interface CaptchaResult {
  success: boolean;
  isHuman: boolean;
  confidence: number;
  challengeRequired: boolean;
  method: string;
}

const CompleteCaptchaSystem: React.FC = () => {
  const { behaviorData, analytics, reset } = useBehaviorTracking();
  const [apiService] = useState(new CaptchaApiService());
  const [captchaState, setCaptchaState] = useState<'collecting' | 'analyzing' | 'challenge' | 'success' | 'failure'>('collecting');
  const [apiResults, setApiResults] = useState<any>(null);
  const [challenge, setChallenge] = useState<any>(null);
  const [finalResult, setFinalResult] = useState<CaptchaResult | null>(null);
  const [autoValidationEnabled, setAutoValidationEnabled] = useState(true);
  const [collectionProgress, setCollectionProgress] = useState(0);

  const selectChallengeType = useCallback((result: any): 'mouse-pattern' | 'click-sequence' | 'typing-cadence' => {
    // Intelligent challenge selection based on which behavioral aspects were problematic
    if (result.analysis.mouseMovements < 5) {
      return 'mouse-pattern'; // Need more mouse data
    } else if (result.analysis.clicks < 2) {
      return 'click-sequence'; // Need click pattern verification
    } else {
      return 'typing-cadence'; // Need keystroke verification
    }
  }, []);

  const validateBehavior = useCallback(async () => {
    setCaptchaState('analyzing');

    try {
      const response = await apiService.validateBehavior(behaviorData);
      setApiResults(response);

      if (response.success && response.result) {
        if (response.result.needsChallenge) {
          // Request appropriate challenge based on risk factors
          const challengeType = selectChallengeType(response.result);
          const challengeResponse = await apiService.requestChallenge(challengeType);

          if (challengeResponse.success && challengeResponse.challenge) {
            setChallenge(challengeResponse.challenge);
            setCaptchaState('challenge');
          } else {
            // Fallback to failure if challenge generation fails
            setFinalResult({
              success: false,
              isHuman: false,
              confidence: response.result?.confidence || 0,
              challengeRequired: true,
              method: 'challenge_failed'
            });
            setCaptchaState('failure');
          }
        } else {
          // Passed without challenge
          setFinalResult({
            success: true,
            isHuman: response.result.isHuman,
            confidence: response.result.confidence,
            challengeRequired: false,
            method: 'ml_model'
          });
          setCaptchaState('success');
        }
      } else {
        throw new Error(response.error || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setFinalResult({
        success: false,
        isHuman: false,
        confidence: 0,
        challengeRequired: false,
        method: 'error'
      });
      setCaptchaState('failure');
    }
  }, [apiService, behaviorData, selectChallengeType]);

  // Auto-validation logic
  useEffect(() => {
    if (!autoValidationEnabled || captchaState !== 'collecting') return;

    const minRequirements = {
      mouseMovements: 10,
      sessionDuration: 3000, // 3 seconds minimum
      totalInteractions: 5
    };

    const totalInteractions = behaviorData.mouseMovements.length + behaviorData.clicks.length + behaviorData.keystrokes.length;

    const progress = Math.min(100,
      (behaviorData.mouseMovements.length / minRequirements.mouseMovements) * 40 +
      (Math.min(behaviorData.sessionDuration, minRequirements.sessionDuration) / minRequirements.sessionDuration) * 40 +
      (totalInteractions / minRequirements.totalInteractions) * 20
    );

    setCollectionProgress(progress);

    // Auto-validate when we have enough data
    if (
      behaviorData.mouseMovements.length >= minRequirements.mouseMovements &&
      behaviorData.sessionDuration >= minRequirements.sessionDuration &&
      totalInteractions >= minRequirements.totalInteractions &&
      progress >= 100
    ) {
      validateBehavior();
    }
  }, [behaviorData, autoValidationEnabled, captchaState, validateBehavior]);

  const handleChallengeComplete = useCallback(async (challengeResponse: any) => {
    try {
      // In a real implementation, you'd send this to backend for validation
      // For now, we'll simulate challenge validation
      const isValidResponse = validateChallengeResponse(challengeResponse);

      setFinalResult({
        success: isValidResponse,
        isHuman: isValidResponse,
        confidence: isValidResponse ? 0.9 : 0.1,
        challengeRequired: true,
        method: 'challenge_completion'
      });

      setCaptchaState(isValidResponse ? 'success' : 'failure');
    } catch (error) {
      setCaptchaState('failure');
    }
  }, []);

  const validateChallengeResponse = useCallback((response: any): boolean => {
    // Simple validation logic - in production this would be more sophisticated
    if (challenge.type === 'click-sequence') {
      return response.response.correct;
    } else if (challenge.type === 'typing-cadence') {
      return response.response.correct;
    } else if (challenge.type === 'mouse-pattern') {
      // For mouse patterns, check if they drew something reasonable
      return response.response.mousePattern && response.response.mousePattern.length > 20;
    }
    return false;
  }, [challenge]);

  const handleChallengeTimeout = useCallback(() => {
    setFinalResult({
      success: false,
      isHuman: false,
      confidence: 0,
      challengeRequired: true,
      method: 'timeout'
    });
    setCaptchaState('failure');
  }, []);

  const resetSystem = useCallback(() => {
    reset();
    setApiResults(null);
    setChallenge(null);
    setFinalResult(null);
    setCaptchaState('collecting');
    setCollectionProgress(0);
    apiService.resetSession();
  }, [reset, apiService]);

  const renderState = () => {
    switch (captchaState) {
      case 'collecting':
        return (
          <div style={{ textAlign: 'center' }}>
            <h2>[CAPTCHA] Behavioral Analysis in Progress</h2>

            <div style={{
              backgroundColor: '#f0f8ff',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #2196f3'
            }}>
              <div style={{ marginBottom: '15px' }}>
                <div style={{
                  width: '100%',
                  height: '20px',
                  backgroundColor: '#e0e0e0',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${collectionProgress}%`,
                    height: '100%',
                    backgroundColor: collectionProgress >= 100 ? '#4caf50' : '#2196f3',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <p style={{ margin: '10px 0', fontWeight: 'bold' }}>
                  Collection Progress: {Math.round(collectionProgress)}%
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '14px' }}>
                <div>Mouse: {behaviorData.mouseMovements.length}/10</div>
                <div>Time: {Math.round(behaviorData.sessionDuration/1000)}/3s</div>
                <div>Interactions: {behaviorData.mouseMovements.length + behaviorData.clicks.length + behaviorData.keystrokes.length}/5</div>
              </div>
            </div>

            <div style={{
              backgroundColor: '#f0fff0',
              padding: '20px',
              borderRadius: '8px',
              height: '150px',
              border: '2px dashed #32cd32',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <h3>Please interact naturally with this area</h3>
              <p>Move your mouse, click, and type to verify you're human</p>
              <input
                type="text"
                placeholder="Type something here..."
                style={{ padding: '10px', marginTop: '10px', width: '200px' }}
              />
            </div>

            <button
              onClick={() => setAutoValidationEnabled(!autoValidationEnabled)}
              style={{
                padding: '10px 20px',
                margin: '20px 10px',
                backgroundColor: autoValidationEnabled ? '#4caf50' : '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Auto-validation: {autoValidationEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={validateBehavior}
              disabled={collectionProgress < 50}
              style={{
                padding: '10px 20px',
                margin: '20px 10px',
                backgroundColor: collectionProgress < 50 ? '#ccc' : '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: collectionProgress < 50 ? 'not-allowed' : 'pointer'
              }}
            >
              Validate Now
            </button>
          </div>
        );

      case 'analyzing':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <h2>[ANALYZING] Processing Behavioral Data...</h2>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #2196f3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '20px auto'
            }} />
            <p>Analyzing mouse patterns, keystroke dynamics, and interaction behavior...</p>
          </div>
        );

      case 'challenge':
        return challenge ? (
          <ChallengeSystem
            challenge={challenge}
            onChallengeComplete={handleChallengeComplete}
            onChallengeTimeout={handleChallengeTimeout}
          />
        ) : null;

      case 'success':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              backgroundColor: '#e8f5e8',
              padding: '30px',
              borderRadius: '12px',
              border: '3px solid #4caf50'
            }}>
              <h2 style={{ color: '#4caf50', margin: '0 0 20px 0' }}>
                [SUCCESS] Human Verified!
              </h2>
              <div style={{ fontSize: '60px', margin: '20px 0' }}>✓</div>
              <p style={{ fontSize: '18px', margin: '20px 0' }}>
                Authentication successful. You have been verified as human.
              </p>

              {finalResult && (
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                  <p>Confidence: {(finalResult.confidence * 100).toFixed(1)}%</p>
                  <p>Method: {finalResult.method.replace('_', ' ').toUpperCase()}</p>
                  <p>Challenge Required: {finalResult.challengeRequired ? 'Yes' : 'No'}</p>
                </div>
              )}
            </div>

            <button
              onClick={resetSystem}
              style={{
                padding: '15px 30px',
                marginTop: '20px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Start New Session
            </button>
          </div>
        );

      case 'failure':
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{
              backgroundColor: '#ffebee',
              padding: '30px',
              borderRadius: '12px',
              border: '3px solid #f44336'
            }}>
              <h2 style={{ color: '#f44336', margin: '0 0 20px 0' }}>
                [FAILURE] Verification Failed
              </h2>
              <div style={{ fontSize: '60px', margin: '20px 0' }}>✗</div>
              <p style={{ fontSize: '18px', margin: '20px 0' }}>
                Unable to verify human behavior. Please try again.
              </p>

              {finalResult && (
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                  <p>Confidence: {(finalResult.confidence * 100).toFixed(1)}%</p>
                  <p>Reason: {finalResult.method.replace('_', ' ').toUpperCase()}</p>
                </div>
              )}
            </div>

            <button
              onClick={resetSystem}
              style={{
                padding: '15px 30px',
                marginTop: '20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {renderState()}

      {/* Debug Panel - Remove in production */}
      {(captchaState === 'collecting' || captchaState === 'analyzing') && (
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <h4>[DEBUG] Current Stats</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>Session ID: {apiService.getSessionId().slice(-8)}...</div>
            <div>State: {captchaState.toUpperCase()}</div>
            <div>Mouse Points: {behaviorData.mouseMovements.length}</div>
            <div>Clicks: {behaviorData.clicks.length}</div>
            <div>Keystrokes: {behaviorData.keystrokes.length}</div>
            <div>Duration: {Math.round(behaviorData.sessionDuration/1000)}s</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteCaptchaSystem;
