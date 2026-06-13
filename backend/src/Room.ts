import { types } from 'mediasoup';
import { Peer } from './Peer';
import { createRoomRouter } from './mediasoup';
import { config } from './config';

export class Room {
  public id: string;
  public router: types.Router | null = null;
  public peers: Map<string, Peer> = new Map();

  constructor(id: string) {
    this.id = id;
  }

  async initialize() {
    this.router = await createRoomRouter();
  }

  addPeer(peer: Peer) {
    this.peers.set(peer.id, peer);
  }

  getPeer(peerId: string) {
    return this.peers.get(peerId);
  }

  removePeer(peerId: string) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
    }
  }

  getRouterRtpCapabilities() {
    return this.router?.rtpCapabilities;
  }

  async createWebRtcTransport(): Promise<types.WebRtcTransport> {
    if (!this.router) throw new Error('Router not initialized');
    
    const { listenInfos, initialAvailableOutgoingBitrate, maxSctpMessageSize } = config.mediasoup.webRtcTransportOptions;
    
    const transport = await this.router.createWebRtcTransport({
      listenInfos,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      enableSctp: true, // For data channels (Chat & AR Annotations)
    });

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed' || dtlsState === 'failed') {
        transport.close();
      }
    });

    return transport;
  }
}
