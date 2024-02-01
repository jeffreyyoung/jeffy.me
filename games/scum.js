import van from "../deps/van.js";
import { reactive, list, stateFields } from "../deps/van-x.js";
import { button, div, h4, li, p, ul } from "./utils/tags.js";
import {
  groupBy,
  wait,
  randomNumber,
  cancelable,
  randomItem,
} from "./utils/random.js";
import { recursiveAssign } from "./utils/recursiveAssign.js";
import { Game } from "./utils/p2p/Game.js";

/**
 * @typedef Card
 * @type {{
 *    suit: 'spades' | 'hearts' | 'clubs' | 'diamonds',
 *    value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
 * }}
 *
 *
 * @typedef Player
 * @type {{
 *   id: string,
 *   isHost: boolean,
 *   name: string,
 *   didPass: boolean,
 * }}
 *
 * @typedef ActionMap
 * @type {{
 *  play: { cards: string[] },
 *  pass: {},
 *  start: {},
 *  kick: { id: string },
 * }}
 *
 * @typedef {{
 *  version: string,
 *  status: 'pre-game' | 'in-progress' | 'finished',
 *  turn: string,
 *  turnSetSize: number;
 *  turnMinCardValue: number;
 *  players: Player[],
 *  cards: Record<string, Card & { pileName?: `player-${string}` | 'removed' | 'deck' | 'discard', pileIndex?: number  }>,
 * }} State
 *
 */

const suits = ["spades", "hearts", "clubs", "diamonds"];

/**
 *
 * @param {Card['suit']} suit
 * @returns
 */
function suitToSymbol(suit) {
  switch (suit) {
    case "spades":
      return "♠";
    case "hearts":
      return "♥";
    case "clubs":
      return "♣";
    case "diamonds":
      return "♦";
  }
}

/**
 *
 * @param {Card['value']} value
 */
function valueToCharacter(value) {
  switch (value) {
    case 1:
      return "A";
    case 11:
      return "J";
    case 12:
      return "Q";
    case 13:
      return "K";
    default:
      return value.toString();
  }
}

/**
 * @param {Card} c
 */
function getKey(c) {
  return c.suit + c.value;
}

/**
 * @returns {Card[]}
 */
function genCards() {
  const cards = [];
  /** @type {Card['suit'][]} */
  const suits = ["spades", "hearts", "clubs", "diamonds"];
  for (const suit of suits) {
    for (let i = 1; i <= 13; i++) {
      cards.push({
        suit,
        value: i,
      });
    }
  }
  // @ts-ignore
  return cards;
}
/** @type {State} */
const initial = {
  turn: "",
  version: "0",
  status: "pre-game",
  turnMinCardValue: 0,
  turnSetSize: 0,
  players: [],
  cards: genCards().reduce((acc, c) => {
    acc[getKey(c)] = {
      ...c,
      pileName: "deck",
      pileIndex: 0,
    };
    return acc;
  }, {}),
};

const gameState = reactive(
  /** @type {State} */
  (JSON.parse(JSON.stringify(initial)))
);

/**
 * @param {State} gameState
 * @param {string} name
 * @returns {State['cards'][number][]}
 * */
function getPile(gameState, name) {
  return Object.values(gameState.cards).filter((c) => c.pileName === name);
}

