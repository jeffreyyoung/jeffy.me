import { State as StateLogic } from "./State.js";
import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps";
import { EventEmitter } from "./event-emitter.js";
import { arrayDiff, shuffle } from "../random.js";
import { colors, emojis } from "../game-values.js";

/**
 *
 * @param {string} pref
 * @param {{ color: string}[]} users
 * @returns
 */
function getAvailableColor(pref, users) {
  let available = arrayDiff(
    users.map((u) => u.color),
    colors
  );
  console.log("available", available, pref);
  if (available.includes(pref)) {
    return pref;
  }
  return shuffle(available)[0] || colors[0];
}

/**
 *
 * @param {string} pref
 * @param {{ emoji: string}[]} users
 * @returns
 */
function getAvailableEmoji(pref, users) {
  let available = arrayDiff(
    users.map((u) => u.emoji),
    emojis
  );
  if (available.includes(pref)) {
    return pref;
  }
  return shuffle(available)[0] || emojis[0];
}

/**
 * @typedef {import("./Room-types.js").RoomState} RoomState
 * @typedef {import("./Room-types.js").RoomActionMap} RoomActionMap
 * @typedef {import("./Room-types.js").PeerMessage<RoomActionMap, RoomState, {}>} PeerMessage;
 */
export class Room {
  /** @type {Peer} */
  peer = null;

  roomId = "";
  connected = false;
  userId = "";
  isHost = false;

  /** @type {EventEmitter<{ "change:connection": [boolean] }>} */
  emitter = new EventEmitter();

  /** @type {StateLogic<RoomActionMap, RoomState>} */
  roomState;

  /** @type {typeof console.log} */
  log;

  /**
   * @param {string} initialGame
   */
  constructor(initialGame = "", onDebugMessage = console.log) {
    /** @type {RoomState} */
    const initialState = {
      version: "",
      game: initialGame,
      users: [],
    };

    this.log = onDebugMessage;

    this.log("room: initialize room", initialState);
    this.roomState = new StateLogic(
      /** @type {RoomActionMap} */
      // @ts-ignore
      ({}),
      initialState,
      {
        actions: {
          userLeave: (state, { user }, actor) => {
            this.log("room: userLeave", user);
            let userIndex = state.users.findIndex((u) => u.id === user.id);
            if (userIndex === -1) {
              return state;
            }
            state.users.splice(userIndex, 1);
            return state;
          },
          userJoin: (state, { user }, actor) => {
            this.log("room: userJoin", user);
            if (state.users.find((u) => u.id === user.id)) {
              return state;
            }
            user.color = getAvailableColor(user.color, state.users);
            user.emoji = getAvailableEmoji(user.emoji, state.users);
            state.users.push(user);
            return state;
          },
          updateUser: (state, { user }, actor) => {
            this.log("room: updateUser", user);
            let userIndex = state.users.findIndex((u) => u.id === user.id);
            if (userIndex === -1) {
              return state;
            }
            user.color = getAvailableColor(user.color, state.users);
            user.emoji = getAvailableEmoji(user.emoji, state.users);
            state.users[userIndex] = user;
            return state;
          },
          kickUser: (state, { userId }, actor) => {
            this.log("room: kickUser", userId);
            let userIndex = state.users.findIndex((u) => u.id === userId);
            if (userIndex === -1) {
              return state;
            }
            state.users.splice(userIndex, 1);
            return state;
          },
          setGame: (state, { game }, actor) => {
            this.log("room: setGame", game);
            state.game = game;
            return state;
          },
        },
      }
    );

    this.roomState.emitter.on("change:state", (state, action) => {
      this.sendRoomEventToIframe("syncUsers", { isFirstSync: false });
    });

    window.addEventListener("message", (event) => {
      /** @type {import('./Room-types.js').IFrameMessageOut<any, any>} */
      let message = event.data;

      if (message?.kind !== "iframe-message") {
        // @ts-expect-error
        if (message?.source?.startsWith("react")) {
          // ignore react messages
          return;
        }
        console.error("invalid iframe message", message);
        return;
      }

      if (message?.gameName !== this.roomState.state.game) {
        console.error("invalid game name", message);
        return;
      }

      this.handleIframeMessage(message);
    });

    // let lastGame = this.roomState.state.game;
    // this.onStateChange((state) => {
    //   if (state.game !== lastGame) {
    //     lastGame = state.game;

    //     this.sendRoomEventToIframe('init', {});
    //   }
    // });
  }

  /**
   * @template {keyof RoomActionMap} T
   * @param {T} type
   * @param {RoomActionMap[T]} payload
   * */
  send(type, payload) {
    const action = this.roomState.createAction(type, payload, this.userId);

    const resultState = this.roomState.handleAction(action);

    this.broadcastMessage({
      kind: "peer-message",
      type: "state",
      action,
      resultState,
    });
  }

  /** @param {boolean} connected */
  setConnected(connected) {
    this.log("room: setConnected", connected);
    this.connected = connected;
    this.emitter.emit("change:connection", this.connected);
  }

  /** @param {(connected: boolean) => void} cb */
  onConnectionChange(cb) {
    this.log("room: onConnectionChange");
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
    this.log("room: connect", { isHost, userId, roomId });
    if (this.peer) {
      this.log("room: connect - err - already connected");
      throw new Error("Already connected");
    }
    this.peer = this.setupPeer();
    return true;
  }

