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
 *      board: (({ type: 'bomb' } | { type: 'blank', neighboringBombCount: number })&{ touchedBy?: string })[],
 *      columnCount: number,
 *      rowCount: number,
 *      winner: string,
 *      players: Record<string, {
 *         name: string,
 *         isHost: boolean,
 *         emoji: string,
 *         score: number,
 *         hasTouchedBomb: boolean,
 *       }>
 * }} GameState
 */


function getNeighbors(index, { rowCount, columnCount, board }) {
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
 * @returns {GameState['board']}
 */
function createBoard(rowCount, columnCount) {
  /** @type {GameState['board']} */
    const board = range(0, rowCount * columnCount).map(() => ({ type: 'blank', neighboringBombCount: 0 }));
    const bombCount = Math.floor(board.length / 10);
    for (let i = 0; i < bombCount; i++) {
        const index = Math.floor(Math.random() * board.length);
        board[index] = { type: 'bomb' };
        for (const neighbors of getNeighbors(index, { rowCount, columnCount, board })) {
            const neighbor = board[neighbors];
            if (neighbor.type === 'blank') {
              neighbor.neighboringBombCount++;
            }
        }
    }
    return board;
}

/** @type GameState */
const initialState = {
  board: createBoard(9, 9),
  columnCount: 9,
  rowCount: 9,
  winner: "",
  players: {},
};

function indexToCoord(index, rowSize) {
    return [index % rowSize, Math.floor(index / rowSize)];
}
function coordToIndex(x, y, rowSize) {
    return y * rowSize + x;
}

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
         *    move: { index: number, action: 'reveal' | 'flag' },
         * }} */
        // @ts-ignore
        ({}),
        initialState,
        {
          actions: {
            join: (state, _, actor) => {
              if (state.players[actor]) {
                return state;
              }
              if (Object.values(state.players).length >= emojis.length) {
                return state;
              }
              const emoji = emojis[Object.values(state.players).length];

              state.players[actor] ={
                name: actor,
                isHost: isHost.val && actor === username.val,
                emoji,
                score: 0,
                hasTouchedBomb: false,
              };
              return state;
            },
            move: (state, { index, action: _action }, actor) => {
              const action = _action;
              // if (state.winner) {
              //   return state;
              // }
              if (index < 0 || index >= state.board.length) {
                return state;
              }
              if (state.board[index].touchedBy) {
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
              if (tile.type === 'bomb') {
                tile.touchedBy = actor;
                if (action === 'flag') {
                  player.score++;
                } else {
                  player.hasTouchedBomb = true;
                }
              } else if (tile.type === 'blank') {
                tile.touchedBy = actor;
                if (action === 'flag') {
                  player.score--;
                }
                if (tile.neighboringBombCount === 0) {
                  const visited = new Set();
                  const queue = [index];
                  while (queue.length > 0) {
                    const index = queue.shift();
                    if (visited.has(index)) {
                      continue;
                    }
                    visited.add(index);
                    const tile = state.board[index];
                    if (tile.type === 'blank') {
                      tile.touchedBy = actor;
                      if (tile.neighboringBombCount === 0) {
                        queue.push(...getNeighbors(index, state));
                      }
                    }
                  }
                }
              }

              const playersStillAlive = Object.values(state.players).filter((p) => !p.hasTouchedBomb);
              if (playersStillAlive.length === 1) {
                state.winner = playersStillAlive[0].name;
              }

              if (!state.winner) {
                const untouchedTiles = state.board.filter((t) => !t.touchedBy);
                if (untouchedTiles.length === 0) {
                  state.winner = playersStillAlive.sort((a, b) => b.score - a.score)[0].name;
                }
              }

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

  server.send("join", { username: username.val });

  return div(
    { style: "position: relative;" },
    div(
      {
        style:
          () => `display: grid; grid-template-columns: repeat(${state.val.columnCount}, 1fr); grid-template-rows: repeat(${state.val.rowCount}, 1fr); width: 100%; aspect-ratio: 1; margin: 0 auto;`,
      },
      ...state.val.board.map((cell, i) => {
        return () =>
          state.val.board[i].touchedBy
            ? span(
              { style: () => `background-color: #ddd; text-align: center; display: flex; align-items: center; justify-content: center;` },
              cell.type === 'bomb' ? (state.val.players[cell.touchedBy].emoji + '⛳️') :
              cell.neighboringBombCount === 0 ? ' ' : cell.neighboringBombCount,
            ) : button({
              style: '',
              onclick: () => server.send("move", { index: i, action: 'reveal' }),
            });
      }),
    ),
    h4(
      { style: "text-align: center;" },
      "your emoji: ",
      () => state.val.players[username.val]?.emoji
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
    h4("players"),
    () => ul(...Object.values(state.val.players).map((p) => li(`${p.emoji} ${p.name}`)))
  );
};

van.add(
  document.getElementById("game-slot"),
  PreGameGate(() => Game())
);

van.add(document.getElementById("invite-slot"), InviteSlot());
