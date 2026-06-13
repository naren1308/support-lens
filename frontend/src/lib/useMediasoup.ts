import { useState, useCallback, useRef } from 'react';
import { Device } from 'mediasoup-client';
import { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters';
import { Transport } from 'mediasoup-client/lib/Transport';
import { useSocket } from './SocketContext';

export const useMediasoup = () => {
  const { socket, isConnected } = useSocket();
  const [device, setDevice] = useState<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);

  const loadDevice = useCallback(async (routerRtpCapabilities: RtpCapabilities) => {
    try {
      const newDevice = new Device();
      await newDevice.load({ routerRtpCapabilities });
      setDevice(newDevice);
      return newDevice;
    } catch (error) {
      console.error('Failed to load mediasoup device', error);
      throw error;
    }
  }, []);

  const initTransports = useCallback(async (loadedDevice: Device) => {
    if (!socket) return;

    // 1. Create Send Transport
    socket.emit('createWebRtcTransport', {}, async ({ params, error }: any) => {
      if (error) return console.error(error);

      sendTransportRef.current = loadedDevice.createSendTransport(params);

      sendTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectWebRtcTransport', {
          transportId: sendTransportRef.current!.id,
          dtlsParameters
        }, (res: any) => {
          if (res?.error) errback(res.error);
          else callback();
        });
      });

      sendTransportRef.current.on('produce', async (parameters, callback, errback) => {
        socket.emit('produce', {
          transportId: sendTransportRef.current!.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData
        }, (res: any) => {
          if (res?.error) errback(res.error);
          else callback({ id: res.id });
        });
      });
    });

    // 2. Create Receive Transport
    socket.emit('createWebRtcTransport', {}, async ({ params, error }: any) => {
      if (error) return console.error(error);

      recvTransportRef.current = loadedDevice.createRecvTransport(params);

      recvTransportRef.current.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socket.emit('connectWebRtcTransport', {
          transportId: recvTransportRef.current!.id,
          dtlsParameters
        }, (res: any) => {
          if (res?.error) errback(res.error);
          else callback();
        });
      });
    });

  }, [socket]);

  const produce = useCallback(async (track: MediaStreamTrack) => {
    if (!sendTransportRef.current) return;
    return await sendTransportRef.current.produce({ track });
  }, []);

  const consume = useCallback(async (producerId: string, loadedDevice: Device) => {
    if (!socket || !recvTransportRef.current) return;

    return new Promise<MediaStreamTrack>((resolve, reject) => {
      socket.emit('consume', {
        producerId,
        transportId: recvTransportRef.current!.id,
        rtpCapabilities: loadedDevice.rtpCapabilities
      }, async ({ params, error }: any) => {
        if (error) return reject(error);

        const consumer = await recvTransportRef.current!.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        });

        resolve(consumer.track);
      });
    });
  }, [socket]);

  return {
    device,
    loadDevice,
    initTransports,
    produce,
    consume
  };
};
