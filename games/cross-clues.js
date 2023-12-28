import {
  html,
  render,
} from "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js";
import { getGameServer } from "./utils/game-server.js";

/**
@typedef {{
    players: {
      [playerId: string]: {
      name: string,
      isHost: boolean,
      status: 'needs-to-give-clue' | 'needs-to-guess' | 'done',
        card?: {
          letterCord: string,
          numberCord: number,
          hint?: string,
        }
      }
    },
    board: {
      [letterCord: string]: {
        [numberCord: number]: {
          status: 'correct' | 'miss' | 'unsolved',
        }
      }
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
      letterCord: string,
      numberCord: number,
    }
  } Action
 */

/**
  @type {GameState}
 */
let initialState = {
  players: {},
  board: {},
};

const urlSearchParams = new URLSearchParams(
  window.location.search.split("?")?.[1] || ""
);
const params = Object.fromEntries(urlSearchParams.entries());
const username = localStorage.getItem("username") || "";
const lobbyId = params.lobbyId || "";
const isHost = window.localStorage.getItem(`isHost-${lobbyId}`) === "true";

const server = getGameServer({
  isHost,
  roomId: lobbyId,
  enabled: username && lobbyId,
  initialState: {
    players: [
      {
        name: username,
        isHost,
        status: "needs-to-give-clue",
      },
    ],
    board: {
      a: [],
      b: [],
      c: [],
      d: [],
      e: [],
    },
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
          [action.actor]: {},
        },
      };
    }
    if (action.type === "update") {
      return {
        ...state,
        board: action.board,
      };
    }
    if (action.type === "give-clue") {
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.name === action.player.name) {
            return {
              ...player,
              status: "needs-to-guess",
              card: action.card,
            };
          }
          return player;
        }),
      };
    }
    return state;
  },
  onStateChange(state) {
    console.log(state);
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

  return html`
    <h4>lobby: ${lobbyId}</h4>
    <h5>players:</h5>
    <ul>
      ${gameState.players.map((player) => html` <li>${player?.name}</li> `)}
    </ul>
  `;
}

function layout(children) {
  return html`
    <h1>cross clues</h1>
    ${children}
  `;
}

function update() {
  render(layout(ui()), document.body);
}

update();
