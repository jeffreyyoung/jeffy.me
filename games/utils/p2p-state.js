import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps";

/**
 * @template ActionMap
 * @template {keyof ActionMap}[Key=keyof ActionMap]
 * @typedef {{
 *    actor: string,
 *    type: Key,
 *    payload: ActionMap[Key]
 * }} ActionObject
 *
 */

/**
 * @template ActionMap
 * @template State
 * @template {{
 *    isHost: boolean,
 *    roomId: string,
 *    actorUsername: string,
 *    actions: {
 *      [K in keyof ActionMap]: (state: State, payload: ActionMap[K], actor: string) => State
 *    },
 *    onStateChange?: (state: State) => any,
 *    onConnectionChange?: (connected: boolean) => any,
 * }} P2pStateArgs
 */
export class P2pState {
  /**
   * @typedef {ActionObject<ActionMap>} Action
   *
   * @typedef {{
   *  action?: ActionObject<ActionMap>,
   *   resultState: State,
   * }} PeerJSPayload
   *
   * @typedef {{
   *    "change:connected": boolean,
   *    "change:state": State,
   * }} EventMap
   */

  /** @type {State} */
  state;

  /** @type {boolean} */
  connected = false;

  /** @type {P2pStateArgs} */
  args;

  /** @type {Partial<Record<keyof EventMap, any[]>>} */
  listeners = {};

  /** @type {import("https://esm.sh/peerjs@1.5.2?bundle-deps").PeerJsConnection[]} */
  connections = [];

  /** @type {Peer} */
  peer;

  /**
    * @param {ActionMap} actionMap
    * @param {State} initialState
    * @param {P2pStateArgs} args
   */
  constructor(actionMap, initialState, args) {
    console.log('setup server', args);
    this.args = args;
    this.state = initialState;
    this.peer = this.setupPeer();
    if (args.onStateChange) {
      this.on("change:state", args.onStateChange);
      this._emit("change:state", this.state);
    }
    if (args.onConnectionChange) {
      this.on("change:connected", args.onConnectionChange);
      this._emit("change:connected", this.connected);
    }
  }

  onNewConnection(conn, { onFail = () => {} } = {}) {
    this.connections.push(conn);
    conn.on("data", (data) => {
      this.onPeerData(data);
    });
    conn.on("close", () => {
      this.connections = this.connections.filter((c) => c !== conn);
      onFail();
    });
    conn.on('error', (err) => {
      console.error('connection error', err);
      this.connections = this.connections.filter((c) => c !== conn);
      onFail();
    })
  }

  /**
   * 
   */
  connectToHost() {
    console.log('connecting to: ', this.args.roomId)
    let conn = this.peer.connect(this.args.roomId);
    conn.on('error', (e) => {
      console.log('connection error', e);
      conn.destroy();
      this.peer.destroy();
      setTimeout(this.setupPeer, 1000);
    });
    conn.on('close', () => {
      console.log('connection closed');
      this.peer.destroy();
      setTimeout(this.setupPeer, 1000);
    });
    conn.on('open', () => {
      console.log('connection open');
      this.connections.push(conn);
      this.connected = true;
      this._emit("change:connected", this.connected);
      conn.on("data", (data) => {
        this.onPeerData(data);
      });
    });
  }

  listenForPeerConnections() {
    this.peer.on("connection", (conn) => {
      this.connections.push(conn);
      conn.send({
        resultState: this.state,
      })
      conn.on("data", (data) => {
        this.onPeerData(data);
      });
      conn.on("close", () => {
        this.connections = this.connections.filter((c) => c !== conn);
      });
      conn.on('error', (err) => {
        console.error('connection error', err);
        this.connections = this.connections.filter((c) => c !== conn);
      });
    });
  }

  /**
   * @returns {import("https://esm.sh/peerjs@1.5.2?bundle-deps").Peer}
   *
   * */
  setupPeer() {
    this.peer = new Peer(this.args.isHost ? this.args.roomId : undefined);

    this.peer.on("open", () => {
      this.connected = true;

      if (this.args.isHost) {
        this._emit("change:connected", this.connected);
      }

      // if we're not the host, we connect to the host
      if (!this.args.isHost) {
        this.connectToHost();
      } else {
        this.listenForPeerConnections();
      }
    });

    this.peer.on("close", (err) => {
      console.error("peer error", err);
      this.connected = false;
      this._emit("change:connected", this.connected);
      this.peer.destroy();
      setTimeout(() => {
        this.setupPeer();
      }, 1000);
    });

    return this.peer;
  }

  /**
   *
   * @param {PeerJSPayload} data
   */
  onPeerData(data) {
    console.log('onPeerData', data);
    if (this.args.isHost && data.action) {
      // we're the host, so we need to process the action
      let nextState = this.produceNextState(data.action);
      if (!nextState) {
        console.error(`action ${String(nextState)} not found`);
        return;
      }
      this.state = nextState;
      this._emit("change:state", this.state);
      this.connections.forEach((conn) => {
        conn.send({
          action: data.action,
          resultState: nextState,
        });
      });
    } else if (!this.args.isHost) {
      // we're a client, so we just set the state
      let { resultState } = data;
      this.state = resultState;
      this._emit("change:state", this.state);
    }
  }

  /**
   * @param {Action} action;
   */
  produceNextState(action) {
    let newState = this.args.actions[action.type]?.(
      { ...this.state },
      action.payload,
      action.actor
    );

    return newState;
  }

  /**
   * 
   * @template {keyof ActionMap} ActionType
   * @param {ActionType} actionType
   * @param {ActionMap[ActionType]} params
   */
  send(actionType, params) {
    /** @type {Action} */
    let action = {
      type: actionType,
      payload: params,
      actor: this.args.actorUsername,
    };
    let resultState = this.produceNextState(action);

    let toSend = {
      action,
      resultState,
    };


    this._sendToConnections(toSend);

    if (this.args.isHost) {
      this.state = resultState;
      this._emit("change:state", this.state);
    }
  }

  /**
   *
   * @param {PeerJSPayload} data
   */
  _sendToConnections(data) {
    this.connections.forEach((conn) => {
      conn.send(data);
    });
  }

  /**
   * @template {keyof EventMap} EventType
   * @param {EventType} event
   * @param {(payload: EventMap[EventType]) => void} cb
   * @returns {() => void}
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
  _emit(event, payload) {
    console.log('emit', event, payload);
    this.listeners[event]?.forEach((cb) => {
      cb(payload);
    });
  }
}
