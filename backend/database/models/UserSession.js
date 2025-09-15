// backend/database/models/UserSession.js
module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    deviceFingerprint: {
      type: DataTypes.STRING,
      allowNull: true
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER, // milliseconds
      allowNull: true
    },
    verificationStatus: {
      type: DataTypes.ENUM('pending', 'human', 'bot', 'failed', 'challenged'),
      defaultValue: 'pending'
    },
    riskScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: 0.5
    },
    humanProbability: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    challengesPresented: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    challengesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB, // PostgreSQL JSONB for efficient querying
      allowNull: true
    }
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    indexes: [
      { fields: ['sessionId'] },
      { fields: ['ipAddress'] },
      { fields: ['verificationStatus'] },
      { fields: ['createdAt'] },
      { fields: ['riskScore'] }
    ]
  });

  return UserSession;
};
