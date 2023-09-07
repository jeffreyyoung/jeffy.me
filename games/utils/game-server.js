/**
 * Create a game server
 * @template T
 * @template Action
 * @param {{ isHost: boolean, roomId: string, initialState: T, onAction: (action: Action, state: T) => any, onStateChange: (state: T) => any}} args - Is this the host server?
 */

export function createGameServer({
  isHost,
  roomId,
  initialState,
  onAction,
  onStateChange,
}) {
  let state = initialState;
  let connections = [];
  setTimeout(() => {
    onStateChange(state);
  });
  if (isHost) {
    // recieves
    let peer = new Peer(roomId);
    peer.on("open", function (id) {
      console.log("My peer ID is: " + id);
    });

    peer.on("connection", function (conn) {
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
      send(action) {
        state = onAction(state, action);
        connections.forEach((connection) => connection.send(state));
        console.log("sending action to connections");
        onStateChange(state);
      },
    };
  }
  let queuedActions = [];

  console.log("connection to roomId", roomId);
  let _host = null;
  
  function connectToHost() {
    let peer = new Peer();
    console.log("connecting to host");
    peer.on("open", (id) => {
        console.log("my peer id is", id);
        let host = peer.connect(roomId);
    
        host.on("open", () => {
            _host = host;
          queuedActions.forEach((action) => host.send(action));
          console.log("on open");
    
          host.on("data", (data) => {
            console.log("data", data);
            onStateChange(data);
          });
        });
    
        host.on('close', () => {
            console.log("host closed");
            _host = null;
            peer.destroy();
            setTimeout(connectToHost, 1000);
            // setup
        })
      });
  }

  connectToHost();


  return {
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
