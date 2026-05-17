"""
The Invisible Ergonomic Controller — Main Entry Point

Orchestrates: Webcam → Landmark Extraction → Feature Buffering →
              Classification → API Dispatch → OpenCV Display Overlay
"""

import sys
import time
import argparse

import cv2
import numpy as np

import config
from landmark_extractor import LandmarkExtractor
from feature_engine import FeatureEngine
from classifier import ActivityClassifier
from api_client import APIClient


def parse_args():
    parser = argparse.ArgumentParser(description="Ergonomic HAR Controller")
    parser.add_argument("--camera", type=int, default=config.CAMERA_INDEX,
                        help="Webcam device index (default: 0)")
    parser.add_argument("--mode", choices=["rules", "svm", "lstm"],
                        default=config.CLASSIFIER_MODE,
                        help="Classifier mode (default: rules)")
    parser.add_argument("--no-camera", action="store_true",
                        help="Run without camera (smoke test)")
    parser.add_argument("--no-api", action="store_true",
                        help="Disable API posting")
    return parser.parse_args()


def draw_overlay(frame, activity, category, confidence, fps):
    """Draw the HUD overlay on the frame."""
    h, w = frame.shape[:2]

    # Semi-transparent background bar at top
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 80), (20, 20, 20), -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

    # Activity label
    color_map = {
        "Productivity": (100, 220, 100),       # green
        "Health/Breaks": (220, 180, 50),        # teal
        "Ergonomics/Posture": (50, 100, 255),   # orange-red (BGR)
        "Other": (180, 180, 180),               # gray
    }
    color = color_map.get(category, (255, 255, 255))

    cv2.putText(frame, f"{activity}", (15, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2, cv2.LINE_AA)
    cv2.putText(frame, f"[{category}]  Conf: {confidence:.0%}", (15, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1, cv2.LINE_AA)

    # FPS
    if config.SHOW_FPS:
        cv2.putText(frame, f"FPS: {fps:.0f}", (w - 110, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (100, 255, 100), 1, cv2.LINE_AA)

    # Ergonomic warning flash
    if category == "Ergonomics/Posture":
        border_color = (0, 0, 255) if int(time.time() * 3) % 2 == 0 else (0, 100, 255)
        cv2.rectangle(frame, (0, 0), (w - 1, h - 1), border_color, 4)
        cv2.putText(frame, "! POSTURE ALERT !", (w // 2 - 120, h - 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, border_color, 2, cv2.LINE_AA)

    return frame


def main():
    args = parse_args()

    print("=" * 55)
    print("  The Invisible Ergonomic Controller")
    print(f"  Mode: {args.mode} | Camera: {args.camera}")
    print("=" * 55)

    # ── Initialise components ───────────────────────────────
    extractor = LandmarkExtractor()
    engine = FeatureEngine()
    classifier = ActivityClassifier(mode=args.mode)
    api_client = APIClient() if not args.no_api else None

    # ── Current state ───────────────────────────────────────
    current_activity = "Initialising..."
    current_category = "Other"
    current_confidence = 0.0
    fps = 0.0
    prev_time = time.time()

    # ── Smoke test mode (no camera) ─────────────────────────
    if args.no_camera:
        print("[Smoke Test] Running without camera...")
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        dummy_rgb = cv2.cvtColor(dummy_frame, cv2.COLOR_BGR2RGB)
        features, _, _ = extractor.extract(dummy_rgb)
        if features is None:
            print("[Smoke Test] No pose detected (expected with blank frame).")
            # Push zeros to test the pipeline
            for _ in range(config.WINDOW_SIZE):
                engine.push(np.zeros(140, dtype=np.float32))
            label_id, name, cat, conf = classifier.predict(engine)
            print(f"[Smoke Test] Prediction: {name} ({cat}) @ {conf:.0%}")
        print("[Smoke Test] Pipeline OK.")
        extractor.release()
        return

    # ── Open webcam ─────────────────────────────────────────
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open camera {args.camera}")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, config.FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

    print("[INFO] Press 'q' or ESC to quit.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[WARN] Failed to read frame.")
                break

            # Flip for mirror effect
            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

            # ── Extract landmarks ───────────────────────────
            features, pose_res, face_res = extractor.extract(rgb)

            # ── Draw skeleton ───────────────────────────────
            if config.SHOW_LANDMARKS:
                frame = extractor.draw_landmarks(frame, pose_res, face_res)

            # ── Buffer & classify ───────────────────────────
            if features is not None:
                ready = engine.push(features)
                if ready:
                    label_id, name, cat, conf = classifier.predict(engine)
                    current_activity = name
                    current_category = cat
                    current_confidence = conf

                    # ── Send to API ─────────────────────────
                    if api_client:
                        extra = {
                            "head_pitch": float(features[132 + 6]),
                            "avg_ear": float(features[132 + 5]),
                        }
                        api_client.submit(label_id, name, cat, conf, extra)

            # ── FPS calculation ─────────────────────────────
            now = time.time()
            fps = 1.0 / max(now - prev_time, 1e-6)
            prev_time = now

            # ── Draw overlay ────────────────────────────────
            frame = draw_overlay(frame, current_activity, current_category,
                                 current_confidence, fps)

            cv2.imshow("Ergonomic Controller", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                break

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user.")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        extractor.release()
        print("[INFO] Shutdown complete.")


if __name__ == "__main__":
    main()
