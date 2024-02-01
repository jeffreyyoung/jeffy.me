import { doConfetti } from "./utils/confetti.js";
import { css } from "./utils/css.js";
import { Game } from "./utils/p2p/Game.js";
import { recursiveAssign } from "./utils/recursiveAssign.js";
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
 *         id: string,
 *         username: string,
 *         isHost: boolean,
 *         emoji: string,
 *       }[]
 * }} GameState
 */

/** @type GameState */
const initialState = {
  version: "0",
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

const state = van.state(initialState);

const server = new Game(
  initialState,
  /** @type {{
   *    move: { x: number, y: number },
   *    reset: {},
   * }} */
  // @ts-ignore
  ({}),
  {
    actions: {
      syncUsers: (state, payload, actor, { room }) => {
        for (const user of room.users) {
          if (!state.players.find((p) => p.id === user.id)) {
            state.players.push({
              id: user.id,
              username: user.name,
              isHost: user.isHost,
              emoji: emojis[state.players.length],
            });
          }
        }
        if (!state.turn) {
          state.turn = state.players[0].emoji;
        }
        return state;
      },
      reset: (state) => {
        recursiveAssign(state, {
          board: [
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
          ],
          winner: "",
          turn: state.players[0].emoji,
        });
        return state;
      },
      move: (state, { x, y }, actor) => {
        if (state.winner) {
          return state;
        }
        const playerIndex = state.players.findIndex((p) => p.id === actor);
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
  }
);

server.onStateChange((incoming) => {
  state.val = { ...incoming };
});

const hasWinner = van.derive(() => {
  return state.val.winner !== "";
});

van.derive(() => {
  if (hasWinner.val) {
    doConfetti();
  }
});

const UI = () => {
  console.log("in game!!!!!");

  return div(
    { style: "position: relative;" },
    div(
      {
        style:
          "display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr 1fr; grid-gap: 10px; width: 300px; height: 300px; margin: 0 auto;",
      },
      ...state.val.board.flatMap((row, y) =>
        row.map((cell, x) => {
          return () =>
            state.val.board[y][x] === ""
              ? button({ onclick: () => server.action("move", { x, y }) })
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
    h4({ style: "text-align: center;" }, () =>
      state.val.winner
        ? `${state.val.winner} wins!`
        : state.val.players.find((p) => p.id === server.userId)?.emoji ===
          state.val.turn
        ? "your turn"
        : "waiting for other player"
    ),
    div(
      {
        style: () =>
          `display: ${
            hasWinner.val ? "flex" : "none"
          }; justify-content: center;`,
      },
      button(
        {
          onclick: () => {
            server.action("reset", {});
          },
        },
        "reset"
      )
    ),
    h4("player turn: ", () => state.val.turn),
    h4("players"),
    () =>
      ul(
        ...state.val.players.map((p) =>
          li(
            `${p.emoji} ${p.username} ${p.id === server.userId ? "(you)" : ""}`
          )
        )
      )
  );
};

van.add(document.getElementById("game-slot"), UI());
