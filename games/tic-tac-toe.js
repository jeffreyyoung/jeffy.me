import { css } from "./utils/css.js";
import { P2pState } from "./utils/p2p-state.js";
import {
  InviteSlot,
  PreGameGate,
  isHost,
  lobbyId,
  username,
} from "./utils/pre-game.js";
import { singleton } from "./utils/singleton.js";
import { van, div, button, h1, span, noop, h4, ul, li } from "./utils/tags.js";

css`
  h1 {
    text-align: center;
  }
`;

/**
 * @typedef {{
 *      version: string,
 *      board: string[][],
 *      turn: string,
 *      winner: string,
 *      players: {
 *         name: string,
 *         isHost: boolean,
 *         emoji: string,
 *       }[]
 * }} GameState
 */

/** @type GameState */
const initialState = {
  version: '0',
  board: [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ],
  winner: "",
  turn: "",
  players: [],
};
const emojis = ["🐶", "🐱", "🐭", "🐹", "🐰", "🐻"];

const isConnected = van.state(false);
const state = van.state(initialState);
const Game = () => {
  console.log("in game!!!!!");
  const server = singleton(
    "ttt",
    () =>
      new P2pState(
        /** @type {{
         *    join: { username: string },
         *    move: { x: number, y: number },
         * }} */
        // @ts-ignore
        ({}),
        initialState,
        {
          actions: {
            join: (state, _, actor) => {
              if (state.players.find((p) => p.name === actor)) {
                return state;
              }
              if (state.players.length >= emojis.length) {
                return state;
              }
              const emoji = emojis[state.players.length];
              state.players.push({
                name: actor,
                isHost: isHost.val && actor === username.val,
                emoji,
              });

              if (!state.turn) {
                state.turn = emoji;
              }
              return state;
            },
            move: (state, { x, y }, actor) => {
              if (state.winner) {
                return state;
              }
              const playerIndex = state.players.findIndex(
                (p) => p.name === actor
              );
              if (playerIndex === -1) {
                return state;
              }
              const player = state.players[playerIndex];
              if (player.emoji !== state.turn) {
                return state;
              }

              if (state.board[y][x] !== "") {
                return state;
              }
              state.board[y][x] = state.turn;

              let didWin = false;
              // check row
              if (
                state.board[y][0] === state.turn &&
                state.board[y][1] === state.turn &&
                state.board[y][2] === state.turn
              ) {
                didWin = true;
              }
              // check col
              if (
                state.board[0][x] === state.turn &&
                state.board[1][x] === state.turn &&
                state.board[2][x] === state.turn
              ) {
                didWin = true;
              }
              // check diag
              if (
                state.board[0][0] === state.turn &&
                state.board[1][1] === state.turn &&
                state.board[2][2] === state.turn
              ) {
                didWin = true;
              }

              if (
                state.board[0][2] === state.turn &&
                state.board[1][1] === state.turn &&
                state.board[2][0] === state.turn
              ) {
                didWin = true;
              }

              if (didWin) {
                state.winner = state.turn;
              }

              const nextPlayerIndex = (playerIndex + 1) % state.players.length;
              state.turn = state.players[nextPlayerIndex].emoji;

              return state;
            },
          },
          actorUsername: username.val,
          roomId: lobbyId.val,
          isHost: isHost.val,
          onStateChange: (incoming) => {
            state.val = { ...incoming };
          },
          onConnectionChange: (connected) => {
            isConnected.val = connected;
            if (connected) {
              server.send("join", { username: username.val });
            }
          },
        }
      )
  );

  if (!state.val.players.find((p) => p.name === username.val)) {
    server.send("join", { username: username.val });
  }

  return div(
    { style: "position: relative;" },
    h4({ style: "text-align: center;" }, () =>
      state.val.winner
        ? `${state.val.winner} wins!`
        : state.val.players.find((p) => p.name === username.val)?.emoji ===
          state.val.turn
        ? "your turn"
        : "waiting for other player"
    ),
    div(
      {
        style:
          "display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; grid-gap: 10px; width: 300px; height: 300px; margin: 0 auto;",
      },
      ...state.val.board.flatMap((row, y) =>
        row.map((cell, x) => {
          return () =>
            state.val.board[y][x] === ""
              ? button({ onclick: () => server.send("move", { x, y }) })
              : span(
                  {
                    style:
                      "font-size: 3em; display: flex; align-items: center; justify-content: center;",
                  },
                  state.val.board[y][x]
                );
        })
      )
    ),
    h4(
      { style: "text-align: center;" },
      "your emoji: ",
      () => state.val.players.find((p) => p.name === username.val)?.emoji
    ),
    div(
      {
        style: () =>
          `display: ${
            isConnected.val ? "none" : "flex"
          }; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.5); align-items: center; justify-content: center;`,
      },
      h1("connecting...")
    ),
    h4("other player turn: ", () => state.val.turn),
    h4("players"),
    () => ul(...state.val.players.map((p) => li(`${p.emoji} ${p.name}`)))
  );
};

van.add(
  document.getElementById("game-slot"),
  PreGameGate(() => Game())
);

van.add(document.getElementById("invite-slot"), InviteSlot());
