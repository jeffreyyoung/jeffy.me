import { Game } from "../utils/p2p/Game";

/**
 * @typedef {{ reset: {}, place: { column: number } }} ActionMap
 * @typedef {{
 *      version: string,
 *      phase: "pre-game" | "bid" | "play",
 *      players: { id: string, name: string, color: string }[],
 *      turn: string,
 *      winner: string | 'draw' | '',
 *      columns: (string | null)[][],
 * }} GameState
 */

const columnsPerUser = 3.5;

const game = new Game(
  /** @type {GameState} */
  ({
    version: "0",
    phase: "pre-game",
    players: [],
    turn: "",
  }),
  /** @type {ActionMap} */
  // @ts-ignore
  ({}),
  {
    actions: {
      syncUsers: (state, { room }, actor) => {
        state.players = room.users.map((user) => {
          return {
            id: user.id,
            name: user.name,
            color: user.color,
          };
        });
        if (!state.players.find((p) => p.id === state.turn)) {
          state.turn = state.players[0].id;
        }
        let columns = Math.min(
          Math.floor(columnsPerUser * state.players.length),
          7
        );

        while (state.columns.length < columns) {
          state.columns.push([]);
        }
        return state;
      },
      place: (state, { column }, actor) => {
        if (state.turn !== actor || !state.turn) {
          return state;
        }
        if (state.columns[column].length >= 7) {
          return state;
        }
        state.columns[column].push(state.turn);
        let playerIndex =
          state.players.findIndex((p) => p.id === state.turn) || 0;
        state.turn =
          state.players[(playerIndex + 1) % state.players.length]?.id;
      },
      reset: (state, { room }) => {
        state.phase = "pre-game";
        state.turn = "";
        state.winner = "";
        state.columns = [];

        let columns = Math.min(
          Math.floor(columnsPerUser * state.players.length),
          7
        );
        while (state.columns.length < columns) {
          state.columns.push([]);
        }
        return state;
      },
    },
  }
);

game.onStateChange((state) => {
    update();
})

function update() {

}
