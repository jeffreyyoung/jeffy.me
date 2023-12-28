import {
  html,
  render,
} from "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js";
import { getGameServer } from "./utils/game-server.js";
import { words } from "./cross-clues-words.js";
console.log(words);
/**
@typedef {{
    players: {
      [playerId: string]: {
        name: string,
        isHost: boolean,
        coord?: string,
      }
    },
    words: {
      [columnName: string]: string,
    },
    guesses: {
      [coord: string]: 'correct' | 'miss'
    }
  }} GameState


  @typedef {
    {
      type: 'join',
      actor: string,
    } | {
      type: 'give-clue',
      actor: string,
      clue: string
    } | {
      type: 'guess',
      actor: string,
      for: string,
      coord: string,
    }
  } Action
 */

/**
  @type {GameState}
 */

const urlSearchParams = new URLSearchParams(
  window.location.search.split("?")?.[1] || ""
);
const params = Object.fromEntries(urlSearchParams.entries());
const username = localStorage.getItem("username") || "";
const lobbyId = params.lobbyId || "";
const isHost = window.localStorage.getItem(`isHost-${lobbyId}`) === "true";

function wordGetter() {
  let usedWords = new Set();

  return () => {
    while (usedWords.size < words.length) {
      const word = words[Math.floor(Math.random() * words.length)];
      if (!usedWords.has(word)) {
        usedWords.add(word);
        return word;
      }
    }
    throw new Error("no more words");
    return;
  };
}

const getWord = wordGetter();

function getUsedCoordsSet(gameState = {}) {
  const playerCoords = Object.values(gameState?.players || {}).map(
    (player) => player.coord
  ).filter(Boolean);

  const coords = new Set([
    ...playerCoords,
    ...Object.keys(gameState?.guesses || {}),
  ]);

  return coords;
}
function getUnusedCoordCount(gameState) { 
  return 25 - getUsedCoordsSet(gameState).size;
}

function getUnusedCoord(gameState) {
  const coords = getUsedCoordsSet(gameState);
  while (coords.size < 25) {
    const letter = "ABCDE"[Math.floor(Math.random() * 5)];
    const number = Math.floor(Math.random() * 5) + 1;
    const coord = `${letter}${number}`;
    if (!coords.has(coord)) {
      return coord;
    }
  }
  return '';
}

const server = getGameServer({
  isHost,
  roomId: lobbyId,
  enabled: username && lobbyId,
  initialState: {
    players: {
      [username]: {
        name: username,
        isHost,
        coord: getUnusedCoord({}),
      },
    },
    words: {
      A: getWord(),
      B: getWord(),
      C: getWord(),
      D: getWord(),
      E: getWord(),
      1: getWord(),
      2: getWord(),
      3: getWord(),
      4: getWord(),
      5: getWord(),
    },
    guesses: {},
  },
  /**
   *
   * @param {*} state
   * @param {*} action
   * @returns typeof initialState
   */
  onAction(state, action) {
    if (action.type === "join") {
      return {
        ...state,
        players: {
          ...state.players,
          [action.actor]: {
            name: action.actor,
            isHost: false,
            coord: getUnusedCoord(state),
          },
        },
      };
    }
    if (action.type === "update") {
      return {
        ...state,
        board: action.board,
      };
    }
    console.log('action', action)
    if (action.type === "guess") {
      return {
        ...state,
        guesses: {
          ...state.guesses,
          [action.coord]: action.result,
        },
        players: {
          ...state.players,
          [action.actor]: {
            ...state.players[action.actor],
            coord: getUnusedCoord(state),
          },
        }
      };
    }

    return state;
  },
  onStateChange(state) {
    console.log('on state change', state);
    update();
  },
});

