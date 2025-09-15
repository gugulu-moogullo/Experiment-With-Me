// backend/database/models/BehaviorData.js
module.exports = (sequelize, DataTypes) => {
  const BehaviorData = sequelize.define('BehaviorData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'user_sessions',
        key: 'sessionId'
      }
    },
    // Mouse movement data
    mouseMovements: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    totalMousePoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avgVelocity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    maxVelocity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    velocityVariance: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    avgAcceleration: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    directionChanges: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    mouseArea: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    // Click data
    clicks: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    totalClicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clickFrequency: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    avgClickInterval: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    doubleClicks: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    clickDistribution: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    // Keystroke data
    keystrokes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    totalKeystrokes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    avgKeystrokeDuration: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    typingSpeed: {
      type: DataTypes.FLOAT, // WPM
      allowNull: true
    },
    keystrokeRhythm: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    typingPattern: {
      type: DataTypes.ENUM('hunt-peck', 'touch-typing', 'hybrid', 'bot-like', 'unknown'),
      defaultValue: 'unknown'
    },

    // Session metrics
    sessionDuration: {
      type: DataTypes.INTEGER, // milliseconds
      allowNull: true
    },
    interactionDensity: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    engagementScore: {
      type: DataTypes.INTEGER, // 0-100
      allowNull: true
    },
    pageVisible: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    // Touch data (for mobile)
    touchEvents: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    avgPressure: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    touchPrecision: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    gestureFrequency: {
      type: DataTypes.JSONB,
      allowNull: true
    },

    // Device information
    screenWidth: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    screenHeight: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    devicePixelRatio: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    maxTouchPoints: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    hardwareConcurrency: {
      type: DataTypes.INTEGER,
      allowNull: true
    },

    // Behavioral flags
    suspiciousPatterns: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    anomalyScore: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    humanLikelihood: {
      type: DataTypes.FLOAT,
      allowNull: true
    }
  }, {
    tableName: 'behavior_data',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['createdAt'] },
      { fields: ['humanLikelihood'] },
      { fields: ['anomalyScore'] },
      { fields: ['typingPattern'] }
    ]
  });

  return BehaviorData;
};
