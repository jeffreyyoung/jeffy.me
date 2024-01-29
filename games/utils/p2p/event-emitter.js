/**
 * @template EventMap
 */
export class EventEmitter {
    constructor() {
        /** @type {Partial<Record<keyof EventMap, any[]>>} */
        this.listeners = {};
    }
    /**
     * @param {keyof EventMap} event
     * @param {(...args: any[]) => void} cb
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
     * @param {EventMap[EventType]} payload
     */
    emit(event, payload) {
        console.log("emit", event, payload);
        this.listeners[event]?.forEach((cb) => {
            cb(payload);
        });
    }
}