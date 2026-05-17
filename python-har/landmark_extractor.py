"""
Landmark extraction using MediaPipe Pose and Face Mesh.

Extracts 33 body landmarks (x, y, z, visibility) normalised to mid-hip,
plus 8 derived facial ratios from Face Mesh.
"""

import math
import numpy as np
import mediapipe as mp


class LandmarkExtractor:
    """Extracts and normalises skeletal + facial landmarks per frame."""

    # ── Face Mesh landmark indices ──────────────────────────
    # Mouth
    UPPER_LIP = 13
    LOWER_LIP = 14
    LEFT_LIP_CORNER = 61
    RIGHT_LIP_CORNER = 291

    # Left eye
    LEFT_EYE_TOP = 159
    LEFT_EYE_BOTTOM = 145
    LEFT_EYE_INNER = 133
    LEFT_EYE_OUTER = 33

    # Right eye
    RIGHT_EYE_TOP = 386
    RIGHT_EYE_BOTTOM = 374
    RIGHT_EYE_INNER = 362
    RIGHT_EYE_OUTER = 263

    # Head orientation helpers
    NOSE_TIP = 1
    FOREHEAD = 10
    CHIN = 152
    LEFT_CHEEK = 234
    RIGHT_CHEEK = 454

    def __init__(self):
        # MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # MediaPipe Face Mesh
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

        # Drawing utilities
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

    # ── Public API ──────────────────────────────────────────

    def extract(self, frame_rgb):
        """
        Process a single RGB frame and return a feature vector.

        Returns
        -------
        features : np.ndarray of shape (140,) or None
            33*4 pose features + 8 facial ratios = 140 values.
            None if no pose is detected.
        pose_results : mediapipe pose results (for drawing)
        face_results : mediapipe face mesh results (for drawing)
        """
        pose_results = self.pose.process(frame_rgb)
        face_results = self.face_mesh.process(frame_rgb)

        if pose_results.pose_landmarks is None:
            return None, pose_results, face_results

        # ── Pose landmarks (normalised to mid-hip) ──────────
        pose_features = self._extract_pose(pose_results.pose_landmarks.landmark)

        # ── Face ratios ─────────────────────────────────────
        face_features = self._extract_face(face_results)

        features = np.concatenate([pose_features, face_features])
        return features, pose_results, face_results

    def draw_landmarks(self, frame, pose_results, face_results):
        """Draw pose skeleton and face mesh on the BGR frame."""
        if pose_results.pose_landmarks:
            self.mp_drawing.draw_landmarks(
                frame,
                pose_results.pose_landmarks,
                self.mp_pose.POSE_CONNECTIONS,
                landmark_drawing_spec=self.mp_drawing_styles.get_default_pose_landmarks_style(),
            )
        return frame

    def release(self):
        """Release MediaPipe resources."""
        self.pose.close()
        self.face_mesh.close()

    # ── Private helpers ─────────────────────────────────────

    def _extract_pose(self, landmarks):
        """Extract 33×4 pose features normalised to mid-hip."""
        # Mid-hip centre (landmarks 23 = left hip, 24 = right hip)
        mid_hip_x = (landmarks[23].x + landmarks[24].x) / 2
        mid_hip_y = (landmarks[23].y + landmarks[24].y) / 2
        mid_hip_z = (landmarks[23].z + landmarks[24].z) / 2

        features = []
        for lm in landmarks:
            features.extend([
                lm.x - mid_hip_x,
                lm.y - mid_hip_y,
                lm.z - mid_hip_z,
                lm.visibility,
            ])
        return np.array(features, dtype=np.float32)

    def _extract_face(self, face_results):
        """Extract 8 derived facial ratios from Face Mesh."""
        defaults = np.zeros(8, dtype=np.float32)

        if face_results.multi_face_landmarks is None:
            return defaults

        face_lm = face_results.multi_face_landmarks[0].landmark

        try:
            # 1. Mouth openness (vertical distance)
            mouth_open = self._dist(face_lm[self.UPPER_LIP], face_lm[self.LOWER_LIP])

            # 2. Mouth width
            mouth_width = self._dist(face_lm[self.LEFT_LIP_CORNER], face_lm[self.RIGHT_LIP_CORNER])

            # 3. Mouth aspect ratio
            mouth_ratio = mouth_open / max(mouth_width, 1e-6)

            # 4. Left Eye Aspect Ratio (EAR)
            left_ear = self._eye_aspect_ratio(
                face_lm[self.LEFT_EYE_TOP], face_lm[self.LEFT_EYE_BOTTOM],
                face_lm[self.LEFT_EYE_INNER], face_lm[self.LEFT_EYE_OUTER],
            )

            # 5. Right Eye Aspect Ratio
            right_ear = self._eye_aspect_ratio(
                face_lm[self.RIGHT_EYE_TOP], face_lm[self.RIGHT_EYE_BOTTOM],
                face_lm[self.RIGHT_EYE_INNER], face_lm[self.RIGHT_EYE_OUTER],
            )

            # 6. Average EAR
            avg_ear = (left_ear + right_ear) / 2

            # 7. Head pitch (forward tilt) — angle between forehead→nose vs vertical
            head_pitch = self._head_pitch(
                face_lm[self.FOREHEAD], face_lm[self.NOSE_TIP], face_lm[self.CHIN]
            )

            # 8. Head yaw (left/right turn)
            head_yaw = self._head_yaw(
                face_lm[self.NOSE_TIP], face_lm[self.LEFT_CHEEK], face_lm[self.RIGHT_CHEEK]
            )

            return np.array([
                mouth_open, mouth_width, mouth_ratio,
                left_ear, right_ear, avg_ear,
                head_pitch, head_yaw,
            ], dtype=np.float32)

        except (IndexError, ZeroDivisionError):
            return defaults

    @staticmethod
    def _dist(a, b):
        """Euclidean distance between two landmarks."""
        return math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)

    @staticmethod
    def _eye_aspect_ratio(top, bottom, inner, outer):
        """EAR = vertical / horizontal distance."""
        vertical = math.sqrt((top.x - bottom.x) ** 2 + (top.y - bottom.y) ** 2)
        horizontal = math.sqrt((inner.x - outer.x) ** 2 + (inner.y - outer.y) ** 2)
        return vertical / max(horizontal, 1e-6)

    @staticmethod
    def _head_pitch(forehead, nose, chin):
        """Estimate forward head tilt in degrees."""
        # Vector from chin to forehead
        vec_y = np.array([forehead.x - chin.x, forehead.y - chin.y, forehead.z - chin.z])
        # Vertical reference
        vertical = np.array([0, -1, 0])
        cos_angle = np.dot(vec_y, vertical) / (np.linalg.norm(vec_y) * np.linalg.norm(vertical) + 1e-6)
        cos_angle = np.clip(cos_angle, -1.0, 1.0)
        return math.degrees(math.acos(cos_angle))

    @staticmethod
    def _head_yaw(nose, left_cheek, right_cheek):
        """Estimate head yaw (left/right turn) — ratio of nose-to-cheek distances."""
        left_dist = math.sqrt((nose.x - left_cheek.x) ** 2 + (nose.y - left_cheek.y) ** 2)
        right_dist = math.sqrt((nose.x - right_cheek.x) ** 2 + (nose.y - right_cheek.y) ** 2)
        return (left_dist - right_dist) / max(left_dist + right_dist, 1e-6)
