# ml-service/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import logging
from datetime import datetime
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class BehaviorAnalyzer:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_names = [
            'avg_velocity', 'max_velocity', 'velocity_std',
            'avg_acceleration', 'acceleration_std',
            'click_frequency', 'avg_click_interval',
            'avg_keystroke_duration', 'keystroke_rhythm_variance',
            'session_duration', 'movement_smoothness', 'direction_changes'
        ]

    def extract_features(self, behavior_data):
        """Extract ML features from raw behavior data"""
        features = {}

        # Mouse movement features
        mouse_movements = behavior_data.get('mouseMovements', [])
        if mouse_movements:
            velocities = [m.get('velocity', 0) for m in mouse_movements]
            accelerations = [m.get('acceleration', 0) for m in mouse_movements]

            features['avg_velocity'] = np.mean(velocities) if velocities else 0
            features['max_velocity'] = np.max(velocities) if velocities else 0
            features['velocity_std'] = np.std(velocities) if len(velocities) > 1 else 0
            features['avg_acceleration'] = np.mean(accelerations) if accelerations else 0
            features['acceleration_std'] = np.std(accelerations) if len(accelerations) > 1 else 0

            # Movement smoothness (lower = smoother)
            if len(mouse_movements) > 2:
                positions = [(m.get('x', 0), m.get('y', 0)) for m in mouse_movements]
                direction_changes = 0
                for i in range(1, len(positions) - 1):
                    prev_dx = positions[i][0] - positions[i-1][0]
                    prev_dy = positions[i][1] - positions[i-1][1]
                    curr_dx = positions[i+1][0] - positions[i][0]
                    curr_dy = positions[i+1][1] - positions[i][1]

                    # Calculate angle difference
                    if prev_dx != 0 or prev_dy != 0:
                        angle_diff = abs(np.arctan2(curr_dy, curr_dx) - np.arctan2(prev_dy, prev_dx))
                        if angle_diff > np.pi/4:  # 45 degrees
                            direction_changes += 1

                features['direction_changes'] = direction_changes / len(positions)
                features['movement_smoothness'] = np.var(velocities) if len(velocities) > 1 else 0
            else:
                features['direction_changes'] = 0
                features['movement_smoothness'] = 0
        else:
            # No mouse data - suspicious
            features.update({
                'avg_velocity': 0, 'max_velocity': 0, 'velocity_std': 0,
                'avg_acceleration': 0, 'acceleration_std': 0,
                'direction_changes': 0, 'movement_smoothness': 0
            })

        # Click pattern features
        clicks = behavior_data.get('clicks', [])
        if len(clicks) > 1:
            click_times = [c.get('timestamp', 0) for c in clicks]
            intervals = [click_times[i] - click_times[i-1] for i in range(1, len(click_times))]

            session_duration = behavior_data.get('sessionDuration', 1000)
            features['click_frequency'] = len(clicks) / (session_duration / 1000)
            features['avg_click_interval'] = np.mean(intervals) if intervals else 0
        else:
            features['click_frequency'] = 0
            features['avg_click_interval'] = 0

        # Keystroke features
        keystrokes = behavior_data.get('keystrokes', [])
        if keystrokes:
            durations = [k.get('duration', 0) for k in keystrokes]
            features['avg_keystroke_duration'] = np.mean(durations)
            features['keystroke_rhythm_variance'] = np.var(durations) if len(durations) > 1 else 0
        else:
            features['avg_keystroke_duration'] = 0
            features['keystroke_rhythm_variance'] = 0

        # Session features
        features['session_duration'] = behavior_data.get('sessionDuration', 0) / 1000

        return features

    def generate_synthetic_data(self, num_samples=1000):
        """Generate synthetic training data"""
        logger.info(f"Generating {num_samples} synthetic samples...")

        data = []

        for i in range(num_samples):
            is_human = np.random.random() > 0.3  # 70% human, 30% bot

            if is_human:
                # Human-like patterns
                sample = {
                    'avg_velocity': np.random.normal(1.5, 0.8),
                    'max_velocity': np.random.normal(4.0, 1.5),
                    'velocity_std': np.random.normal(0.8, 0.3),
                    'avg_acceleration': np.random.normal(0.3, 0.2),
                    'acceleration_std': np.random.normal(0.4, 0.2),
                    'click_frequency': np.random.normal(0.8, 0.4),
                    'avg_click_interval': np.random.normal(2000, 1000),
                    'avg_keystroke_duration': np.random.normal(120, 40),
                    'keystroke_rhythm_variance': np.random.normal(800, 400),
                    'session_duration': np.random.normal(30, 15),
                    'movement_smoothness': np.random.normal(0.6, 0.3),
                    'direction_changes': np.random.normal(0.3, 0.1),
                    'is_human': 1
                }
            else:
                # Bot-like patterns
                sample = {
                    'avg_velocity': np.random.choice([np.random.normal(0.1, 0.05), np.random.normal(8.0, 2.0)]),
                    'max_velocity': np.random.choice([np.random.normal(0.2, 0.1), np.random.normal(15.0, 5.0)]),
                    'velocity_std': np.random.normal(0.1, 0.05),
                    'avg_acceleration': np.random.choice([np.random.normal(0.01, 0.005), np.random.normal(2.0, 0.5)]),
                    'acceleration_std': np.random.normal(0.05, 0.02),
                    'click_frequency': np.random.choice([0, np.random.normal(5.0, 2.0)]),
                    'avg_click_interval': np.random.choice([0, np.random.normal(100, 50)]),
                    'avg_keystroke_duration': np.random.choice([np.random.normal(20, 5), np.random.normal(500, 100)]),
                    'keystroke_rhythm_variance': np.random.normal(50, 25),
                    'session_duration': np.random.normal(3, 2),
                    'movement_smoothness': np.random.normal(0.1, 0.05),
                    'direction_changes': np.random.normal(0.1, 0.05),
                    'is_human': 0
                }

            # Ensure no negative values
            for key in sample:
                if key != 'is_human' and sample[key] < 0:
                    sample[key] = 0

            data.append(sample)

        return pd.DataFrame(data)

    def train_model(self, data=None):
        """Train the behavior classification model"""
        logger.info("Training behavior classification model...")

        if data is None:
            data = self.generate_synthetic_data(2000)

        # Prepare features and labels
        X = data[self.feature_names]
        y = data['is_human']

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train Random Forest model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            class_weight='balanced'
        )

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)

        logger.info(f"Model trained - Train accuracy: {train_score:.3f}, Test accuracy: {test_score:.3f}")

        self.is_trained = True
        return {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'feature_importance': dict(zip(self.feature_names, self.model.feature_importances_))
        }

    def predict(self, behavior_data):
        """Predict if behavior is human or bot"""
        if not self.is_trained:
            return {'error': 'Model not trained yet'}

        try:
            # Extract features
            features = self.extract_features(behavior_data)

            # Create feature vector
            feature_vector = np.array([[features[name] for name in self.feature_names]])

            # Scale features
            feature_vector_scaled = self.scaler.transform(feature_vector)

            # Predict
            prediction = self.model.predict(feature_vector_scaled)[0]
            probability = self.model.predict_proba(feature_vector_scaled)[0]

            human_probability = probability[1]  # Probability of being human
            bot_probability = probability[0]    # Probability of being bot

            return {
                'is_human': bool(prediction),
                'human_probability': float(human_probability),
                'bot_probability': float(bot_probability),
                'confidence': float(max(human_probability, bot_probability)),
                'risk_score': float(1 - human_probability),
                'features': features,
                'prediction_timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return {'error': f'Prediction failed: {str(e)}'}

# Global analyzer instance
analyzer = BehaviorAnalyzer()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'ML Behavior Analysis Service',
        'model_trained': analyzer.is_trained,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/train', methods=['POST'])
def train_model():
    try:
        results = analyzer.train_model()
        return jsonify({
            'success': True,
            'results': results,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Training error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/predict', methods=['POST'])
def predict_behavior():
    try:
        data = request.json
        behavior_data = data.get('behaviorData')

        if not behavior_data:
            return jsonify({
                'success': False,
                'error': 'No behavior data provided'
            }), 400

        prediction = analyzer.predict(behavior_data)

        if 'error' in prediction:
            return jsonify({
                'success': False,
                'error': prediction['error']
            }), 400

        return jsonify({
            'success': True,
            'prediction': prediction
        })

    except Exception as e:
        logger.error(f"Prediction endpoint error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Prediction failed: {str(e)}'
        }), 500

@app.route('/model/info', methods=['GET'])
def model_info():
    if not analyzer.is_trained:
        return jsonify({
            'trained': False,
            'message': 'Model not trained yet'
        })

    return jsonify({
        'trained': True,
        'features': analyzer.feature_names,
        'feature_importance': dict(zip(analyzer.feature_names, analyzer.model.feature_importances_)) if analyzer.model else None
    })

if __name__ == '__main__':
    # Auto-train model on startup
    logger.info("Starting ML service and training model...")
    analyzer.train_model()

    app.run(host='0.0.0.0', port=5001, debug=True)
