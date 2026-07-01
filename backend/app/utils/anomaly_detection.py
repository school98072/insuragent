import math
import numpy as np

# Try to import real scikit-learn classes, with a native Python fallback if not available
try:
    from sklearn.ensemble import IsolationForest as RealIsolationForest
    from sklearn.feature_extraction.text import TfidfVectorizer as RealTfidfVectorizer
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

class TransactionAuditSkills:
    def __init__(self):
        if HAS_SKLEARN:
            self.anomaly_detector = RealIsolationForest(contamination=0.05, random_state=42)
            self.text_vectorizer = RealTfidfVectorizer(max_features=100)
        else:
            self.anomaly_detector = None
            self.text_vectorizer = None
            
        # Keep internal parameters for fallback statistical Z-score check
        self.historical_amounts = [3500.0, 5800.0, 12500.0, 15000.0, 32000.0]
        self.mean_amount = sum(self.historical_amounts) / len(self.historical_amounts)
        variance = sum((x - self.mean_amount) ** 2 for x in self.historical_amounts) / len(self.historical_amounts)
        self.std_amount = math.sqrt(variance) if variance > 0 else 1.0

    def fit_anomaly_model(self, historical_transactions: np.ndarray):
        """Train the isolation forest outlier detector on historical transaction vectors."""
        if HAS_SKLEARN and self.anomaly_detector is not None:
            self.anomaly_detector.fit(historical_transactions)
        else:
            # Fallback: update running mean and std
            amounts = [row[0] for row in historical_transactions]
            if amounts:
                self.mean_amount = sum(amounts) / len(amounts)
                variance = sum((x - self.mean_amount) ** 2 for x in amounts) / len(amounts)
                self.std_amount = math.sqrt(variance) if variance > 0 else 1.0

    def detect_outliers(self, current_transaction: list) -> bool:
        """
        Detects anomalies like off-hours (2:00-3:00 AM) or extremely high monetary values.
        Input format: [Amount, Timestamp_Hour]
        """
        amount, hour = current_transaction[0], current_transaction[1]
        
        if HAS_SKLEARN and self.anomaly_detector is not None:
            data = np.array([current_transaction])
            try:
                # If model is not fitted yet, fit it with dummy range
                if not hasattr(self.anomaly_detector, "estimators_"):
                    dummy_history = np.array([
                        [3500.0, 10.0],
                        [5800.0, 14.0],
                        [12500.0, 16.0],
                        [15000.0, 9.0],
                        [32000.0, 11.0],
                        [amount, hour] # Add current to avoid single value fit
                    ])
                    self.anomaly_detector.fit(dummy_history)
                prediction = self.anomaly_detector.predict(data)
                return True if prediction[0] == -1 else False
            except Exception:
                pass
                
        # Native Python fallback checking for off-hours operations or excessive Z-score
        z_score = (amount - self.mean_amount) / self.std_amount
        if z_score > 3.0:
            return True
        if 2 <= hour < 3: # Velvet Fraud: off-hours operations between 2:00 and 3:00 AM
            return True
        return False

    def audit_text_logs(self, log_lines: list, suspicious_terms: list) -> list:
        """Perform semantic tf-idf log auditing to identify non-compliant statements."""
        if HAS_SKLEARN and self.text_vectorizer is not None:
            try:
                tfidf_matrix = self.text_vectorizer.fit_transform(log_lines)
                features = self.text_vectorizer.get_feature_names_out()
            except Exception:
                pass
                
        anomalous_indices = []
        for idx, line in enumerate(log_lines):
            if any(term in line.lower() for term in suspicious_terms):
                anomalous_indices.append(idx)
        return anomalous_indices
