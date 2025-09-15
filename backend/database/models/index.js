// backend/database/models/index.js
const { Sequelize } = require('sequelize');
const UserSessionModel = require('./UserSession');
const BehaviorDataModel = require('./BehaviorData');
const ThreatEventModel = require('./ThreatEvent');
const MLResultModel = require('./MLResult');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'behavioral_captcha',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

const UserSession = UserSessionModel(sequelize, Sequelize.DataTypes);
const BehaviorData = BehaviorDataModel(sequelize, Sequelize.DataTypes);
const ThreatEvent = ThreatEventModel(sequelize, Sequelize.DataTypes);
const MLResult = MLResultModel(sequelize, Sequelize.DataTypes);

// Define associations
UserSession.hasMany(BehaviorData, { foreignKey: 'sessionId', as: 'behaviorData' });
BehaviorData.belongsTo(UserSession, { foreignKey: 'sessionId', as: 'session' });

UserSession.hasMany(ThreatEvent, { foreignKey: 'sessionId', as: 'threats' });
ThreatEvent.belongsTo(UserSession, { foreignKey: 'sessionId', as: 'session' });

UserSession.hasMany(MLResult, { foreignKey: 'sessionId', as: 'mlResults' });
MLResult.belongsTo(UserSession, { foreignKey: 'sessionId', as: 'session' });

const db = {
  sequelize,
  Sequelize,
  UserSession,
  BehaviorData,
  ThreatEvent,
  MLResult
};

module.exports = db;
