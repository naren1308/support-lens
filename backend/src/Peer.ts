import { types } from 'mediasoup';

export class Peer {
  public id: string;
  public name: string;
  public role: 'agent' | 'customer';
  public transports: Map<string, types.WebRtcTransport> = new Map();
  public producers: Map<string, types.Producer> = new Map();
  public consumers: Map<string, types.Consumer> = new Map();

  constructor(id: string, name: string, role: 'agent' | 'customer') {
    this.id = id;
    this.name = name;
    this.role = role;
  }

  addTransport(transport: types.WebRtcTransport) {
    this.transports.set(transport.id, transport);
  }

  getTransport(transportId: string) {
    return this.transports.get(transportId);
  }

  addProducer(producer: types.Producer) {
    this.producers.set(producer.id, producer);
  }

  getProducer(producerId: string) {
    return this.producers.get(producerId);
  }

  addConsumer(consumer: types.Consumer) {
    this.consumers.set(consumer.id, consumer);
  }

  getConsumer(consumerId: string) {
    return this.consumers.get(consumerId);
  }

  close() {
    this.transports.forEach(transport => transport.close());
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
  }
}
