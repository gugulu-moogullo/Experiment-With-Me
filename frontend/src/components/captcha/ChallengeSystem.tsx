// frontend/src/components/captcha/ChallengeSystem.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface Challenge {
  type: string;
  instruction: string;
  sessionId: string;
  challengeId: string;
  timestamp: string;
  timeLimit: number;
  sequence?: number[];
  expectedText?: string;
  expectedPattern?: string;
}

interface ChallengeResponse {
  challengeId: string;
  response: any;
  completionTime: number;
  behaviorData: any;
}

interface ChallengeSystemProps {
  challenge: Challenge;
  onChallengeComplete: (response: ChallengeResponse) => void;
  onChallengeTimeout: () => void;
}

const ChallengeSystem: React.FC<ChallengeSystemProps> = ({
  challenge,
  onChallengeComplete,
  onChallengeTimeout
}) => {
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimit / 1000);
  const [isComplete, setIsComplete] = useState(false);
  const startTime = useRef(Date.now());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePath, setMousePath] = useState<Array<{x: number, y: number, timestamp: number}>>([]);
  const [clickSequence, setClickSequence] = useState<number[]>([]);
  const [typedText, setTypedText] = useState('');
  const [keystrokeTimings, setKeystrokeTimings] = useState<Array<{key: string, timestamp: number}>>([]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onChallengeTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onChallengeTimeout]);

  // Mouse Pattern Challenge
  const MousePatternChallenge: React.FC = () => {
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = useCallback((e: React.MouseEvent) => {
      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          timestamp: Date.now()
        };
        setMousePath([point]);
      }
    }, []);

    const draw = useCallback((e: React.MouseEvent) => {
      if (!isDrawing || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const point = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          timestamp: Date.now()
        };

        setMousePath(prev => {
          const newPath = [...prev, point];

          // Draw line
          if (prev.length > 0) {
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(prev[prev.length - 1].x, prev[prev.length - 1].y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }

          return newPath;
        });
      }
    }, [isDrawing]);

    const stopDrawing = useCallback(() => {
      if (isDrawing && mousePath.length > 20) {
        // Analyze pattern for circle-like shape
        const completionTime = Date.now() - startTime.current;
        const response: ChallengeResponse = {
          challengeId: challenge.challengeId,
          response: { mousePattern: mousePath, patternType: 'circle' },
          completionTime,
          behaviorData: {
            mouseMovements: mousePath,
            drawingDuration: completionTime,
            pathLength: mousePath.length
          }
        };

        setIsComplete(true);
        onChallengeComplete(response);
      }
      setIsDrawing(false);
    }, [isDrawing, mousePath, challenge.challengeId, onChallengeComplete]);

    return (
      <div style={{ textAlign: 'center' }}>
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          style={{
            border: '3px dashed #4CAF50',
            borderRadius: '8px',
            cursor: 'crosshair',
            backgroundColor: '#f9f9f9'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        <p style={{ marginTop: '10px', color: '#666' }}>
          Draw a circle to continue. Path length: {mousePath.length}
        </p>
      </div>
    );
  };

  // Click Sequence Challenge
  const ClickSequenceChallenge: React.FC = () => {
    const handleButtonClick = useCallback((buttonNumber: number) => {
      const newSequence = [...clickSequence, buttonNumber];
      setClickSequence(newSequence);

      if (newSequence.length === challenge.sequence?.length) {
        const isCorrect = newSequence.every((num, idx) => num === challenge.sequence![idx]);
        const completionTime = Date.now() - startTime.current;

        const response: ChallengeResponse = {
          challengeId: challenge.challengeId,
          response: { sequence: newSequence, correct: isCorrect },
          completionTime,
          behaviorData: {
            clickSequence: newSequence,
            clickTimings: newSequence.map((button, idx) => ({ button, timestamp: Date.now() - (newSequence.length - idx) * 100 })),
            completionTime
          }
        };

        setIsComplete(true);
        onChallengeComplete(response);
      }
    }, [clickSequence, challenge.sequence, challenge.challengeId, onChallengeComplete]);

    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px' }}>
          Expected: {challenge.sequence?.join(' → ')} |
          Your sequence: {clickSequence.join(' → ')}
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          {[1, 2, 3].map(num => (
            <button
              key={num}
              onClick={() => handleButtonClick(num)}
              disabled={isComplete}
              style={{
                width: '80px',
                height: '80px',
                fontSize: '24px',
                fontWeight: 'bold',
                border: '3px solid #4CAF50',
                borderRadius: '8px',
                backgroundColor: clickSequence.includes(num) ? '#4CAF50' : 'white',
                color: clickSequence.includes(num) ? 'white' : '#4CAF50',
                cursor: isComplete ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Typing Cadence Challenge
  const TypingCadenceChallenge: React.FC = () => {
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      setKeystrokeTimings(prev => [...prev, { key: e.key, timestamp: Date.now() }]);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setTypedText(value);

      if (value === challenge.expectedText) {
        const completionTime = Date.now() - startTime.current;
        const response: ChallengeResponse = {
          challengeId: challenge.challengeId,
          response: { text: value, correct: true },
          completionTime,
          behaviorData: {
            keystrokeTimings,
            typingSpeed: value.length / (completionTime / 1000),
            completionTime
          }
        };

        setIsComplete(true);
        onChallengeComplete(response);
      }
    }, [challenge.expectedText, challenge.challengeId, keystrokeTimings, onChallengeComplete]);

    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '20px', fontSize: '16px' }}>
          Type exactly: <strong>"{challenge.expectedText}"</strong>
        </p>
        <input
          type="text"
          value={typedText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isComplete}
          placeholder="Type here..."
          style={{
            width: '300px',
            padding: '15px',
            fontSize: '18px',
            border: '3px solid #4CAF50',
            borderRadius: '8px',
            textAlign: 'center',
            outline: 'none'
          }}
        />
        <p style={{ marginTop: '10px', color: '#666' }}>
          Progress: {typedText.length} / {challenge.expectedText?.length || 0}
        </p>
      </div>
    );
  };

  const renderChallenge = () => {
    switch (challenge.type) {
      case 'mouse-pattern':
        return <MousePatternChallenge />;
      case 'click-sequence':
        return <ClickSequenceChallenge />;
      case 'typing-cadence':
        return <TypingCadenceChallenge />;
      default:
        return <div>Unknown challenge type</div>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
      }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}>
          [CHALLENGE] Security Verification
        </h2>

        <div style={{
          backgroundColor: timeLeft <= 5 ? '#ffebee' : '#e8f5e8',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: `2px solid ${timeLeft <= 5 ? '#f44336' : '#4caf50'}`
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>
            Time Remaining: {Math.max(0, timeLeft)} seconds
          </p>
        </div>

        <p style={{
          fontSize: '16px',
          color: '#555',
          marginBottom: '30px',
          lineHeight: '1.5'
        }}>
          {challenge.instruction}
        </p>

        {!isComplete && renderChallenge()}

        {isComplete && (
          <div style={{
            backgroundColor: '#e8f5e8',
            padding: '20px',
            borderRadius: '8px',
            border: '2px solid #4caf50'
          }}>
            <h3 style={{ color: '#4caf50', margin: '0 0 10px 0' }}>
              Challenge Completed!
            </h3>
            <p style={{ margin: 0, color: '#666' }}>
              Verifying your response...
            </p>
          </div>
        )}

        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#999',
          borderTop: '1px solid #eee',
          paddingTop: '15px'
        }}>
          Challenge ID: {challenge.challengeId.slice(-8)}...
        </div>
      </div>
    </div>
  );
};

export default ChallengeSystem;
