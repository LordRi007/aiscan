# Facial Recognition & Mood Analytics System

> **AI-Powered Facial Recognition, Live Mood Analysis & Smart Face Registration System**

A modern, production-oriented computer vision web application built with **React JSX (Vite)**, **Tailwind CSS**, **FastAPI**, **OpenCV**, and **MediaPipe**.

The system detects and tracks multiple human faces simultaneously in real time, recognizes previously registered individuals, classifies tentative facial expressions (Action Units), and enforces strict biometric verification safeguards.

**Core Guarantee**: The system **NEVER** captures or stores a registration snapshot solely because a face appears. It verifies that an identity is genuinely stable, authentic, unmatched, and approved BEFORE taking any photo.

---

## 1. Key Architectural Features

### 1.1 Face Identity Verification Engine (Most Critical Safeguard)
Prevents duplicate registrations, accidental snapshots, and false identity associations through a 7-step verification workflow:
1. **Detect a Stable Face**: Evaluates face size ($\ge 70\times70$ px), sharpness (Laplacian variance $\ge 50.0$), brightness, and contrast. Rejects blurred, tiny, or poorly lit faces.
2. **Presentation-Attack Detection (PAD)**: Analyzes 2D Fourier high-frequency spectrum, color chrominance dynamic range, and local micro-texture to detect photos and screen replays.
3. **Normalized Embedding Extraction**: Aligns face horizontally via eye landmarks and computes 128D $L_2$-normalized biometric feature vectors.
4. **Calibrated Database Search**: Uses calibrated cosine similarity metrics:
   - **$\ge 0.72$**: Confirmed Existing Person Match $\rightarrow$ Displays recognized name/ID without taking any new snapshot.
   - **$0.58 - 0.72$**: Ambiguous / Uncertain Match $\rightarrow$ Flags for manual review; never auto-registers.
   - **$< 0.58$**: Potentially New Person $\rightarrow$ Subjected to multi-frame consistency requirements.
5. **Multi-Frame Consistency**: Requires at least $6$ consecutive high-quality frames before a face is eligible for new identity registration.
6. **Cross-Person Duplicate Check**: Cross-compares all simultaneously detected faces in the current frame so two people entering together are never registered as duplicates of each other.
7. **Snapshot Capture Only After Approval**: Captures the single sharpest candidate frame, encrypts the embedding with Fernet/AES, generates sequential code (`FACE-000001`), and links to the analytics engine.

### 1.2 Simultaneous Multi-Person Scanning (5-10 Faces)
- Runs multi-object tracking (IoU + centroid proximity) across consecutive video frames.
- Maintains independent tracking IDs without ID swaps when individuals cross paths.
- Asynchronous inference preserves a responsive 30 FPS camera feed.

### 1.3 Live Facial Expression Classification
- Analyzes surface Action Units (AUs): smile curvature, jaw drop, eyebrow furrow, and eye openness.
- Categories: `Happy`, `Neutral`, `Sad`, `Surprised`, `Angry`, `Fearful`, `Disgusted`, `Uncertain`.
- **Scientific Limitation Notice**: Transparently labeled as tentative visual morphology estimates, not internal emotional feelings.

### 1.4 Automatic External Camera Prioritization
- Scans USB device indices and automatically prioritizes external USB webcams (index $\ge 1$) or IP network cameras over laptop built-in webcams (index 0).
- Dual-mode streaming: Supports backend OpenCV capture OR browser HTML5 MediaDevices capture streamed via WebSocket.

### 1.5 Real-Time WebSocket Communication
- `/ws/camera`: Bi-directional stream carrying video frames (Base64 JPEG) and synchronized telemetry.
- Color-coded bounding box overlays:
  - **Green**: Registered Person (`FACE-000001 | Happy | 88%`)
  - **Yellow**: Checking Registration... (Multi-frame verification in progress)
  - **Blue**: New Person Registered (Snapshot captured & stored)
  - **Gray**: Verification Required (Low quality or ambiguous similarity)

---

## 2. Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend**: Python 3.12, FastAPI, Uvicorn, WebSockets
- **Computer Vision & Tracking**: OpenCV (cv2), MediaPipe BlazeFace
- **Database**: SQLite with SQLAlchemy ORM
- **Cryptography**: Fernet AES biometric embedding encryption
- **Testing**: Pytest

---

