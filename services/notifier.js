const EventEmitter = require('events');

class Notifier extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitMatchEvent(eventType, payload) {
    const event = { ...payload, type: eventType, at: new Date().toISOString() };
    this.emit(eventType, event);
    this.emit('event:any', event);
  }
}

module.exports = new Notifier();