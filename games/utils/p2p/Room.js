import { StateLogic } from "./game-logic-server.js";
import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps";
import { EventEmitter } from "./event-emitter.js";

/**
 * @typedef {import("./Room-types.js").RoomState} RoomState
 * @typedef {import("./Room-types.js").RoomActionMap} RoomActionMap
 * @typedef {import("./Room-types.js").PeerMessage<RoomActionMap, RoomState>} PeerMessage;
 */
export class Room {
  /** @type {Peer} */
  peer = null;

  roomId = "";
  connected = false;
  userId = "";
  isHost = false;

  /** @type {EventEmitter<{ "change:connection": boolean }>} */
  emitter = new EventEmitter();

  /** @type {StateLogic<RoomActionMap, RoomState>, {}} */
  roomState;

  constructor() {
    /** @type {RoomState} */
    const initialState = {
      version: "",
      game: "",
      users: [],
    };

    this.roomState = new StateLogic(
      /** @type {RoomActionMap} */
      // @ts-ignore
      ({}),
      initialState,
      {},
      {
        actions: {
          userLeave: (state, { user }, actor) => {
            let userIndex = state.users.findIndex((u) => u.id === user.id);
            if (userIndex === -1) {
              return state;
            }
            state.users.splice(userIndex, 1);
            return state;
          },
          userJoin: (state, { user }, actor) => {
            if (state.users.find((u) => u.id === user.id)) {
              return state;
            }
            state.users.push(user);
            return state;
          },
          updateUser: (state, { user }, actor) => {
            let userIndex = state.users.findIndex((u) => u.id === user.id);
            if (userIndex === -1) {
              return state;
            }
            state.users[userIndex] = user;
            return state;
          },
          setGame: (state, { game }, actor) => {
            state.game = game;
            return state;
          },
        },
      }
    );


    window.addEventListener("message", (event) => {
        /** @type {import('./Room-types.js').IFrameMessageBase<any, any>} */
        let message = event.data;

        if (message?.kind !== 'iframe-message') {
            console.error("invalid iframe message", message);
            return;
        }

        if (message?.gameName !== this.roomState.state.game) {
            console.error("invalid game name", message);
            return;
        }

        this.handleIframeMessage(message)
    });
  }

  /** @param {boolean} connected */
  setConnected(connected) {
    this.connected = connected;
    this.emitter.emit("change:connection", this.connected);
  }

  /** @param {(connected: boolean) => void} cb */
  onConnectionChange(cb) {
    return this.emitter.on("change:connection", cb);
  }

  /** @param {(state: RoomState) => void} cb */
  onStateChange(cb) {
    return this.roomState.onStateChange(cb);
  }

  connect(isHost, userId, roomId) {
    this.isHost = isHost;
    this.userId = userId;
    this.roomId = roomId;
    if (this.peer) {
      throw new Error("Already connected");
    }
    this.peer = this.setupPeer();
    return true;
  }

  setupPeerTimeoutMs = 1000;

  setupPeer() {
    this.peer = new Peer(this.isHost ? this.roomId : undefined, { debug: 1 });

    this.peer.on("open", (id) => {
      if (this.isHost) {
        this.setConnected(true);
      }

      if (!this.isHost) {
        this.connectToHost();
      } else {
        this.listenForPeerConnections();
      }
    });

    this.peer.on("error", (e) => {
      console.error("peer error", e);
    });

    this.peer.on("close", () => {
      console.error("peer close");
      this.peer.destroy();
      setTimeout(() => this.setupPeer(), this.setupPeerTimeoutMs);
      this.setupPeerTimeoutMs = Math.max(this.setupPeerTimeoutMs * 2, 5000);
    });

    return this.peer;
  }

  listenForPeerConnections() {
    this.peer.on("connection", (conn) => {
      this.connections.push(conn);
      conn.on("open", () => {
        console.log("peer connection open");
        conn.send(
          /** @type {PeerMessage} */
          ({
            resultState: this.roomState.state,
          })
        );
      });

      conn.on("data", (data) => {
        // @ts-ignore
        this.onPeerMessage(data);
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

  /** @type {import("https://esm.sh/peerjs@1.5.2?bundle-deps").PeerJsConnection[]} */
  connections = [];

  connectToHost() {
    let conn = this.peer.connect(this.roomId);
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
        this.onPeerMessage(data);
      });
    });
  }


  /**
   * Sends a message into the iframe and decorates it with extra information
   * @param {import('./Room-types.js').IFrameMessageBase<any, any>} messageBase 
   */
  sendToIfame(messageBase) {

    /** @type {import('./Room-types.js').IFrameMessageIn<any, any>} */
    let message = {
        ...messageBase,
        room: this.roomState.state,
        viewerIsHost: this.isHost,
        viewerUserId: this.userId,
    }
    let iframe = document.querySelector("iframe");
    iframe.contentWindow.postMessage(message, "*");
  }

  /**
   * 
   * @param {import('./Room-types.js').IFrameMessageBase<any, any>} message 
   */
  handleIframeMessage(message) {

    /** @type {PeerMessage} */
    let peerMessage = {
        kind: 'peer-message',
        type: 'iframe-relay',
        gameName: message.gameName,
        data: message
    };

    if (message.type === 'action-result' && this.isHost) {
        // broadcast the result state so clients can apply it
        this.broadcastMessage(peerMessage);
    }

    if (message.type === 'action') {
        // send back to iframe so iframe can generate a prediction state
        this.sendToIfame(message);
    }
    if (message.type === 'action' && !this.isHost) {
        // send to host so they can generate the actual state
        this.broadcastMessage(peerMessage);
    }
  }

  /**
   *
   * @param {PeerMessage} message
   */
  onPeerMessage(message) {
    if (message?.kind !== "peer-message") {
      console.error("invalid peer message", message);
      return;
    }

    if (
      message.type === "iframe-relay" &&
      message.gameName === this.roomState.state.game
    ) {
        this.sendToIfame(message.data)
    }

    if (message.type === "state") {
      let action = message.action;
      let resultState = message.resultState;
      if (this.isHost && action) {
        let resultState = this.roomState.handleAction(action);
        // send new state to peers
        this.broadcastMessage({
          ...message,
          resultState,
        });
      } else if (!this.isHost && resultState) {
        this.roomState.reconcileState(resultState);
      }
    }
  }

  /**
   *
   * @param {PeerMessage} message
   */
  broadcastMessage(message) {
    this.connections.forEach((conn) => {
      conn.send(message);
    });
  }
}
