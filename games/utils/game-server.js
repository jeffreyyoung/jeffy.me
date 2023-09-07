/**
 * Create a game server
 *
 * @param {boolean} isHost - Is this the host server?
 *
 * @param {string} roomId - The room ID
 *
 * @param {object} initialState - The initial state of the game
 *
 * @param {function} onAction - A function to be called when an action is received
 *
 * @param {function} onStateChange - A function to be called when the state changes
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
  let peer = new Peer();
  let _host = null;
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
  });

  return {
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
