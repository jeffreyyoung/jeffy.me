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

const roomPrefix = "55555jeffy-me";

/**
 * @template ActionMap
 * @template {{ version: string }} State
 * @template {{
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
   *   action?: ActionObject<ActionMap> & {
   *       resultStateVersion: string,
   *       appliedOnStateVersion: string,
   *   },
   *   resultState: State,
   * }} PeerJSPayload
   *
   * @typedef {{
   *    "change:connected": boolean,
   *    "change:state": State,
   * }} EventMap
   */

  /** @type {string} */
  userId;

  /** @type {string} */
  roomId;

  /** @type {boolean} */
  isHost;

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
    console.log("setup server", args);
    this.state = initialState;
    this.args = args;
    if (args.onConnectionChange) {
        this.on("change:connected", args.onConnectionChange);
    }
    if (args.onStateChange) {
      this.on("change:state", args.onStateChange);
      this.setState(initialState);
    }
  }

  /**
   * @param {(connection: boolean) => void} cb 
   */
  onConnectionChange(cb) {
    this.on("change:connected", cb);
  }

  /**
   * 
   * @param {(state: State) => void} cb 
   */
  onStateChange(cb) {
    this.on("change:state", cb);
  }

  /**
   * @param {{ userId: string, roomId: string, isHost: boolean }} args
   * @returns {boolean}
   * */
  connect({ userId, roomId, isHost }) {
    this.userId = userId;
    this.roomId = roomId;
    this.isHost = isHost;
    if (this.peer) {
      return false;
    }
    this.peer = this.setupPeer();
    return true;
  }

  /**
   * @param {boolean} val
   * */
  setConnected(val) {
    this.connected = val;
    this._emit("change:connected", this.connected);
  }

  /**
   * @param {State} val
   * */
  setState(val) {
    this.state = val;
    this._emit("change:state", this.state);
  }

  /**
   *
   */
  connectToHost() {
    let conn = this.peer.connect(roomPrefix + this.roomId);
    conn.on("error", (e) => {
      console.log("host connection error", e);
      this.connections = this.connections.filter((c) => c !== conn);
      this.setConnected(false);
      setTimeout(() => this.connectToHost(), 1000);
    });
    conn.on("close", () => {
      console.log("host connection closed");
      this.connections = this.connections.filter((c) => c !== conn);
      this.setConnected(false);
      setTimeout(() => this.connectToHost(), 1000);
    });
    conn.on("open", () => {
      console.log("host connection open");
      this.connections.push(conn);
      this.setConnected(true);
      conn.on("data", (data) => {
        // @ts-ignore
        this.onPeerData(data);
      });
    });
  }

  listenForPeerConnections() {
    this.peer.on("connection", (conn) => {
      this.connections.push(conn);
      conn.on("open", () => {
        console.log("peer connection open");
        conn.send(
          /** @type {PeerJSPayload} */
          ({
            resultState: this.state,
          })
        );
      });

      conn.on("data", (data) => {
        // @ts-ignore
        this.onPeerData(data);
      });
      conn.on("close", () => {
        this.connections = this.connections.filter((c) => c !== conn);
      });
      conn.on("error", (err) => {
        console.error("connection error", err);
        this.connections = this.connections.filter((c) => c !== conn);
      });
    });
  }

  /**
   * @returns {import("https://esm.sh/peerjs@1.5.2?bundle-deps").Peer}
   *
   * */
  setupPeer() {
    this.peer = new Peer(
      this.isHost ? roomPrefix + this.roomId : undefined,
      { debug: 1 }
    );

    this.peer.on("open", () => {
      if (this.isHost) {
        this.setConnected(true);
      }

      // if we're not the host, we connect to the host
      if (!this.isHost) {
        this.connectToHost();
      } else {
        this.listenForPeerConnections();
      }
    });
    this.peer.on("error", (e) => {
      console.error("peer error", e);
    });
    // @ts-ignore err
    this.peer.on("close", (err) => {
      console.error("peer closed", err);
      this.setConnected(false);
      this.peer.destroy();
      setTimeout(() => {
        this.setupPeer();
      }, 5000);
    });

    return this.peer;
  }

  /**
   *
   * @param {PeerJSPayload} data
   */
  onPeerData(data) {
    console.log("on peer data", data);
    const { action, resultState } = data;

    // check if we already have this state
    if (resultState.version === this.state.version) {
      return;
    }
    if (!action) {
      // just accept the state
      this.setState(resultState);
      return;
    }

    if (action && action.appliedOnStateVersion === this.state.version) {
      this.state = this.produceNextState(action, action.resultStateVersion);
      this.setState(this.state);
      if (this.isHost) {
        // forward this to connections
        this._sendToConnections({
          action,
          resultState,
        });
      }
      return;
    }

    if (action && action.appliedOnStateVersion !== this.state.version) {
      if (!this.isHost) {
        // just accept the state
        this.setState(resultState);
      } else {
        // apply the action
        let prevVersion = this.state.version;
        this.state = this.produceNextState(action);
        this.setState(this.state);
        this._sendToConnections({
          action: {
            ...action,
            resultStateVersion: this.state.version,
            appliedOnStateVersion: prevVersion,
          },
          resultState: this.state,
        });
      }
    }
  }

  /**
   * @param {Action} action;
   */
  produceNextState(action, version = Math.floor(Math.random() * 100000) + "") {
    let newState = this.args.actions[action.type]?.(
      this.state,
      action.payload,
      action.actor
    );
    newState.version = version;
    return newState;
  }

  /**
   *
   * @template {keyof ActionMap} ActionType
   * @param {ActionType} actionType
   * @param {ActionMap[ActionType]} params
   */
  send(actionType, params) {
    console.log("send action", actionType, params);
    /** @type {Action} */
    let action = {
      type: actionType,
      payload: params,
      actor: this.userId,
    };
    let currentStateVersion = this.state.version;
    this.state = this.produceNextState(action);

    this._sendToConnections({
      action: {
        ...action,
        resultStateVersion: this.state.version,
        appliedOnStateVersion: currentStateVersion,
      },
      resultState: this.state,
    });

    this.setState(this.state);
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
    console.log("emit", event, payload);
    this.listeners[event]?.forEach((cb) => {
      cb(payload);
    });
  }
}