const server = new Game(
  initial,
  /** @type {ActionMap} */
  ({}),

  {
    actions: {
      syncUsers(state, payload, actor, { room }) {
        for (const user of room.users) {
          if (!state.players.find((p) => p.id === user.id)) {
            state.players.push({
              id: user.id,
              isHost: user.isHost,
              name: user.name,
              didPass: false,
            });
          }
        }
        return state;
      },
      kick(state, payload, actor) {
        state.players = state.players.filter((p) => p.id !== payload.id);
        if (state.status === "pre-game") {
          return state;
        }

        let playerCards = Object.values(state.cards).filter((c) =>
          c.pileName.startsWith(`player-${payload.id}`)
        );

        for (let i = 0; i < playerCards.length; i++) {
          const card = playerCards[i];
          card.pileName = `player-${
            state.players[i % state.players.length].id
          }`;
        }

        return state;
      },
      pass(state, payload, actor) {
        console.log("passing");
        if (state.turn !== actor) return state;

        const player = state.players.find((p) => p.id === actor);

        if (!player) return state;

        player.didPass = true;

        if (state.players.every((p) => p.didPass)) {
          state.players.forEach((p) => (p.didPass = false));
          const pile = getPile(state, "discard");
          pile.forEach((c) => (c.pileName = "removed"));
          state.turnMinCardValue = 0;
          state.turnSetSize = 0;
          state.turn = actor;
        } else {
          // get next player
          const playerIndex = state.players.findIndex((p) => p.name === actor);
          while (true) {
            const nextPlayerIndex = (playerIndex + 1) % state.players.length;
            const nextPlayer = state.players[nextPlayerIndex];
            if (!nextPlayer.didPass) {
              state.turn = nextPlayer.name;
              break;
            }
          }
        }

        return state;
      },
      start(state, payload, actor) {
        const players = state.players.map((p) => p.id);

        if (players.length === 0) {
          return;
        }
        // deal cards
        const shuffled = Object.values(state.cards).sort(
          () => Math.random() - 0.5
        );

        for (let i = 0; i < shuffled.length; i++) {
          const card = shuffled[i];
          card.pileName = `player-${players[i % players.length]}`;
        }

        state.status = "in-progress";
        state.turn = randomItem(players);
        state.turnMinCardValue = 0;
        state.turnSetSize = 0;
        return state;
      },
      play(state, payload, actor) {
        let cards = payload.cards.map((c) => state.cards[c]);
        if (state.turn !== actor) return state;

        const player = state.players.find((p) => p.id === actor);

        if (!player) return state;

        if (player.didPass) return state;

        if (cards.length === 0) {
          return state;
        }
        if (!cards.every((c) => c.value > state.turnMinCardValue)) {
          return state;
        }

        if (state.turnSetSize > 0 && cards.length !== state.turnSetSize) {
          return state;
        }
        if (state.turnSetSize === 0) {
          state.turnSetSize = cards.length;
        } else if (cards.length !== state.turnSetSize) {
          return state;
        }

        state.turnMinCardValue = cards[0].value;

        const pile = getPile(state, "discard");

        let highestIndex = Math.max(...pile.map((c) => c.pileIndex), 0);

        for (const toPlay of cards) {
          const card = state.cards[getKey(toPlay)];
          card.pileName = "discard";
          card.pileIndex = ++highestIndex;
        }

        return state;
      },
    },
  }
);

server.onStateChange((state) => {
  console.log("here", gameState);
  recursiveAssign(gameState, state);
  render();
});

const localState = reactive(
  /** @type {{
    cards: Record<string, { key: string; value: number, x: number, y: number, revealed: boolean, rotation: number, selected: boolean, playable: boolean }>
  }} */
  ({
    cards: genCards().reduce((acc, c) => {
      acc[getKey(c)] = {
        key: getKey(c),
        value: c.value,
        x: 0,
        y: 0,
        rotation: 0,
        revealed: false,
        selected: false,
        playable: false,
      };
      return acc;
    }, {}),
  })
);

// @ts-ignore
window.state = gameState;
// @ts-ignore
window.localState = localState;

function cardHeight() {
  return document.querySelector(".card")?.clientHeight || 100;
}
const cardWidth = () => document.querySelector(".card")?.clientWidth || 100;
let windowWidth = () => window.innerWidth;
let windowHeight = () => window.innerHeight;
/**
 * @param {State} state
 * @param {string} id
 * @returns {number}
 * */
function getPlayerX(state, id) {
  const otherPlayers = state.players
    .filter((p) => p.id !== server.userId)
    .map((p) => p.id);
  let userAreaWidth = windowWidth() / otherPlayers.length;
  const playerIndex = otherPlayers.indexOf(id);
  return userAreaWidth * playerIndex + userAreaWidth / 2 - cardWidth() / 2;
}

