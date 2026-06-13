import { types } from 'mediasoup';

export const config = {
  listenIp: '0.0.0.0',
  listenPort: process.env.PORT || 3001,
  mediasoup: {
    // Number of mediasoup workers
    numWorkers: Object.keys(require('os').cpus()).length,
    // mediasoup WorkerSettings
    workerSettings: {
      logLevel: 'warn' as any,
      logTags: [
        'info',
        'ice',
        'dtls',
        'rtp',
        'srtp',
        'rtcp'
      ] as any[],
      rtcMinPort: 40000,
      rtcMaxPort: 49999
    },
    // mediasoup Router options
    routerOptions: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000
          }
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1
          }
        }
      ] as types.RtpCodecCapability[]
    },
    // mediasoup WebRtcTransport options
    webRtcTransportOptions: {
      listenInfos: [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1' // In production, this needs to be the public IP
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedIp: '127.0.0.1'
        }
      ] as types.TransportListenInfo[],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    }
  }
};