  getHostRoomId() {
    return "jeffydotme-" + this.roomId;
  }

  setupPeer() {
    this.peer = new Peer(this.isHost ? this.getHostRoomId() : undefined, {
      debug: 1,
    });
    this.log("room: setupPeer - connecting as ", this.peer.id);
    this.peer.on("open", (id) => {
      this.log("room: setupPeer - open");

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
      this.log("room: setupPeer - error", e);
      if (e.type === "peer-unavailable" && !this.isHost) {
        // this probably means the host is gone
        setTimeout(() => this.connectToHost(), 1000);
      }
    });

    this.peer.on("close", () => {
      this.log("room: setupPeer - close");
      this.peer.destroy();
      setTimeout(() => this.setupPeer(), 1000);
    });

    return this.peer;
  }

  listenForPeerConnections() {
    this.peer.on("connection", (conn) => {
      this.log("room: on connection - ", conn?.connectionId);
      this.connections.push(conn);
      conn.on("open", () => {
        /** @type {PeerMessage} */
        const initialMessage = {
          kind: "peer-message",
          type: "state",
          resultState: this.roomState.state,
        };
        this.log("room: on connection open");
        conn.send(initialMessage);
      });

      conn.on("data", (data) => {
        this.log("room: on connection data", data);
        console.log("listenForPeerConnections.data", data);

        // @ts-ignore
        this.onPeerMessage(data);
      });
      conn.on("close", () => {
        this.log("room: on connection close");
        this.connections = this.connections.filter((c) => c !== conn);
      });
      conn.on("error", (err) => {
        this.log("room: on connection error", err);
        console.error("connection error", err);
        console.log("listenForPeerConnections.error");
      });
    });
  }

  /** @type {import("https://esm.sh/peerjs@1.5.2?bundle-deps").PeerJsConnection[]} */
  connections = [];

  connectToHost() {
    this.log("room: connectToHost");
    let conn = this.peer.connect(this.getHostRoomId());
    conn.on("error", (e) => {
      this.log("room: connectToHost - error", e);
      console.log("connectToHost - error", e);
      this.connections = this.connections.filter((c) => c !== conn);
      this.setConnected(false);
      setTimeout(() => this.connectToHost(), 1000);
    });
    conn.on("close", () => {
      this.log("room: connectToHost - closed");
      console.log("connectToHost - closed");
      this.connections = this.connections.filter((c) => c !== conn);
      this.setConnected(false);
      setTimeout(() => this.connectToHost(), 1000);
    });
    conn.on("open", () => {
      this.log("room: connectToHost - open");
      console.log("connectToHost - open");
      this.connections.push(conn);
      this.setConnected(true);
      conn.on("data", (data) => {
        // @ts-ignore
        this.onPeerMessage(data);
      });
    });
  }

  /**
   * @template {keyof import('./Room-types.js').GameCommonActionMap} Type
   * @param {Type} type
   * @param {import('./Room-types.js').GameCommonActionMap[Type]} payload
   */
  sendRoomEventToIframe(type, payload) {
    this.sendToIfame({
      gameName: this.roomState.state.game,
      action: {
        actor: this.userId,
        kind: "action",
        payload,
        type,
        meta: null,
      },
      kind: "iframe-message",
      type: "action",
    });
  }
  /**
   * Sends a message into the iframe and decorates it with extra information
   * @param {import('./Room-types.js').IFrameMessageOut<any, any>} messageBase
   */
  sendToIfame(messageBase) {
    /** @type {import('./Room-types.js').IFrameMessageIn<any, any>} */
    let message = {
      ...messageBase,
      action: {
        ...messageBase.action,
        meta: {
          viewerId: this.userId,
          room: this.roomState.state,
        },
      },
    };
    let iframe = document.querySelector("iframe");
    if (!iframe) {
      console.error("no iframe found");
      return;
    }
    iframe.contentWindow.postMessage(message, "*");
  }

  /**
   *
   * @param {import('./Room-types.js').IFrameMessageOut<any, any>} message
   */
  handleIframeMessage(message) {
    /** @type {PeerMessage} */
    let peerMessage = {
      kind: "peer-message",
      type: "iframe-relay",
      gameName: message.gameName,
      data: {
        ...message,
      },
    };

    if (message.type === "action-result" && this.isHost) {
      // broadcast the result state so clients can apply it
      this.broadcastMessage(peerMessage);
    }

    if (message.type === "action") {
      // send back to iframe so iframe can generate a prediction state
      this.sendToIfame(message);
    }
    if (message.type === "action" && !this.isHost) {
      // send to host so they can generate the actual state
      this.broadcastMessage(peerMessage);
    }
  }

  /**
   *
   * @param {PeerMessage} message
   */
  onPeerMessage(message) {
    console.log("peer message received", message);

    if (
      message.type === "iframe-relay" &&
      message.gameName === this.roomState.state.game
    ) {
      this.sendToIfame(message.data);
    }

    if (message?.kind !== "peer-message") {
      console.error("invalid peer message", message);
      return;
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
        this.roomState.reconcileState(resultState, action);
      }
    }
  }

  /**
   *
   * @param {PeerMessage} message
   */
  broadcastMessage(message) {
    console.log("sending message!", message);
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(message);
      } else {
        console.info("connection not open", conn);
      }
    });
  }
}
