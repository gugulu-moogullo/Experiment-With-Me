// backend/database/models/ThreatEvent.js
module.exports = (sequelize, DataTypes) => {
  const ThreatEvent = sequelize.define('ThreatEvent', {
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
    threatType: {
      type: DataTypes.ENUM('bot-attack', 'suspicious-behavior', 'challenge-failure', 'anomaly', 'rate-limit', 'fingerprint-mismatch'),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    confidence: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        min: 0,
        max: 1
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    attackVector: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    actionTaken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    falsePositive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: []
    },
    relatedEvents: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'threat_events',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['threatType'] },
      { fields: ['severity'] },
      { fields: ['riskScore'] },
      { fields: ['ipAddress'] },
      { fields: ['resolved'] },
      { fields: ['createdAt'] },
      { fields: ['country', 'city'] }
    ]
  });

  return ThreatEvent;
};
