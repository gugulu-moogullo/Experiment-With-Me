// frontend/src/services/captchaApi.ts
interface CaptchaValidationRequest {
  behaviorData: {
    mouseMovements: Array<{
      x: number;
      y: number;
      timestamp: number;
      velocity: number;
      acceleration: number;
    }>;
    clicks: Array<{
      x: number;
      y: number;
      timestamp: number;
    }>;
    keystrokes: Array<{
      key: string;
      timestamp: number;
      duration: number;
    }>;
    sessionDuration: number;
    pageVisible: boolean;
  };
  sessionId: string;
}

interface CaptchaValidationResponse {
  success: boolean;
  result?: {
    isHuman: boolean;
    riskScore: number;
    confidence: number;
    needsChallenge: boolean;
    sessionId: string;
    timestamp: string;
    analysis: {
      mouseMovements: number;
      clicks: number;
      keystrokes: number;
      sessionDuration: number;
    };
  };
  error?: string;
}

interface ChallengeRequest {
  challengeType: 'mouse-pattern' | 'click-sequence' | 'typing-cadence';
  sessionId: string;
}

interface ChallengeResponse {
  success: boolean;
  challenge?: {
    type: string;
    instruction: string;
    sessionId: string;
    challengeId: string;
    timestamp: string;
    timeLimit: number;
    [key: string]: any;
  };
  error?: string;
}

class CaptchaApiService {
  private baseUrl: string;
  private sessionId: string;

  constructor(baseUrl: string = 'http://localhost:5000/api') {
    this.baseUrl = baseUrl;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async makeRequest<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async validateBehavior(behaviorData: any): Promise<CaptchaValidationResponse> {
    const request: CaptchaValidationRequest = {
      behaviorData,
      sessionId: this.sessionId
    };

    return this.makeRequest<CaptchaValidationResponse>('/captcha/validate', 'POST', request);
  }

  async requestChallenge(challengeType: ChallengeRequest['challengeType']): Promise<ChallengeResponse> {
    const request: ChallengeRequest = {
      challengeType,
      sessionId: this.sessionId
    };

    return this.makeRequest<ChallengeResponse>('/captcha/challenge', 'POST', request);
  }

  async getAnalytics(behaviorData: any): Promise<any> {
    return this.makeRequest('/analytics', 'POST', { behaviorData });
  }

  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.makeRequest('/health');
  }

  getSessionId(): string {
    return this.sessionId;
  }

  resetSession(): void {
    this.sessionId = this.generateSessionId();
  }
}

export default CaptchaApiService;
