import { Server, Socket } from 'socket.io';
import { Room } from './Room';
import { Peer } from './Peer';
import { v4 as uuidv4 } from 'uuid';

const rooms: Map<string, Room> = new Map();

export function setupSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket connected] ID: ${socket.id}`);

    socket.on('joinRoom', async ({ roomId, name, role }, callback) => {
      let room = rooms.get(roomId);
      if (!room) {
        room = new Room(roomId);
        await room.initialize();
        rooms.set(roomId, room);
        console.log(`[Room created] ID: ${roomId}`);
      }

      const peer = new Peer(socket.id, name, role);
      room.addPeer(peer);

      // Save room info to socket for easy access
      (socket as any).roomId = roomId;

      socket.join(roomId);

      callback({
        rtpCapabilities: room.getRouterRtpCapabilities(),
        peers: Array.from(room.peers.values()).map(p => ({
          id: p.id,
          name: p.name,
          role: p.role
        }))
      });

      // Notify others in room
      socket.to(roomId).emit('newPeer', { id: peer.id, name: peer.name, role: peer.role });
    });

    socket.on('createWebRtcTransport', async (_, callback) => {
      const roomId = (socket as any).roomId;
      const room = rooms.get(roomId);
      const peer = room?.getPeer(socket.id);

      if (!room || !peer) return callback({ error: 'Room or Peer not found' });

      try {
        const transport = await room.createWebRtcTransport();
        peer.addTransport(transport);

        callback({
          params: {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
            sctpParameters: transport.sctpParameters,
          }
        });
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('connectWebRtcTransport', async ({ transportId, dtlsParameters }, callback) => {
      const roomId = (socket as any).roomId;
      const room = rooms.get(roomId);
      const peer = room?.getPeer(socket.id);
      
      if (!room || !peer) return callback({ error: 'Room or Peer not found' });

      const transport = peer.getTransport(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      try {
        await transport.connect({ dtlsParameters });
        callback({});
      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
      const roomId = (socket as any).roomId;
      const room = rooms.get(roomId);
      const peer = room?.getPeer(socket.id);
      
      if (!room || !peer) return callback({ error: 'Room or Peer not found' });

      const transport = peer.getTransport(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      try {
        const producer = await transport.produce({ kind, rtpParameters, appData });
        peer.addProducer(producer);

        callback({ id: producer.id });

        // Tell other peers about this new producer
        socket.to(roomId).emit('newProducer', {
          producerId: producer.id,
          peerId: peer.id,
        });

      } catch (err: any) {
        callback({ error: err.message });
      }
    });

    socket.on('consume', async ({ producerId, transportId, rtpCapabilities }, callback) => {
      const roomId = (socket as any).roomId;
      const room = rooms.get(roomId);
      const peer = room?.getPeer(socket.id);
      
      if (!room || !peer || !room.router) return callback({ error: 'Room or Peer not found' });

      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return callback({ error: 'Cannot consume' });
      }

      const transport = peer.getTransport(transportId);
      if (!transport) return callback({ error: 'Transport not found' });

      try {
        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: false, // We can start it paused and resume later if we want
        });

        peer.addConsumer(consumer);

        callback({
          params: {
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
          }
        });
      } catch (err: any) {
        callback({ error: err.message });
      }
    });
    
    socket.on('chatMessage', (data) => {
        const roomId = (socket as any).roomId;
        if (roomId) {
            io.to(roomId).emit('chatMessage', {
                senderId: socket.id,
                message: data.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    socket.on('drawEvent', (data) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit('drawEvent', data);
      }
    });

    socket.on('clearCanvas', (data) => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        socket.to(roomId).emit('clearCanvas', data);
      }
    });

    socket.on('disconnect', () => {
      const roomId = (socket as any).roomId;
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.removePeer(socket.id);
          io.to(roomId).emit('peerLeft', { peerId: socket.id });
          if (room.peers.size === 0) {
            rooms.delete(roomId);
            console.log(`[Room destroyed] ID: ${roomId}`);
          }
        }
      }
    });
  });
}
