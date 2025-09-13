// backend/server.js (UPDATED VERSION)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fetch = require('node-fetch'); // npm install node-fetch

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// ML Service integration
async function callMLService(endpoint, data = null) {
  try {
    const options = {
      method: data ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(`ML Service error: ${result.error || 'Unknown error'}`);
    }

    return result;
  } catch (error) {
    console.error(`ML Service call failed (${endpoint}):`, error.message);
    throw error;
  }
}

// Fallback risk calculation (if ML service is down)
function calculateBasicRiskScore(behaviorData) {
  let riskScore = 0.5; // Neutral start

  const { mouseMovements, clicks, keystrokes, sessionDuration } = behaviorData;

  // Mouse movement analysis
  if (mouseMovements && mouseMovements.length > 0) {
    const avgVelocity = mouseMovements.reduce((sum, m) => sum + (m.velocity || 0), 0) / mouseMovements.length;
    const velocityVariation = mouseMovements.map(m => m.velocity || 0).reduce((acc, v, i, arr) => {
      return i > 0 ? acc + Math.abs(v - arr[i-1]) : acc;
    }, 0) / Math.max(mouseMovements.length - 1, 1);

    // Human-like velocity patterns
    if (avgVelocity > 0.1 && avgVelocity < 3.0) riskScore -= 0.1; // Good
    if (velocityVariation > 0.5) riskScore -= 0.1; // Natural variation

    // Bot-like patterns
    if (avgVelocity > 10 || avgVelocity === 0) riskScore += 0.2; // Too fast or static
    if (velocityVariation < 0.1) riskScore += 0.2; // Too consistent
  } else {
    riskScore += 0.3; // No mouse data is suspicious
  }

  // Click analysis
  if (clicks && clicks.length > 0) {
    const clickFrequency = clicks.length / Math.max(sessionDuration / 1000, 1);
    if (clickFrequency > 0.1 && clickFrequency < 2.0) riskScore -= 0.1; // Normal frequency
    if (clickFrequency > 5.0) riskScore += 0.2; // Too frequent
  }

  // Keystroke analysis
  if (keystrokes && keystrokes.length > 0) {
    const avgDuration = keystrokes.reduce((sum, k) => sum + (k.duration || 0), 0) / keystrokes.length;
    if (avgDuration > 50 && avgDuration < 300) riskScore -= 0.1; // Human-like timing
    if (avgDuration < 20 || avgDuration > 500) riskScore += 0.1; // Unusual timing
  }

  // Session duration analysis
  if (sessionDuration > 5000) riskScore -= 0.1; // Longer sessions are more human
  if (sessionDuration < 1000) riskScore += 0.2; // Very short sessions are suspicious

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, riskScore));
}

// Routes
app.get('/api/health', async (req, res) => {
  try {
    // Check ML service health
    const mlHealth = await callMLService('/health');

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Behavioral CAPTCHA API',
      ml_service: {
        status: mlHealth.status,
        model_trained: mlHealth.model_trained
      }
    });
  } catch (error) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Behavioral CAPTCHA API',
      ml_service: {
        status: 'unavailable',
        error: error.message,
        fallback: 'Using basic risk calculation'
      }
    });
  }
});

