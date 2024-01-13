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
import { van, div, button, h1, span, h4, ul, li } from "./utils/tags.js";
import { reactive, list, stateFields, calc } from "./../deps/van-x.js";
import { recursiveAssign } from "./utils/recursiveAssign.js";
import { confetti } from "./utils/confetti.js";

/**
 *
 * @param {number} start
 * @param {number} end
 * @returns
 */
function range(start, end) {
  return Array.from({ length: end - start }, (_, i) => i + start);
}
css`
  h1 {
    text-align: center;
  }
`;

/**
 * @typedef {{
 *      version: string,
 *      board: {
 *        type: 'bomb' | 'safe',
 *        neighboringBombCount: number,
 *        i: number,
 *        status: 'correct' | 'incorrect' | 'neutral' | 'hidden'
 *        revealedBy: string,
 *      }[],
 *      columnCount: number,
 *      rowCount: number,
 *      bombCount: 9,
 *      winner: string,
 *      players: Record<string, {
 *         name: string,
 *         isHost: boolean,
 *         color: string,
 *         score: number,
 *         hasTouchedBomb: boolean,
 *       }>
 * }} GameState
 */

/**
 * 
 * @param {number} index 
 * @param {*} param1 
 * @returns number[]
 */
function getNeighbors(index, { rowCount, columnCount } = { rowCount: 9, columnCount: 9}) {
  const [x, y] = indexToCoord(index, columnCount);
  const neighbors = [];
  for (const [dx, dy] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const nx = x + dx;
    if (nx < 0 || nx >= columnCount) {
      continue;
    }
    const ny = y + dy;
    if (ny < 0 || ny >= rowCount) {
      continue;
    }
    neighbors.push(coordToIndex(nx, ny, columnCount));
  }
  return neighbors;
}

/**
 *
 * @param {number} rowCount
 * @param {number} columnCount
 * @param {number} bombCount
 * @returns {GameState['board']}
 */
function createBoard(rowCount, columnCount, bombCount) {
  /** @type {GameState['board']} */
  const board = range(0, rowCount * columnCount).map((i) => ({
    i,
    type: "safe",
    neighboringBombCount: 0,
    status: "hidden",
    revealedBy: "",
  }));
  let bombIndexes = new Set();
  
  while (bombIndexes.size < bombCount) {
    let index = Math.floor(Math.random() * board.length);
    if (bombIndexes.has(index)) {
      continue;
    }
    bombIndexes.add(index);
  }

  for (let index of bombIndexes) {
    board[index].type = "bomb";
    for (const neighbors of getNeighbors(index, {
      rowCount,
      columnCount,
    })) {
      const neighbor = board[neighbors];
      if (neighbor.type !== 'bomb') {
        neighbor.neighboringBombCount++;
      }
    }
  }

  return board;
}

const state = reactive(
  /** @type {GameState} */
  ({
    version: "0",
    board: createBoard(9, 9, 9),
    bombCount: 9,
    revealedTileCount: 0,
    columnCount: 9,
    rowCount: 9,
    winner: "",
    players: {},
  })
);


// @ts-ignore
window.state = state;

/**
 * 
 * @param {number} index 
 * @param {number} rowSize 
 * @returns {[number, number]}
 */
function indexToCoord(index, rowSize = 9) {
  return [index % rowSize, Math.floor(index / rowSize)];
}
/**
 * 
 * @param {number} x 
 * @param {number} y 
 * @param {number} rowSize 
 * @returns {number}
 */
function coordToIndex(x, y, rowSize = 9) {
  return y * rowSize + x;
}

const colors = ["blue", "green", "red", "orange", "yellow", "purple", "pink"];

