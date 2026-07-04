# MediCore AI — Professional Hospital Management System

A production-grade, AI-powered Hospital Management System (HMS) built with **FastAPI**, **React (Vite)**, and **MongoDB Atlas**. 

---

## 🛠 Prerequisites
Before starting, ensure you have the following installed:
*   **Git** (for version control)
*   **Docker & Docker Compose** (Highly Recommended)
*   **Python 3.11+** (for manual backend setup)
*   **Node.js 20+** (for manual frontend setup)

---

## 🚀 Setup Option 1: Docker (Fastest)
This method sets up the entire stack (Frontend, Backend, and Database) with one command.

1.  **Clone the project:**
    ```bash
    git clone <your-repo-url>
    cd Hospital-Management-main
    ```
2.  **Configure Environment:**
    *   Create `backend/.env` (use the template in the backend section below).
3.  **Launch:**
    ```bash
    docker compose up -d --build
    ```
4.  **Access:**
    *   Frontend: `http://localhost`
    *   Backend API: `http://localhost:8000/docs`

---

## 💻 Setup Option 2: Manual Development
Use this if you want to edit code and see changes instantly without rebuilding containers.

### 1. Backend Setup (FastAPI)
1.  Navigate to folder: `cd backend`
2.  Create virtual environment: 
    ```bash
    python -m venv venv
    source venv/bin/scripts/activate  # Windows: venv\Scripts\activate
    ```
3.  Install dependencies: `pip install -r requirements.txt`
4.  Create `.env` file:
    ```env
    MONGO_URL=mongodb://localhost:27017  # Or your Atlas URL
    DB_NAME=medicore
    SECRET_KEY=any_random_string
    TOKEN_EXPIRE_MINUTES=1440
    ```
5.  Run server: `uvicorn server:app --reload --port 8000`

### 2. Frontend Setup (React + Vite)
1.  Navigate to folder: `cd frontend`
2.  Install dependencies: `npm install`
3.  Create `.env` file:
    ```env
    REACT_APP_BACKEND_URL=http://localhost:8000
    ```
4.  Run development server: `npm run dev`
5.  Access: `http://localhost:5173`

---

## 🗄️ Database & Seeding
To see the "Professional" version of the app with data:

1.  **Start MongoDB:** Ensure local MongoDB is running OR provide an Atlas URL in `backend/.env`.
2.  **Run Seeding Script:**
    ```bash
    cd backend
    python seed.py
    ```
    *This creates demo Doctors, Patients, Appointments, and AI Scans.*

---

## ✨ Signature Features

### 🧠 Clinical Intelligence
*   **AI Radiology Vision**: Real-time disease detection in X-rays/MRIs with visual "hotspot" overlays.
*   **Voice-to-Note Dictation**: Hands-free EHR entries using integrated speech-to-text.
*   **Drug-Allergy Safety Checker**: Automated backend logic that blocks prescriptions if they conflict with documented allergies.

### 🏥 Hospital Operations
*   **Interactive Ward Map**: A visual grid of hospital beds (Available, Occupied, Cleaning).
*   **Real-Time Chat Board**: Instant WebSocket-based communication between Staff and Patients.
*   **Staff Roster**: Admin tools to manage shifts with overlap detection.

---

## 🌐 AWS Deployment (Production)
1.  **EC2:** Launch an Ubuntu instance with Port 80, 8000, and 22 open.
2.  **Clone & Build:** Follow the Docker instructions above on the server.
3.  **Atlas:** Whitelist the EC2 IP in your MongoDB Atlas "Network Access" settings.

---
*Developed for clinical efficiency and modern healthcare standards.*