// Main CAPTCHA validation endpoint with ML integration
app.post('/api/captcha/validate', async (req, res) => {
  try {
    const { behaviorData, sessionId } = req.body;

    // Validate input
    if (!behaviorData) {
      return res.status(400).json({
        error: 'Missing behavior data',
        success: false
      });
    }

    let mlResult = null;
    let isHuman = false;
    let riskScore = 0.5;
    let confidence = 0.5;
    let method = 'fallback';

    try {
      // Try ML service first
      const mlResponse = await callMLService('/predict', { behaviorData });

      if (mlResponse.success && mlResponse.prediction) {
        mlResult = mlResponse.prediction;
        isHuman = mlResult.is_human;
        riskScore = mlResult.risk_score;
        confidence = mlResult.confidence;
        method = 'ml_model';

        console.log(`ML Prediction: Human=${isHuman}, Risk=${riskScore.toFixed(3)}, Confidence=${confidence.toFixed(3)}`);
      } else {
        throw new Error('ML service returned invalid response');
      }

    } catch (mlError) {
      // Fallback to basic algorithm
      console.warn('ML service unavailable, using fallback:', mlError.message);

      riskScore = calculateBasicRiskScore(behaviorData);
      isHuman = riskScore < 0.6;
      confidence = Math.abs(0.5 - riskScore) * 2;
      method = 'fallback_algorithm';
    }

    // Determine if challenge is needed
    const needsChallenge = riskScore > 0.7 || confidence < 0.4;

    // Log for debugging
    console.log(`Session ${sessionId}: Risk=${riskScore.toFixed(3)}, Human=${isHuman}, Challenge=${needsChallenge}, Method=${method}`);

    res.json({
      success: true,
      result: {
        isHuman,
        riskScore,
        confidence,
        needsChallenge,
        sessionId,
        timestamp: new Date().toISOString(),
        method,
        analysis: {
          mouseMovements: behaviorData.mouseMovements?.length || 0,
          clicks: behaviorData.clicks?.length || 0,
          keystrokes: behaviorData.keystrokes?.length || 0,
          sessionDuration: behaviorData.sessionDuration || 0
        },
        mlDetails: mlResult ? {
          humanProbability: mlResult.human_probability,
          botProbability: mlResult.bot_probability,
          features: mlResult.features
        } : null
      }
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

// Train ML model endpoint
app.post('/api/ml/train', async (req, res) => {
  try {
    const trainResult = await callMLService('/train', {});
    res.json({
      success: true,
      training: trainResult.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get ML model info
app.get('/api/ml/info', async (req, res) => {
  try {
    const modelInfo = await callMLService('/model/info');
    res.json({
      success: true,
      model: modelInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analytics endpoint for admin dashboard
app.post('/api/analytics', (req, res) => {
  try {
    const { behaviorData } = req.body;

    // Basic analytics calculation
    const analytics = {
      totalInteractions: (behaviorData.mouseMovements?.length || 0) +
                        (behaviorData.clicks?.length || 0) +
                        (behaviorData.keystrokes?.length || 0),
      avgMouseVelocity: behaviorData.mouseMovements?.length > 0
        ? behaviorData.mouseMovements.reduce((sum, m) => sum + (m.velocity || 0), 0) / behaviorData.mouseMovements.length
        : 0,
      clickFrequency: behaviorData.clicks?.length > 0 && behaviorData.sessionDuration > 0
        ? behaviorData.clicks.length / (behaviorData.sessionDuration / 1000)
        : 0,
      avgKeystrokeDuration: behaviorData.keystrokes?.length > 0
        ? behaviorData.keystrokes.reduce((sum, k) => sum + (k.duration || 0), 0) / behaviorData.keystrokes.length
        : 0,
      sessionDuration: behaviorData.sessionDuration || 0
    };

    res.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: 'Analytics processing failed',
      success: false
    });
  }
});

// Challenge endpoint (for when additional verification is needed)
app.post('/api/captcha/challenge', (req, res) => {
  try {
    const { challengeType, sessionId } = req.body;

    // Generate simple challenges based on type
    const challenges = {
      'mouse-pattern': {
        type: 'mouse-pattern',
        instruction: 'Draw a circle with your mouse',
        expectedPattern: 'circle',
        timeLimit: 10000
      },
      'click-sequence': {
        type: 'click-sequence',
        instruction: 'Click the buttons in order: 1, 3, 2',
        sequence: [1, 3, 2],
        timeLimit: 15000
      },
      'typing-cadence': {
        type: 'typing-cadence',
        instruction: 'Type: "I am human"',
        expectedText: 'I am human',
        timeLimit: 10000
      }
    };

    const challenge = challenges[challengeType] || challenges['mouse-pattern'];

    res.json({
      success: true,
      challenge: {
        ...challenge,
        sessionId,
        challengeId: `challenge_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({
      error: 'Challenge generation failed',
      success: false
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    success: false
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    success: false
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Behavioral CAPTCHA API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`ML Service URL: ${ML_SERVICE_URL}`);
});
