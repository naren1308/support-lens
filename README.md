# SupportLens - Real-Time Video Support Platform

## Overview
SupportLens is a next-generation real-time video support platform designed for customer support teams. Unlike typical solutions that bolt on third-party video SDKs, SupportLens uses a highly-scalable **Selective Forwarding Unit (SFU)** architecture powered by **Mediasoup (C++)**. All media is securely routed through our own server, fulfilling the stringent requirement to avoid peer-to-peer or third-party API dependencies.

### The "Wow" Factor: AR Annotations
SupportLens features a live AR Annotation overlay. If an agent needs to guide a customer (e.g., "plug the cable in *here*"), they can draw directly on the video feed. These annotations are broadcasted in real-time to the customer's screen using WebSockets.

## Submission Deliverables

### 1. Locally Runnable Build
The platform consists of two parts: a Next.js Frontend and a Node.js Backend.

**Prerequisites:**
- Node.js 18+
- Python & C++ Build Tools (required by Mediasoup)

**Running the Backend (Terminal 1):**
```bash
cd backend
npm install
npm run dev
```
*The backend SFU server will start on port 3001.*

**Running the Frontend (Terminal 2):**
```bash
cd frontend
npm install
npm run dev
```
*The web UI will start on port 3000.*

### 2. Login Credentials & Role Switching
We built a frictionless role-switching system for the judges. 
1. Navigate to `http://localhost:3000`.
2. On the landing page, you will see a prominent **"I am joining as: Agent / Customer"** toggle. 
3. Select your desired role, enter a Room ID, and join. You can easily open two browser tabs to test both roles simultaneously in the same room.

### 3. Features Implemented
- **Session Management**: Shareable Room IDs, persistent tracking.
- **Audio & Video Calling**: Routed entirely through our Mediasoup SFU.
- **In-Call Chat**: Real-time messaging synced between participants.
- **Role Access**: Agents have exclusive privileges (like clearing AR annotations).
- **Graceful Network Degradation**: (Bonus) Mediasoup handles bad networks by dropping video resolution instead of disconnecting.
- **AR Annotations**: (Bonus) Agents can draw on the screen to guide customers.

### 4. Known Limitations
- The system currently uses in-memory Map structures for Room and Peer tracking. For a production deployment, this state would be moved to Redis to support horizontally scaling multiple SFU nodes.
- Chat history is currently kept in-memory per session. A production upgrade would attach a PostgreSQL database (Prisma) to persist chats permanently.
