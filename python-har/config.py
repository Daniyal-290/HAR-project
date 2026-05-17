"""
Central configuration for the HAR pipeline.
"""

# ── Camera ──────────────────────────────────────────────────
CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480

# ── Sliding Window ──────────────────────────────────────────
WINDOW_SIZE = 90        # frames (~3 seconds at 30 FPS)
WINDOW_STRIDE = 15      # classify every 15 frames (~0.5s)

# ── Classification ──────────────────────────────────────────
CLASSIFIER_MODE = "rules"   # "rules" | "svm" | "lstm"
CONFIDENCE_THRESHOLD = 0.5  # minimum confidence to report an activity
MODEL_PATH_SVM = "models/svm_model.pkl"
MODEL_PATH_LSTM = "models/lstm_model.h5"

# ── Activity Labels ─────────────────────────────────────────
ACTIVITY_LABELS = {
    0:  "Typing",
    1:  "Writing on Paper",
    2:  "Talking / In Meeting",
    3:  "Drinking Water",
    4:  "Eating",
    5:  "Micro-Workout",
    6:  "Using Mobile Phone",
    7:  "Stretching",
    8:  "Slouching (Tech Neck)",
    9:  "Reading (Leaning/Squinting)",
    10: "Idle / Neutral",
}

ACTIVITY_CATEGORIES = {
    "Productivity":        [0, 1, 2],
    "Health/Breaks":       [3, 4, 5, 6, 7],
    "Ergonomics/Posture":  [8, 9],
    "Other":               [10],
}

# Reverse lookup: label_id → category
LABEL_TO_CATEGORY = {}
for cat, ids in ACTIVITY_CATEGORIES.items():
    for _id in ids:
        LABEL_TO_CATEGORY[_id] = cat

# ── Rule-Based Thresholds ───────────────────────────────────
SLOUCH_HEAD_ANGLE_THRESHOLD = 18        # degrees forward tilt
DRINKING_WRIST_MOUTH_DIST = 0.35        # normalised distance
EATING_WRIST_MOUTH_DIST = 0.35
PHONE_HAND_EAR_DIST = 0.60
MOUTH_OPEN_THRESHOLD = 0.02             # normalised lip distance
EAR_SQUINT_THRESHOLD = 0.35             # Eye Aspect Ratio
STRETCH_ARM_RAISE_THRESHOLD = 0.15      # wrist above shoulder delta
TYPING_HAND_MOVEMENT_STD = 0.005        # low vertical, high horizontal
WRITING_HEAD_DOWN_ANGLE = 15            # looking down threshold

# ── API Client ──────────────────────────────────────────────
API_BASE_URL = "http://localhost:5000"
API_ACTIVITY_ENDPOINT = "/api/activity-logs"
API_TIMEOUT = 2                         # seconds
API_HEARTBEAT_INTERVAL = 30             # seconds between same-activity sends
USER_ID = "default_user"

# ── Display ─────────────────────────────────────────────────
SHOW_LANDMARKS = True
SHOW_FPS = True
OVERLAY_FONT_SCALE = 0.7
