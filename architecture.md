# SupportLens Architecture

This document outlines the high-level architecture of the SupportLens real-time video platform. 
To convert this to an image or PDF for your submission, you can view this file in any markdown viewer that supports Mermaid (like GitHub), or paste the code block below into [Mermaid Live Editor](https://mermaid.live).

## System Architecture Diagram

```mermaid
graph TD
    subgraph Frontend "Next.js Web Client (Port 3000)"
        UI[User Interface - React]
        WC[WebRTC Client Device]
        SC[Socket.io Client]
        AR[AR Canvas Overlay]
        
        UI --> WC
        UI --> SC
        UI --> AR
    end

    subgraph Backend "Node.js Server (Port 3001)"
        API[Express HTTP Server]
        SIG[Socket.io Signaling Server]
        
        subgraph SFU "Mediasoup C++ Engine"
            W[Worker Process]
            R[Router]
            T[WebRTC Transports]
            P[Producers - Receive Media]
            C[Consumers - Send Media]
            
            W --> R
            R --> T
            T --> P
            T --> C
        end
        
        API --> SIG
        SIG --> SFU
    end

    %% Connections
    WC <-->|RTP/RTCP Media Streams| T
    SC <-->|WebSocket Signaling & Chat| SIG
    AR <-->|Draw Coordinates| SIG
    
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:white;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:white;
    classDef engine fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:white;

    class UI,WC,SC,AR frontend;
    class API,SIG backend;
    class W,R,T,P,C engine;
```

### Components Breakdown:
1. **Frontend**: Built with Next.js and TailwindCSS. Uses the `mediasoup-client` to ingest media devices and render video tracks on HTML5 Video elements. The AR Canvas sits directly on top of the remote video feed to capture agent touch/mouse events.
2. **Backend Signaling**: Socket.io handles the handshake. When an agent and customer join the same room, Socket.io coordinates the exchange of RTP Capabilities and WebRTC ICE Candidates.
3. **Mediasoup SFU**: The heavy lifting of routing video streams is handled by Mediasoup's C++ workers. This completely avoids Peer-to-Peer constraints, allowing the platform to dynamically scale bandwidth (SVC) and securely route media through your own infrastructure.
