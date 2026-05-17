"""
Sliding window buffer and feature engineering for HAR classification.

Collects per-frame feature vectors into a temporal window and computes
statistical + velocity features for the classifier.
"""

import collections
import numpy as np
from config import WINDOW_SIZE, WINDOW_STRIDE


class FeatureEngine:
    """Manages a sliding window buffer and extracts temporal features."""

    def __init__(self, window_size=WINDOW_SIZE, stride=WINDOW_STRIDE):
        self.window_size = window_size
        self.stride = stride
        self.buffer = collections.deque(maxlen=window_size)
        self.frame_count = 0

    def push(self, feature_vector):
        """
        Add a per-frame feature vector to the buffer.

        Parameters
        ----------
        feature_vector : np.ndarray of shape (140,)

        Returns
        -------
        ready : bool
            True if the buffer is full AND we are on a stride boundary.
        """
        self.buffer.append(feature_vector)
        self.frame_count += 1
        return (
            len(self.buffer) == self.window_size
            and self.frame_count % self.stride == 0
        )

    def get_window(self):
        """
        Return the current window as a 2D array.

        Returns
        -------
        window : np.ndarray of shape (window_size, 140)
        """
        return np.array(list(self.buffer), dtype=np.float32)

    def get_flat_features(self):
        """
        Return a flattened feature vector with statistical summaries.
        Suitable for SVM / tree-based classifiers.

        Returns
        -------
        features : np.ndarray of shape (N,)
            Concatenation of: mean, std, min, max per feature column,
            plus velocity statistics for key joints.
        """
        window = self.get_window()  # (90, 140)

        # ── Statistical features per column ─────────────────
        col_mean = np.mean(window, axis=0)
        col_std = np.std(window, axis=0)
        col_min = np.min(window, axis=0)
        col_max = np.max(window, axis=0)

        # ── Velocity features (first-order diff) ───────────
        diffs = np.diff(window, axis=0)  # (89, 140)
        vel_mean = np.mean(diffs, axis=0)
        vel_std = np.std(diffs, axis=0)

        # ── Hand-to-face proximity stats ────────────────────
        # Pose landmarks are 33×4. Index mapping (×4 offset):
        # Nose = 0, Left wrist = 15, Right wrist = 16
        # Left shoulder = 11, Right shoulder = 12
        nose_x_idx, nose_y_idx = 0 * 4, 0 * 4 + 1
        l_wrist_x, l_wrist_y = 15 * 4, 15 * 4 + 1
        r_wrist_x, r_wrist_y = 16 * 4, 16 * 4 + 1

        l_hand_face_dist = np.sqrt(
            (window[:, l_wrist_x] - window[:, nose_x_idx]) ** 2
            + (window[:, l_wrist_y] - window[:, nose_y_idx]) ** 2
        )
        r_hand_face_dist = np.sqrt(
            (window[:, r_wrist_x] - window[:, nose_x_idx]) ** 2
            + (window[:, r_wrist_y] - window[:, nose_y_idx]) ** 2
        )

        proximity_features = np.array([
            np.mean(l_hand_face_dist), np.min(l_hand_face_dist),
            np.mean(r_hand_face_dist), np.min(r_hand_face_dist),
            np.std(l_hand_face_dist), np.std(r_hand_face_dist),
        ], dtype=np.float32)

        return np.concatenate([
            col_mean, col_std, col_min, col_max,
            vel_mean, vel_std,
            proximity_features,
        ])

    def get_sequence_features(self):
        """
        Return the window as a 3D array for LSTM input.

        Returns
        -------
        sequence : np.ndarray of shape (1, window_size, 140)
        """
        window = self.get_window()
        return window[np.newaxis, ...]

    def reset(self):
        """Clear the buffer."""
        self.buffer.clear()
        self.frame_count = 0
