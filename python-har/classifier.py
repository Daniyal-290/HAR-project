"""
Activity classifier for HAR pipeline.

Supports three modes:
  - "rules"  : Hand-crafted heuristic rules (default, no training needed)
  - "svm"    : Scikit-learn SVM loaded from a .pkl file
  - "lstm"   : Keras LSTM loaded from a .h5 file

The rule-based classifier analyses the sliding window's statistical
features to determine the most likely activity.
"""

import os
import numpy as np
import config


class ActivityClassifier:
    """Predict desk activities from a sliding window of landmarks."""

    def __init__(self, mode=None):
        self.mode = mode or config.CLASSIFIER_MODE
        self.model = None

        if self.mode == "svm":
            self._load_svm()
        elif self.mode == "lstm":
            self._load_lstm()

    # ── Public API ──────────────────────────────────────────

    def predict(self, feature_engine):
        """
        Classify the current activity.

        Parameters
        ----------
        feature_engine : FeatureEngine
            Must have a full window available.

        Returns
        -------
        label_id   : int
        label_name : str
        category   : str
        confidence : float  (0–1)
        """
        if self.mode == "rules":
            return self._predict_rules(feature_engine)
        elif self.mode == "svm":
            return self._predict_svm(feature_engine)
        elif self.mode == "lstm":
            return self._predict_lstm(feature_engine)
        else:
            return 10, config.ACTIVITY_LABELS[10], "Other", 0.0

    # ── Rule-based classifier ──────────────────────────────

    def _predict_rules(self, fe):
        """
        Heuristic rules using averaged window statistics.
        Priority order matters — first match wins.
        """
        window = fe.get_window()          # (90, 140)
        flat = fe.get_flat_features()

        # ── Helpers: extract landmark series from window ────
        # Pose features are indices 0..131 (33 landmarks × 4)
        # Face features are indices 132..139 (8 ratios)
        def pose_col(landmark_idx, axis):
            """axis: 0=x, 1=y, 2=z, 3=vis"""
            return window[:, landmark_idx * 4 + axis]

        def face_col(ratio_idx):
            """ratio indices 0..7 mapped to columns 132..139"""
            return window[:, 132 + ratio_idx]

        # Key landmark indices (MediaPipe Pose)
        NOSE = 0
        L_SHOULDER, R_SHOULDER = 11, 12
        L_ELBOW, R_ELBOW = 13, 14
        L_WRIST, R_WRIST = 15, 16
        L_HIP, R_HIP = 23, 24
        L_EAR, R_EAR = 7, 8

        # ── Derived signals ─────────────────────────────────
        # Wrist Y positions (normalised to hip — negative = above hip)
        l_wrist_y = pose_col(L_WRIST, 1)
        r_wrist_y = pose_col(R_WRIST, 1)
        l_shoulder_y = pose_col(L_SHOULDER, 1)
        r_shoulder_y = pose_col(R_SHOULDER, 1)
        nose_y = pose_col(NOSE, 1)

        # Wrist-to-nose distance (proxy for hand near face)
        l_wrist_nose = np.sqrt(
            (pose_col(L_WRIST, 0) - pose_col(NOSE, 0)) ** 2
            + (pose_col(L_WRIST, 1) - pose_col(NOSE, 1)) ** 2
        )
        r_wrist_nose = np.sqrt(
            (pose_col(R_WRIST, 0) - pose_col(NOSE, 0)) ** 2
            + (pose_col(R_WRIST, 1) - pose_col(NOSE, 1)) ** 2
        )
        min_wrist_nose = np.minimum(l_wrist_nose, r_wrist_nose)

        # Wrist-to-ear distance (proxy for phone usage)
        l_wrist_ear = np.sqrt(
            (pose_col(L_WRIST, 0) - pose_col(L_EAR, 0)) ** 2
            + (pose_col(L_WRIST, 1) - pose_col(L_EAR, 1)) ** 2
        )
        r_wrist_ear = np.sqrt(
            (pose_col(R_WRIST, 0) - pose_col(R_EAR, 0)) ** 2
            + (pose_col(R_WRIST, 1) - pose_col(R_EAR, 1)) ** 2
        )

        # Face ratios
        mouth_open = face_col(0)       # mouth openness
        mouth_ratio = face_col(2)      # mouth aspect ratio
        avg_ear = face_col(5)          # average eye aspect ratio
        head_pitch = face_col(6)       # forward tilt (degrees)

        # Wrist movement (std of position = how much hands are moving)
        l_wrist_x_std = np.std(pose_col(L_WRIST, 0))
        r_wrist_x_std = np.std(pose_col(R_WRIST, 0))
        l_wrist_y_std = np.std(pose_col(L_WRIST, 1))
        r_wrist_y_std = np.std(pose_col(R_WRIST, 1))
        wrist_movement = l_wrist_x_std + r_wrist_x_std + l_wrist_y_std + r_wrist_y_std

        # Shoulder movement (for micro-workouts)
        l_shoulder_y_std = np.std(pose_col(L_SHOULDER, 1))
        r_shoulder_y_std = np.std(pose_col(R_SHOULDER, 1))
        shoulder_movement = l_shoulder_y_std + r_shoulder_y_std

        # ── Rule checks (priority order) ────────────────────

        # 1. STRETCHING — arms raised well above shoulders
        arms_above = np.mean(
            (l_wrist_y < l_shoulder_y - config.STRETCH_ARM_RAISE_THRESHOLD)
            | (r_wrist_y < r_shoulder_y - config.STRETCH_ARM_RAISE_THRESHOLD)
        )
        if arms_above > 0.5:
            return 7, config.ACTIVITY_LABELS[7], config.LABEL_TO_CATEGORY[7], min(0.6 + arms_above * 0.3, 0.95)



        # 3. DRINKING WATER — hand near mouth, brief upward tilt
        mean_min_wrist_nose = np.mean(min_wrist_nose)
        wrist_near_mouth_ratio = np.mean(min_wrist_nose < config.DRINKING_WRIST_MOUTH_DIST)
        if wrist_near_mouth_ratio > 0.15 and np.mean(head_pitch) < 25:
            return 3, config.ACTIVITY_LABELS[3], config.LABEL_TO_CATEGORY[3], min(0.55 + wrist_near_mouth_ratio * 0.4, 0.9)

        # 4. EATING — hand near face for longer, more varied movement
        eating_ratio = np.mean(min_wrist_nose < config.EATING_WRIST_MOUTH_DIST)
        if eating_ratio > 0.15 and wrist_movement > 0.01:
            return 4, config.ACTIVITY_LABELS[4], config.LABEL_TO_CATEGORY[4], min(0.5 + eating_ratio * 0.35, 0.85)

        # 5. USING MOBILE PHONE — hand near ear
        phone_ratio_l = np.mean(l_wrist_ear < config.PHONE_HAND_EAR_DIST)
        phone_ratio_r = np.mean(r_wrist_ear < config.PHONE_HAND_EAR_DIST)
        phone_ratio = max(phone_ratio_l, phone_ratio_r)
        if phone_ratio > 0.2:
            return 6, config.ACTIVITY_LABELS[6], config.LABEL_TO_CATEGORY[6], min(0.5 + phone_ratio * 0.4, 0.9)

        # 6. TALKING / IN MEETING — mouth moving, upright posture
        mouth_open_ratio = np.mean(mouth_ratio > config.MOUTH_OPEN_THRESHOLD)
        mouth_variation = np.std(mouth_open)
        if mouth_open_ratio > 0.3 and mouth_variation > 0.003 and np.mean(head_pitch) < 30:
            return 2, config.ACTIVITY_LABELS[2], config.LABEL_TO_CATEGORY[2], min(0.5 + mouth_open_ratio * 0.35, 0.85)

        # 7. SLOUCHING (Tech Neck) — significant forward head tilt
        mean_head_pitch = np.mean(head_pitch)
        if mean_head_pitch > config.SLOUCH_HEAD_ANGLE_THRESHOLD:
            severity = (mean_head_pitch - config.SLOUCH_HEAD_ANGLE_THRESHOLD) / 20
            # Check if also squinting → reading
            mean_ear = np.mean(avg_ear)
            if mean_ear < config.EAR_SQUINT_THRESHOLD and mean_head_pitch > config.WRITING_HEAD_DOWN_ANGLE:
                return 9, config.ACTIVITY_LABELS[9], config.LABEL_TO_CATEGORY[9], min(0.5 + severity * 0.3, 0.85)
            return 8, config.ACTIVITY_LABELS[8], config.LABEL_TO_CATEGORY[8], min(0.55 + severity * 0.35, 0.9)

        # 8. WRITING ON PAPER — head looking down + hand movement
        if np.mean(head_pitch) > config.WRITING_HEAD_DOWN_ANGLE and wrist_movement > 0.008:
            return 1, config.ACTIVITY_LABELS[1], config.LABEL_TO_CATEGORY[1], 0.6

        # 9. READING — leaning forward and/or squinting
        mean_ear = np.mean(avg_ear)
        if mean_ear < config.EAR_SQUINT_THRESHOLD:
            return 9, config.ACTIVITY_LABELS[9], config.LABEL_TO_CATEGORY[9], 0.55

        # 10. TYPING — low Y-axis wrist variation, some X movement, neutral posture
        if (l_wrist_y_std < 0.03 and r_wrist_y_std < 0.03
                and (l_wrist_x_std > 0.005 or r_wrist_x_std > 0.005)
                and np.mean(head_pitch) < config.SLOUCH_HEAD_ANGLE_THRESHOLD):
            return 0, config.ACTIVITY_LABELS[0], config.LABEL_TO_CATEGORY[0], 0.65

        # 11. IDLE / NEUTRAL — fallback
        print(f"[Debug] wrist_nose: {np.mean(min_wrist_nose):.3f}, wrist_ear: {np.mean(np.minimum(l_wrist_ear, r_wrist_ear)):.3f}, wrist_mov: {wrist_movement:.3f}, head_pitch: {np.mean(head_pitch):.1f}, avg_ear: {np.mean(avg_ear):.3f}", flush=True)
        return 10, config.ACTIVITY_LABELS[10], config.LABEL_TO_CATEGORY[10], 0.5

    # ── ML-based classifiers ───────────────────────────────

    def _load_svm(self):
        """Load a pre-trained SVM model from disk."""
        path = config.MODEL_PATH_SVM
        if os.path.exists(path):
            import joblib
            self.model = joblib.load(path)
            print(f"[Classifier] SVM model loaded from {path}")
        else:
            print(f"[Classifier] WARNING: SVM model not found at {path}, falling back to rules.")
            self.mode = "rules"

    def _load_lstm(self):
        """Load a pre-trained LSTM model from disk."""
        path = config.MODEL_PATH_LSTM
        if os.path.exists(path):
            from tensorflow import keras
            self.model = keras.models.load_model(path)
            print(f"[Classifier] LSTM model loaded from {path}")
        else:
            print(f"[Classifier] WARNING: LSTM model not found at {path}, falling back to rules.")
            self.mode = "rules"

    def _predict_svm(self, fe):
        """Predict using SVM on flattened statistical features."""
        features = fe.get_flat_features().reshape(1, -1)
        label_id = int(self.model.predict(features)[0])
        probas = self.model.predict_proba(features)[0]
        confidence = float(probas[label_id])
        label_name = config.ACTIVITY_LABELS.get(label_id, "Unknown")
        category = config.LABEL_TO_CATEGORY.get(label_id, "Other")
        return label_id, label_name, category, confidence

    def _predict_lstm(self, fe):
        """Predict using LSTM on sequence data."""
        sequence = fe.get_sequence_features()  # (1, 90, 140)
        probas = self.model.predict(sequence, verbose=0)[0]
        label_id = int(np.argmax(probas))
        confidence = float(probas[label_id])
        label_name = config.ACTIVITY_LABELS.get(label_id, "Unknown")
        category = config.LABEL_TO_CATEGORY.get(label_id, "Other")
        return label_id, label_name, category, confidence
