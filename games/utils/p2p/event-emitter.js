/**
 * @template {Record<string, any[]>} EventMap
 */
export class EventEmitter {
  constructor() {
    /** @type {Partial<Record<keyof EventMap, any[]>>} */
    this.listeners = {};
  }
  /**
   * @template {keyof EventMap} EventType
   * @param {EventType} event
   * @param {(...args: EventMap[EventType]) => void} cb
   */
  on(event, cb) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((x) => x !== cb);
    };
  }

  /**
   * @template {keyof EventMap} EventType
   * @param {EventType} event
   * @param {EventMap[EventType]} args
   */
  emit(event, ...args) {
    console.log("emit", event, ...args);
    this.listeners[event]?.forEach((cb) => {
      cb(...args);
    });
  }
}