let gate = cancelable();
async function render() {
  gate.cancel();
  gate = cancelable();
  const stacks = groupBy(Object.values(gameState.cards), "pileName");
  const stackKeys = Object.keys(stacks);
  console.log("stack keys", stackKeys);
  const middleOfScreenX = windowWidth() / 2 - cardWidth() / 2;
  const middleOfScreenY = windowHeight() / 2 - cardHeight();

  for (const [_stackName, cards] of Object.entries(stacks)) {
    console.log("rendering", _stackName, cards);
    /** @type {State['cards'][number]['pileName']} */
    // @ts-ignore
    const stackName = _stackName;
    if (gate.isCanceled()) return;

    if (stackName === "deck") {
      if (gate.isCanceled()) {
        console.log("is canceled");
      }
      for (const card of cards) {
        await wait(5);
        if (gate.isCanceled()) return;
        const local = localState.cards[getKey(card)];
        local.x = middleOfScreenX;
        local.y = middleOfScreenY;
        local.revealed = false;
        local.playable = false;
        local.rotation = randomNumber(-360, 360);
      }
    }

    if (stackName.startsWith("player-")) {
      const player = stackName.slice("player-".length);
      const isMe = player === server.userId;
      let sorted = cards.sort((a, b) => a.value - b.value);
      const minX = 0;
      const maxX = windowWidth() - cardWidth();
      const dx = (maxX - minX) / sorted.length;
      let zIndex = 0;
      if (isMe) {
        // check if is playable
        const valueToCount = groupBy(cards, "value");
        let y = windowHeight() - cardHeight() - 36;
        for (let i = 0; i < sorted.length; i++) {
          if (gate.isCanceled()) return;
          //   await wait(5);
          let card = sorted[i];
          const local = localState.cards[getKey(card)];
          local.x = minX + i * dx;
          local.y = y;
          local.playable =
            card.value > gameState.turnMinCardValue &&
            (gameState.turnSetSize === 0 ||
              valueToCount[card.value].length >= gameState.turnSetSize);
          console.log("calculate playable");
          local.revealed = true;
          local.rotation = 0;
        }
      } else {
        for (let i = 0; i < sorted.length; i++) {
          if (gate.isCanceled()) return;
          const card = sorted[i];
          const local = localState.cards[getKey(card)];
          local.x = getPlayerX(gameState, player);
          local.y = -0.5 * cardHeight() - 2 * i;
          local.revealed = false;
          local.playable = false;
          local.rotation = 0;
        }
      }
      // align cards at bottom of screen
    }

    if (stackName === "discard") {
      for (let i = 0; i < cards.length; i++) {
        if (gate.isCanceled()) return;
        // await wait(5);
        let card = cards[i];
        const local = localState.cards[getKey(card)];
        local.x = middleOfScreenX;
        local.y = middleOfScreenY;
        local.revealed = true;
        local.playable = false;
        if (local.rotation === 0) {
          local.rotation = randomNumber(-360, 360);
        }
      }
    }

    if (stackName === "removed") {
      for (const card of cards) {
        if (gate.isCanceled()) return;
        // await wait(5);
        const local = localState.cards[getKey(card)];
        local.x = middleOfScreenX * 4;
        local.y = middleOfScreenY * -3;
        local.revealed = true;
        local.playable = false;
        local.rotation = randomNumber(-360, 360);
      }
    }
  }
}

window.addEventListener("resize", () => {
  render();
});

/**
 *
 * @param {State} gameState
 */
function getDiscardSetSize(gameState) {
  const discardPile = getPile(gameState, "discard");
  if (discardPile.length === 0) {
    return 0;
  }

  return groupBy(discardPile, "value")[discardPile[0].value].length || 0;
}

/**
 *
 * @param {State['cards'][string] | undefined} card
 */
function selectOrPlay(card) {
  if (!card) {
    Object.values(localState.cards).forEach((c) => (c.selected = false));
    return;
  }
  console.log("selectOrPlay", card);
  const key = getKey(card);
  const clickedCardState = localState.cards[key];

  if (!clickedCardState.playable) return;

  if (card.pileName !== "player-" + server.userId) return;

  let curSelected = Object.values(localState.cards).filter((c) => c.selected);

  // deselect all other card types
  Object.values(localState.cards)
    .filter((c) => c.value !== card.value)
    .forEach((c) => (c.selected = false));

  if (clickedCardState.selected) {
    let discardPileSize = getPile(gameState, "discard").length;
    // if a selected card was clicked, play it
    curSelected.forEach((c) => {
      c.selected = false;
    });

    server.action("play", {
      cards: curSelected.map((c) => c.key),
    });
    return;
  }

  let cardsOfValue =
    groupBy(getPile(gameState, "player-" + server.userId), "value")[
      card.value
    ] || [];
  let discardSetSize = getDiscardSetSize(gameState);

  if (cardsOfValue.length < discardSetSize) {
    // doesn't have enough of this type to select it
    return;
  }

  if (discardSetSize === 0) {
    // no discard pile, so just select this card
    localState.cards[getKey(card)].selected = true;
    render();
    return;
  }

  // select $discardSetSize cards of this type
  cardsOfValue.forEach((c) => {
    localState.cards[getKey(c)].selected = false;
  });

  let cardsToSelect = [
    card,
    ...cardsOfValue
      .filter((c) => c.suit !== card.suit)
      .slice(0, discardSetSize - 1),
  ];

  cardsToSelect.forEach((c, i) => {
    localState.cards[getKey(c)].selected = true;
  });

  render();
}