function ui() {
  if (!username) {
    return html`
      <form
        @submit=${(e) => {
          e.preventDefault();
          const username = e.target.username.value;
          localStorage.setItem("username", username.trim());
          // refresh page
          window.location = window.location;
        }}
      >
        <input
          type="text"
          name="username"
          value=${username}
          placeholder="Your username"
        />
        <button type="submit">Join</button>
      </form>
    `;
  }

  if (!lobbyId) {
    return html`
      <form @submit=${(e) => {}}>
        <h3>join a game</h3>
        <input type="text" name="lobbyId" placeholder="lobby code" />
        <button type="submit">join</button>
      </form>
      <form
        @submit=${(e) => {
          e.preventDefault();
          const gameId = Math.random().toString(36).substring(4);
          window.localStorage.setItem(`isHost-${gameId}`, true);
          window.location.href = `/games/cross-clues.html?lobbyId=${gameId}`;
        }}
      >
        <h3>host a game</h3>
        <button type="submit">create</button>
      </form>
    `;
  }
  let gameState = server.getLatestState();

  if (!gameState.players[username]) {
    server.send({
      type: "join",
      actor: username,
    });
  }

  function renderRows(gameState, rowLetter) {
    const actorState = gameState.players[username];
    return range(1, 5).map((number) => {
      const coord = `${rowLetter}${number}`;
      const myCoord = actorState?.coord;
      const isMyTile = myCoord === coord;
      const isGuessed = gameState.guesses[`${rowLetter}${number}`];
      return html`<td
        data-row="${rowLetter}"
        data-col="${number}"
        class="needs-guess ${isGuessed}"
      >
        ${isMyTile
          ? html` <div class="my-tile">this is your tile 🤫</div> `
          : html``}
        ${isGuessed === "correct" ? html`<div class="correct">✅</div>` : html``}
      </td>`;
    });
  }

  return html`
    <h4>lobby: ${lobbyId}</h4>
    <h5>players:</h5>
    <ul>
      ${Object.values(gameState.players || {}).map(
        (player) => html` <li>${player?.name}</li> `
      )}
    </ul>
    <p>tiles remaining: ${getUnusedCoordCount(gameState)}</p>

    <h5>board:</h5>
    <table>
      <tr>
        <th></th>
        <th>
          1
          <div><small>${gameState.words["1"]}</small></div>
        </th>
        <th>
          2
          <div><small>${gameState.words["2"]}</small></div>
        </th>
        <th>
          3
          <div><small>${gameState.words["3"]}</small></div>
        </th>
        <th>
          4
          <div><small>${gameState.words["4"]}</small></div>
        </th>
        <th>
          5
          <div><small>${gameState.words["5"]}</small></div>
        </th>
      </tr>
      <tr>
        <th>
          A
          <div><small>${gameState.words["A"]}</small></div>
        </th>
        ${renderRows(gameState, "A")}
      </tr>
      <tr>
        <th>
          B
          <div><small>${gameState.words["B"]}</small></div>
        </th>
        ${renderRows(gameState, "B")}
      </tr>
      <tr>
        <th>
          C
          <div><small>${gameState.words["C"]}</small></div>
        </th>
        ${renderRows(gameState, "C")}
      </tr>
      <tr>
        <th>
          D
          <div><small>${gameState.words["D"]}</small></div>
        </th>
        ${renderRows(gameState, "D")}
      </tr>
      <tr>
        <th>
          E
          <div><small>${gameState.words["E"]}</small></div>
        </th>
        ${renderRows(gameState, "E")}
      </tr>
    </table>
    ${gameState.players[username]?.coord
      ? html`
          <h5>give a clue</h5>
          <p>
            your tile is
            <strong>${gameState.players[username]?.coord}</strong>
          </p>
          <p>
            announce a 1 word clue to your team that relates to the two words of your tile.  if your team guesses your tile correctly, click "correct".  If they guess incorrectly, click "miss".
          </p>
          <button @click=${() => server.send({
            type: 'guess',
            actor: username,
            coord: gameState.players[username]?.coord,
            result: 'correct',
          })}>correct</button>
          <button @click=${() => server.send({
            type: 'guess',
            actor: username,
            coord: gameState.players[username]?.coord,
            result: 'miss',
          })}>miss</button>
        `
      : html``}
  `;
}

function layout(children) {
  return html`
    <a href="/">home</a>
    <h1>cross clues</h1>
    ${children}
  `;
}

function update() {
  render(layout(ui()), document.body);
}

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

update();
