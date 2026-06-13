"use client";

import { useEffect, useRef, useState, use } from 'react';
import { useSocket } from '@/lib/SocketContext';
import { useMediasoup } from '@/lib/useMediasoup';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, PenTool, Trash2 } from 'lucide-react';
import { useCanvas } from '@/lib/useCanvas';

interface ChatMessage {
  senderId: string;
  message: string;
  timestamp: string;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;
  
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Anonymous';
  const role = searchParams.get('role') || 'customer';

  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const { loadDevice, initTransports, produce, consume } = useMediasoup();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  
  const { canvasRef, startDrawing, draw, stopDrawing, clearCanvas } = useCanvas(roomId, role);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('joinRoom', { roomId, name, role }, async (res: any) => {
      const { rtpCapabilities, peers } = res;
      
      const device = await loadDevice(rtpCapabilities);
      await initTransports(device);
      
      setJoined(true);
      startLocalMedia();
    });

    socket.on('newProducer', async ({ producerId }) => {
      // Small delay to ensure our recvTransport is ready
      setTimeout(async () => {
        // Here we need to grab the device from somewhere, ideally it's in state
        // For simplicity, we assume we have a global device instance, or we can consume
        socket.emit('getRouterRtpCapabilities', {}, () => {});
      }, 500);
    });
    
    socket.on('chatMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.off('newProducer');
      socket.off('chatMessage');
    };
  }, [socket, isConnected, roomId, name, role]);

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (videoTrack) await produce(videoTrack);
      if (audioTrack) await produce(audioTrack);
      
    } catch (err) {
      console.error("Failed to get local media", err);
    }
  };
  
  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    
    socket.emit('chatMessage', { message: chatInput });
    setChatInput('');
  };

  const leaveRoom = () => {
    if (localVideoRef.current?.srcObject) {
      const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    router.push('/');
  };

  if (!joined) return <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Joining {roomId}...</div>;

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row text-white overflow-hidden">
      {/* Video Grid */}
      <div className="flex-1 p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div>
            <h2 className="text-xl font-bold">{roomId}</h2>
            <span className={`text-sm px-2 py-1 rounded-full ${role === 'agent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {role.charAt(0).toUpperCase() + role.slice(1)}: {name}
            </span>
          </div>
          <div className="flex gap-2">
            {role === 'agent' && (
              <button onClick={clearCanvas} className="p-3 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors" title="Clear AR Annotations">
                <Trash2 className="w-5 h-5 text-emerald-500" />
              </button>
            )}
            <button onClick={() => setMicEnabled(!micEnabled)} className={`p-3 rounded-full ${micEnabled ? 'bg-neutral-800' : 'bg-red-500/20 text-red-500'}`}>
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setVideoEnabled(!videoEnabled)} className={`p-3 rounded-full ${videoEnabled ? 'bg-neutral-800' : 'bg-red-500/20 text-red-500'}`}>
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={leaveRoom} className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition-colors">
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Local Video */}
          <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            
            {/* If Customer, they see the annotations drawn on THEIR OWN camera feed */}
            {role === 'customer' && (
              <canvas 
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
              />
            )}

            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg backdrop-blur-md z-20">You</div>
          </div>

          {/* Remote Video */}
          <div className="relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            
            {/* If Agent, they draw the annotations on the CUSTOMER'S camera feed (which is remote to them) */}
            {role === 'agent' && (
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute top-0 left-0 w-full h-full z-10 cursor-crosshair"
              />
            )}

            {!remoteVideoRef.current?.srcObject && <span className="text-neutral-500 absolute z-0">Waiting for other participant...</span>}
            {remoteVideoRef.current?.srcObject && <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg backdrop-blur-md z-20">Remote</div>}
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full md:w-80 bg-neutral-900 border-l border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          <h3 className="font-medium">In-Call Chat</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.senderId === socket?.id ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-2 rounded-2xl max-w-[85%] ${m.senderId === socket?.id ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-neutral-800 text-neutral-200 rounded-bl-none'}`}>
                {m.message}
              </div>
            </div>
          ))}
        </div>
        
        <form onSubmit={sendChat} className="p-4 border-t border-neutral-800">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </form>
      </div>
    </div>
  );
}
