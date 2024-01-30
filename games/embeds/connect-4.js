import { css } from "../utils/css.js";
import { Game } from "../utils/p2p/Game.js";
import { render, html } from "https://esm.sh/lit-html@3.1.1";
/**
 * @typedef {{ reset: {}, place: { column: number } }} ActionMap
 * @typedef {{
 *      version: string,
 *      phase: "pre-game" | "bid" | "play",
 *      players: { id: string, name: string, color: string, emoji: string }[],
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
    columns: [],
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
            emoji: user.emoji,
          };
        });
        if (!state.players.find((p) => p.id === state.turn)) {
          state.turn = state.players[0]?.id;
        }
        console.log("syncUsers");
        let columns = Math.max(
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

        function recurse(player, x, y, dx, dy, count = 0) {
          if (count === 4) return true;
          if (x < 0 || y < 0 || x >= state.columns.length) return false;
          if (state.columns[x][y] !== player) return false;
          return recurse(player, x + dx, y + dy, dx, dy, count + 1);
        }
        // check for win
        console.log("here");

        for (let x = 0; x < state.columns.length; x++) {
          if (state.winner) break;

          for (let y = 0; y < state.columns[x].length; y++) {
            let player = state.columns[x][y];
            console.log("checking for win", player, x, y);
            if (!player) continue;

            let didWin =
              recurse(player, x, y, 1, 0) ||
              recurse(player, x, y, 0, 1) ||
              recurse(player, x, y, 1, 1) ||
              recurse(player, x, y, 1, -1);
            console.log("did win", didWin);
            state.winner = didWin ? player : "";

            if (state.winner) break;
          }
        }

        let playerIndex =
          state.players.findIndex((p) => p.id === state.turn) || 0;
        state.turn =
          state.players[(playerIndex + 1) % state.players.length]?.id;
        console.log("state.turn", state.turn);
        return state;
      },
      reset: (state, { room }) => {
        state.phase = "pre-game";
        state.turn = "";
        state.winner = "";
        state.columns = [];
        game.action("syncUsers", { isFirstSync: false });
        return state;
      },
    },
  }
);
let confettiShown = false;
game.onStateChange((state) => {
  console.log("render!", game);
  update(state, game.userId);
  if (state.winner && !confettiShown) {
    confettiShown = true;
    import("../utils/confetti.js").then((confetti) => {
      confetti.doConfetti();
    });
  }
});

const root = document.getElementById("root");
css`
  :root {
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    font-size: 1em;
    --chip-color: gray;
    --chip-width: 50px;
  }
  button {
    all: unset;
    background-color: rgb(239, 239, 239);
    border: 1px solid black;
    padding: 3px 3px;
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  }
  button:focus {
    outline: 2px solid dodgerblue;
  }
  .board {
    display: flex;
    gap: 3px;
    justify-content: center;
    overflow: scroll;
    max-width: 100%;
  }

  .column {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: var(--chip-width);
  }
  .chips {
    display: flex;
    flex-direction: column-reverse;
    gap: 6px;
    min-height: calc(var(--chip-width) * 7 + 6px * 6 + 6px);
  }

  .chip {
    height: var(--chip-width);
    width: var(--chip-width);
    border-radius: 50%;
    background-color: var(--chip-color);
    transition: transform 0.2s;
    animation: dropIn 0.2s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--chip-width) / 2);
  }

  @keyframes dropIn {
    from {
      transform: translateY(-300px);
    }

    to {
      transform: translateY(0);
    }
  }

  #root > * + * {
    margin-top: 24px;
  }
`;
/**
 *
 * @param {GameState} state
 * @param {string} viewerId
 */
function update(state, viewerId) {
  const curPlayer = state.players.find((p) => p.id === state.turn) || {
    emoji: "",
    name: "",
    id: "",
    color: "",
  };
  const ui = html`
    <div class="board">
      ${state.columns.map(
        (column, index) => html`
          <div class="column">
            <div class="chips">
              ${column.map(
                (playerId) => html`
                  <div
                    style="--chip-color: ${state.players.find(
                      (p) => p.id === playerId
                    )?.color || "gray"}"
                    class="chip ${playerId === viewerId ? "me" : ""}"
                  >
                    ${state.players.find((p) => p.id === playerId)?.emoji}
                  </div>
                `
              )}
            </div>
            <button
              @click=${() => game.action("place", { column: index })}
              ?disabled=${state.turn !== viewerId}
            >
              place
            </button>
          </div>
        `
      )}
    </div>
    ${state.winner
      ? html`<h1 style="text-align: center;">
            ${state.players.find((p) => p.id === state.winner)?.name} wins!
          </h1>
          <div style="display: flex; justify-content: center;">
            <button @click=${() => game.action("reset", {})}>reset</button>
          </div> `
      : ""}
    <p
      style="display: flex; align-items: center; justify-content: center; gap: 12px;"
    >
      <span
        style="display: inline-block; padding: 6px; background-color: ${curPlayer.color ||
        "gray"}"
        >${curPlayer?.emoji}</span
      >${curPlayer.id === viewerId ? "your" : curPlayer?.name + "'s"} turn
    </p>
    <ul>
      ${state.players.map(
        (p) =>
          html`<li>
            <span style="background-color: ${p.color}">${p.emoji} ${p.name}<span>
          </li>`
      )}
    </ul>
    <details open>
      <summary>how to play</summary>
      <p>
        Each player takes turns placing a chip in one of the columns. The first
        player to get 4 chips in a row wins!
      </p>
    </details>
    <div style="display: flex; justify-content: center; padding-top: 12px;">
      <button @click=${() => game.action("reset", {})}>reset</button>
    </div>
  `;
  render(ui, root);
}