const turn = stateFields(gameState).turn;

/**
 *
 * @param {*} target
 * @returns {State['cards'][string] | undefined}
 */
function getCardFromTarget(target) {
  if (!(target instanceof HTMLElement)) return;

  const cardEl = target.closest(".card");
  if (!cardEl) return;

  const value = cardEl.getAttribute("data-value");
  const suit = cardEl.getAttribute("data-suite");

  if (!value || !suit) return;
  const key = suit + value;
  const card = gameState.cards[key];
  return card;
}

document.querySelector("body").addEventListener("click", (e) => {
  const card = getCardFromTarget(e.target);
  selectOrPlay(card);
});

/**
 *
 * @param {State['cards'][number]} c
 * @returns
 */
function Card(c) {
  const local = localState.cards[getKey(c)];
  console.log("rendering card");
  return div(
    {
      "data-suite": () => c.suit,
      "data-value": () => c.value,
      "data-pile": () => c.pileName,
      class: () =>
        [
          turn.val ? "" : "",
          "card",
          c.suit,
          local.revealed ? "revealed" : "",
          local.selected ? "selected" : "",
          local.playable && turn.val === server.userId ? "playable" : "",
        ]
          .filter(Boolean)
          .join(" "),

      style: () =>
        [
          `width: ${Math.max(windowWidth() / 20, 50)}px;`,
          `transform: translate(${local.x}px, ${
            local.y + (local.selected ? -(cardHeight() / 2) : 0)
          }px) rotate(${local.rotation}deg);`,
          `z-index: ${c.value * 10 + suits.indexOf(c.suit)};`,
        ].join(" "),
    },
    p(valueToCharacter(c.value)),
    p(suitToSymbol(c.suit))
  );
}

const canPass = van.derive(() => {
  const player = gameState.players.find((p) => p.id === server.userId);
  if (!player) return false;

  const hand = getPile(gameState, `player-${player.id}`);
  if (hand.length === 0) return false;

  return !player.didPass;
});

const status = stateFields(gameState).status;
van.add(
  document.getElementById("game-slot"),
  div(
    list(
      () =>
        div({
          class: () => `game`,
        }),
      gameState.cards,
      (c) => Card(c.val)
    ),
    list(
      () => div({ class: "player-area" }),
      gameState.players,
      (player, _, i) =>
        h4(
          {
            class: "player",
            id: () => `player-${player.val.id}`,
            style: () =>
              [
                `transform: translate(${getPlayerX(
                  gameState,
                  player.val.id
                )}, 8px);`,
                status.val === "pre-game" || player.val.id === server.userId
                  ? "display: none;"
                  : "",
                `left: ${(windowWidth() / gameState.players.length) * i}px;`,
              ].join(" "),
          },
          () => player.val.name
        )
    ),
    div(
      {
        class: "controls",
        style:
          "position: absolute; bottom: 12px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 3; flex-direction: column;",
      },
      h4(
        {
          style: () =>
            [
              "margin: 0;",
              status.val === "pre-game" ? "" : "display: none;",
            ].join(" "),
        },
        "players"
      ),
      list(
        () =>
          ul({
            style: () =>
              "list-style-type: none; margin: 0; padding: 0; margin-bottom: 12px;" +
              (status.val === "pre-game" ? "" : "display: none;"),
          }),
        gameState.players,
        (player) => li(player.val.name)
      ),
      button(
        {
          style: () =>
            [
              status.val === "pre-game" &&
              gameState.players.find((p) => p.id === server.userId)?.isHost
                ? ""
                : "display: none;",
            ].join(" "),
          onclick: () => server.action("start", {}),
        },
        "start"
      ),
      button(
        {
          style: () => [canPass.val ? "" : "display: none;"].join(" "),
          onclick: () => server.action("pass", {}),
        },
        "pass"
      )
    )
  )
);
