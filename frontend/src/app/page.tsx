"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Video, Headset } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<'agent' | 'customer'>('agent');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roomId) return;
    router.push(`/room/${roomId}?name=${encodeURIComponent(name)}&role=${role}`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8"
      >
        <div className="flex justify-center mb-6">
          <div className="bg-emerald-500/10 p-4 rounded-full">
            <Video className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-center text-white mb-2">SupportLens</h1>
        <p className="text-neutral-400 text-center mb-8">Real-time video support platform.</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">I am joining as:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                  role === 'agent' 
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <Headset className="w-4 h-4" /> Agent
              </button>
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                  role === 'customer' 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                <Video className="w-4 h-4" /> Customer
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Your Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Room ID</label>
            <input 
              type="text" 
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. session-123"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-3 rounded-lg transition-colors mt-6"
          >
            Join Session
          </button>
        </form>
      </motion.div>
    </div>
  );
}