## 3. Directory Structure

```text
c:\face scan mood and save face\
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── CameraFeed.jsx
│   │   │   ├── FaceBoundingBox.jsx
│   │   │   ├── ExpressionOverlay.jsx
│   │   │   ├── PersonCard.jsx
│   │   │   ├── AnalyticsChart.jsx
│   │   │   └── StatusIndicator.jsx
│   │   ├── pages/
│   │   │   ├── LiveScanner.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── RegisteredPeople.jsx
│   │   │   ├── PersonDetails.jsx
│   │   │   ├── FacialAnalytics.jsx
│   │   │   ├── VerificationHistory.jsx
│   │   │   └── CameraSettings.jsx
│   │   ├── hooks/
│   │   │   ├── useCamera.js
│   │   │   ├── useFaceTracking.js
│   │   │   └── useWebSocket.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── cameraService.js
│   │   │   └── faceService.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── person.py
│   │   │   ├── face_embedding.py
│   │   │   ├── face_session.py
│   │   │   ├── expression_observation.py
│   │   │   ├── camera_device.py
│   │   │   ├── verification_event.py
│   │   │   └── registration_request.py
│   │   ├── routers/
│   │   │   ├── cameras.py
│   │   │   ├── faces.py
│   │   │   ├── expressions.py
│   │   │   └── analytics.py
│   │   ├── services/
│   │   │   ├── camera_manager.py
│   │   │   ├── face_detector.py
│   │   │   ├── face_tracker.py
│   │   │   ├── face_recognition.py
│   │   │   ├── face_verification.py
│   │   │   ├── liveness_detection.py
│   │   │   ├── expression_detector.py
│   │   │   └── registration_manager.py
│   │   └── websocket/
│   │       └── camera_stream.py
│   ├── protected_storage/
│   │   └── faces/
│   ├── tests/
│   │   ├── test_verification.py
│   │   ├── test_recognition.py
│   │   └── test_database.py
│   ├── requirements.txt
│   └── .env.example
│
├── run_backend.bat
├── run_frontend.bat
├── start_all.bat
└── README.md
```

---

## 4. Setup & Running Instructions on Windows 11

### Prerequisites
- Python 3.12 (64-bit)
- Node.js (v18+ or v20+) & npm
- External USB Webcam or IP Camera (laptop built-in webcam supported as manual fallback)

### Quick 1-Click Launch
Double-click `start_all.bat` in the project root:
```bat
start_all.bat
```
This automatically boots the FastAPI backend on `http://localhost:8000`, the Vite React frontend on `http://localhost:5173`, and opens the Live Scanner in your default web browser.

---

### Manual Launch

#### Step 1: Start the Backend
Open a terminal in the project root:
```powershell
$env:PYTHONPATH="backend"
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The FastAPI interactive documentation is available at `http://localhost:8000/docs`.

#### Step 2: Start the Frontend
Open a second terminal in `frontend/`:
```powershell
cd frontend
npm.cmd run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Running Automated Tests

Run the complete test suite:
```powershell
$env:PYTHONPATH="backend"
.\venv\Scripts\python.exe -m pytest backend/tests -v
```
All 6 unit and integration test suites will execute:
- `test_face_quality_assessment`: Image sharpness, dimensions, contrast, head angle.
- `test_liveness_detection`: Presentation-attack detection and Fourier frequency testing.
- `test_multi_face_tracker`: Multi-target ID stability across movement.
- `test_embedding_extraction_and_normalization`: $L_2$ unit sphere projection.
- `test_similarity_calibration`: Cosine similarity calibration and thresholding.
- `test_registration_and_gdpr_deletion`: Atomic database transaction, Fernet encryption, and GDPR permanent purging.

---

## 6. Privacy & GDPR Compliance

1. **Biometric Encryption**: Biometric face embeddings are encrypted on disk using Fernet/AES.
2. **Consent Tracking**: Each individual record contains documented biometric consent status (`consented`, `exempt`, `revoked`).
3. **Right to Erasure (GDPR Deletion)**: Authorized administrators or users can trigger permanent biometric purging from the Registered People directory or API endpoint `DELETE /api/faces/{id}`. This permanently deletes the photo, encrypted embedding vector, recognition sessions, and expression logs.
4. **No Raw Video Storage**: The application streams live processed frames but does not record or store raw surveillance video feeds.