const isConnected = van.state(false);
const server = () =>
  singleton(
    "ttt",
    () =>
      new P2pState(
        /** @type {{
         *    join: { username: string },
         *    move: { index: number, action: 'reveal' | 'flag' },
         * }} */
        // @ts-ignore
        ({}),
        /** @type {GameState} */
        (state),
        {
          actions: {
            join: (state, _, actor) => {
              if (state.players[actor]) {
                return state;
              }
              if (Object.values(state.players).length >= colors.length) {
                return state;
              }
              const color = colors[Object.values(state.players).length];

              state.players[actor] = {
                name: actor,
                isHost: isHost.val && actor === username.val,
                color,
                score: 0,
                hasTouchedBomb: false,
              };
              return state;
            },
            move: (state, { index, action: _action }, actor) => {
              const action = _action;
              if (state.board[index].status !== "hidden") {
                return state;
              }
              if (index < 0 || index >= state.board.length) {
                return state;
              }
              if (state.board[index].revealedBy) {
                return state;
              }
              const player = state.players[actor];
              if (!player) {
                return state;
              }
              if (player.hasTouchedBomb) {
                return state;
              }
              const tile = state.board[index];

              tile.revealedBy = actor;
              tile.status =
                (action === "flag" && tile.type === "bomb") ||
                (action === "reveal" && tile.type === "safe")
                  ? "correct"
                  : "incorrect";
              if (tile.status === "incorrect") {
                player.score -= 5;
              } else {
                player.score++;
              }
              // reveal neighbors if bomb count is zero
              if (tile.type === "safe" && tile.neighboringBombCount === 0) {
                const visited = new Set();
                const queue = [index];
                while (queue.length > 0) {
                  const index = queue.shift();
                  if (visited.has(index)) {
                    continue;
                  }
                  visited.add(index);
                  const tile = state.board[index];
                  if (tile.type === "safe") {
                    tile.status = "neutral";
                    if (tile.neighboringBombCount === 0) {
                      queue.push(...getNeighbors(index, state));
                    }
                  }
                }
              }

              const playersStillAlive = Object.values(state.players).filter(
                (p) => !p.hasTouchedBomb
              );
              if (playersStillAlive.length === 1) {
                state.winner = playersStillAlive[0].name;
              }

              if (!state.winner) {
                const untouchedTiles = state.board.filter((t) => !t.revealedBy);
                if (untouchedTiles.length === 0) {
                  state.winner = playersStillAlive.sort(
                    (a, b) => b.score - a.score
                  )[0].name;
                }
              }

              return state;
            },
          },
          actorUsername: username.val,
          roomId: lobbyId.val,
          isHost: isHost.val,
          onStateChange: (incoming) => {
            if (incoming.version !== state.version) {
              recursiveAssign(state, incoming);
            }
          },
          onConnectionChange: (connected) => {
            isConnected.val = connected;
            if (connected) {
              server().send("join", { username: username.val });
            }
          },
        }
      )
  );

van.derive(() => {
  console.log("board", state.board);
});

const remainingNonBombTiles = van.derive(() => {
  return state.board.filter((t) => t.type === "safe" && t.status === "hidden")
    .length;
});

const isGameOver = van.derive(() => {
  if (remainingNonBombTiles.val === 0) {
    confetti();
  }
  return remainingNonBombTiles.val === 0;
});

const victor = van.derive(() => {
  // helps to calc victor
  remainingNonBombTiles.val;
  isGameOver.val;
  return Object.values(state.players).sort((a, b) => b.score - a.score)[0]
    ?.name;
});

const Game = div(
  { style: "position: relative;" },
  () =>
    list(
      (...args) =>
        div(
          {
            style: `display: grid; grid-template-columns: repeat(${state.columnCount}, 1fr); grid-template-rows: repeat(${state.rowCount}, 1fr); width: 100%; aspect-ratio: 1; margin: 0 auto;`,
          },
          ...args
        ),
      state.board,
      (cell, remove, i) => {
        let fields = stateFields(
          /** @type {GameState['board'][0] & import("./../deps/van-x.js").ReactiveObj} */
          // @ts-ignore
          (state.board[i])
        );

        let text = van.derive(() => {
          let str = "";
          if (fields.status.val === "hidden") {
            return "";
          }

          if (cell.val.type === "bomb") {
            str += cell.val.status === "correct" ? "⛳️" : "💥";
          } else if (
            cell.val.type === "safe" &&
            cell.val.neighboringBombCount > 0
          ) {
            str += cell.val.neighboringBombCount;
          }
          return str;
        });

        return button(
          {
            style: () =>
              `--player-color: ${state.players[cell.val.revealedBy]?.color}`,
            class: () =>
              `tile ${
                cell.val.status !== "hidden"
                  ? `revealed-tile flash-player-color-animation tile-${cell.val.status}`
                  : ""
              }
              ${
                cell.val.type === "safe"
                  ? "tile-neighbors-" + cell.val.neighboringBombCount
                  : ""
              }
              `,
            disabled: () => !!cell.val.revealedBy,
            onclick: () =>
              server().send("move", {
                index: cell.val.i,
                action: "reveal",
              }),
            oncontextmenu: (e) => {
              e.preventDefault();
              server().send("move", {
                index: cell.val.i,
                action: "flag",
              });
            },
            ondblclick: (e) => {
              e.preventDefault();
              server().send("move", {
                index: cell.val.i,
                action: "flag",
              });
            },
          },
          () => text.val
        );
      }
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
  h1(
    {
      style: () => `text-align: center; display: ${isGameOver.val ? "block" : "none"};`,
    },
    () => (victor.val ? `${victor.val} wins!` : "draw!")
  ),
  h4("remaining safe tiles ", remainingNonBombTiles),
  h4("players"),
  list(ul, state.players, (player) =>
    li(
      span({
        style: () =>
          `background-color: ${player.val.color}; width: 1em; height: 1em; display: inline-block; margin-right: 0.5em;`,
      }),
      player.val.name,
      ", score ",
      player.val.score
    )
  )
);

van.add(
  document.getElementById("game-slot"),
  PreGameGate(() => {
    server();
    return Game;
  })
);

van.add(document.getElementById("invite-slot"), InviteSlot());
