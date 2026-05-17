"""
Threaded API client for sending activity classifications to the backend.

Features:
  - Debounce: only sends on activity change or heartbeat interval.
  - Background thread: non-blocking to the vision loop.
  - Retry: one automatic retry on failure.
"""

import time
import threading
import queue
from datetime import datetime, timezone

import requests
import config


class APIClient:
    """Send HAR classifications to the Node.js backend."""

    def __init__(self):
        self.url = config.API_BASE_URL + config.API_ACTIVITY_ENDPOINT
        self.timeout = config.API_TIMEOUT
        self.heartbeat_interval = config.API_HEARTBEAT_INTERVAL
        self.user_id = config.USER_ID

        self._last_activity = None
        self._last_send_time = 0

        # Background sender
        self._queue = queue.Queue(maxsize=100)
        self._thread = threading.Thread(target=self._sender_loop, daemon=True)
        self._thread.start()

    def submit(self, label_id, label_name, category, confidence, extra=None):
        """
        Submit a classification result. Applies debounce logic before queuing.

        Parameters
        ----------
        label_id    : int
        label_name  : str
        category    : str
        confidence  : float
        extra       : dict, optional   Extra data like head_angle, etc.
        """
        now = time.time()
        activity_changed = (label_name != self._last_activity)
        heartbeat_due = (now - self._last_send_time) >= self.heartbeat_interval

        if not activity_changed and not heartbeat_due:
            return  # debounce — skip this one

        if confidence < config.CONFIDENCE_THRESHOLD:
            return  # too low confidence

        payload = {
            "user_id": self.user_id,
            "activity": label_name,
            "category": category,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "confidence_score": round(float(confidence), 3),
            "landmarks_summary": extra or {},
        }

        try:
            self._queue.put_nowait(payload)
            self._last_activity = label_name
            self._last_send_time = now
        except queue.Full:
            pass  # drop if queue is full

    def _sender_loop(self):
        """Background thread that drains the queue and POSTs to the API."""
        while True:
            try:
                payload = self._queue.get(timeout=1)
            except queue.Empty:
                continue

            self._send_with_retry(payload)

    def _send_with_retry(self, payload, retries=1):
        """POST payload with one retry."""
        for attempt in range(1 + retries):
            try:
                resp = requests.post(
                    self.url,
                    json=payload,
                    timeout=self.timeout,
                )
                if resp.status_code in (200, 201):
                    return
                else:
                    print(f"[API] Non-OK status {resp.status_code}: {resp.text[:100]}")
            except requests.RequestException as e:
                if attempt < retries:
                    time.sleep(0.5)
                else:
                    print(f"[API] Failed to send after {retries + 1} attempts: {e}")
