import { Peer } from "https://esm.sh/peerjs@1.5.2?bundle-deps";

// https://peerjs.com/docs/#peeron-error
/**
 * @typedef PeerJsConnection
 * @type {import("https://esm.sh/peerjs@1.5.2?bundle-deps").PeerJsConnection}
 */

/** @type {any} */
let _server = null;
/**
 * @template GameState
 * @template Action
 * @param {GameServerArgs<GameState, Action>} args
 * @returns {ReturnType<typeof createGameServer<GameState, Action>>}
 */
export function getSingletonGameServer(args) {
  if (!_server) {
    _server = createGameServer(args);
  }
  return _server;
}

/**
 * @template GameState
 * @template Action
 * @typedef GameServerArgs
 * @type {{
 *  isHost: boolean,
 *  roomId: string,
 *  initialState: GameState,
 *  onAction: (state: GameState, action: Action) => GameState,
 *  onStateChange: (state: GameState) => any 
 * }}
 */

/**
 * Create a game server
 * @template GameState
 * @template Action
 * @param {GameServerArgs<GameState, Action>} args
 */
export function createGameServer({
  isHost,
  roomId,
  initialState,
  onAction,
  onStateChange,
}) {
  console.log('createGameServer', isHost, roomId, initialState, onAction, onStateChange)
  let state = initialState;
  /** @type {PeerJsConnection[]} */
  let connections = [];
  setTimeout(() => {
    onStateChange(state);
  });
  if (isHost) {
    console.log('hosting room', roomId);
    // recieves
    let peer = new Peer(roomId);
    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    peer.on("connection", function (conn) {
      console.log("connection", conn);
      setTimeout(() => {
        conn.send(state)
      }, 500);
      connections.push(conn);
      conn.on("data", (action) => {
        try {
          state = onAction(state, action);
          connections.forEach((connection) => connection.send(state));
          onStateChange(state);
        } catch (e) {
          console.error(e);
        }
      });
    });
    return {
      isConnected() {
        return true;
      },
      getLatestState() {
        return state;
      },
      /**
       * 
       * @param {Action} action 
       */
      send(action) {
        console.log('action', action);
        state = onAction(state, action);
        connections.forEach((connection) => connection.send(state));
        console.log("sending action to connections");
        onStateChange(state);
      },
    };
  }
  /** @type {Action[]} */
  let queuedActions = [];

  console.log("connection to roomId", roomId);
  /** @type {PeerJsConnection} */
  let _host;
  
  function connectToHost() {
    let peer = new Peer();
    console.log("opening peer");
    peer.on("open", (id) => {
        console.log("my peer id is", id);
        let host = peer.connect(roomId);
        host.on('error', (e) => {
            console.log('error', e);
            peer.destroy();
            setTimeout(connectToHost, 1000);
        })
        console.log('connecting to host, retrying...');
        setTimeout(() => {
          if (!host.open) {
            console.log('host not open');
            peer.destroy();
            connectToHost();
          }
        }, 5000);
        host.on("open", () => {
          console.log('connected to host');
            _host = host;
          queuedActions.forEach((action) => host.send(action));
          console.log("on open");
    
          host.on("data", (data) => {
            console.log("data from host", data);
            // @ts-expect-error
            state = data;
            // @ts-expect-error
            onStateChange(data);
          });
        });
    
        host.on('close', () => {
            console.log("host closed");
            // @ts-ignore
            _host = null;
            peer.destroy();
            setTimeout(connectToHost, 1000);
            // setup
        })
      });
  }

  connectToHost();


  return {
    getLatestState() {
      return state;
    },

    isConnected() {
      return _host !== null;
    },
    /**
     * 
     * @param {Action} action 
     * @returns 
     */
    send(action) {
      if (!_host) {
        queuedActions.push(action);
        return;
      }
      console.log("sending action to host");
      _host.send(action);
    },
  };
}


