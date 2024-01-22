import van from "../deps/van.js";
import { reactive, list } from "../deps/van-x.js";
import { button, div, p, span } from "./utils/tags.js";
import { groupBy, wait, randomNumber, cancelable } from "./utils/random.js";
import { P2pState } from "./utils/p2p-state.js";
import { recursiveAssign } from "./utils/recursiveAssign.js";

let gate = cancelable();

const isDragging = van.state(false);
let windowWidth = () => window.innerWidth;
let windowHeight = () => window.innerHeight;
window.addEventListener("resize", () => {
  render();
});

/**
 * @param {Card} c
 */
function getKey(c) {
  return c.suit + c.value;
}

function cardHeight() {
  return document.querySelector(".card")?.clientHeight || 100;
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

const gameState = reactive(
  /** @type {State} */
  ({
    version: "0",
    players: [
      {
        name: "player1",
      },
      {
        name: "player2",
      },
      {
        name: "player3",
      },
    ],
    cards: genCards().reduce((acc, c) => {
      acc[getKey(c)] = {
        ...c,
        pileName: "deck",
        pileIndex: 0,
      };
      return acc;
    }, {}),
  })
);

/**
 * @param {State} state
 * @param {string} name
 * @returns {State['cards'][number][]}
 * */
function getPile(state, name) {
  return Object.values(state.cards).filter((c) => c.pileName === name);
}

const server = new P2pState(
  /** @type {ActionMap} */
  ({}),
  gameState,
  {
    isHost: true,
    roomId: "scum",
    actorUsername: "player1",
    onConnectionChange: (connected) => {},
    onStateChange: (state) => {
      if (state.version !== gameState.version) {
        recursiveAssign(gameState, state);
      }

      render();
    },
    actions: {
      join(state, payload, actor) {
        if (state.players.find((p) => p.name === payload.name)) {
          return state;
        }
        state.players.push({
          name: payload.name,
          didPass: false,
        });
        return state;
      },
      kick(state, payload, actor) {
        state.players = state.players.filter((p) => p.name !== payload.name);
        if (state.status === "pre-game") {
          return state;
        }

        let playerCards = Object.values(state.cards).filter((c) =>
          c.pileName.startsWith(`player-${payload.name}`)
        );

        for (let i = 0; i < playerCards.length; i++) {
          const card = playerCards[i];
          card.pileName = `player-${
            state.players[i % state.players.length].name
          }`;
        }

        return state;
      },
      pass(state, payload, actor) {
        if (state.turn !== actor) return state;

        const player = state.players.find((p) => p.name === actor);

        if (!player) return state;

        player.didPass = true;

        if (state.players.every((p) => p.didPass)) {
          state.players.forEach((p) => (p.didPass = false));
          const pile = getPile(state, "discard");
          pile.forEach((c) => (c.pileName = "removed"));
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
        const players = state.players.map((p) => p.name);
        // deal cards
        const shuffled = Object.values(state.cards).sort(
          () => Math.random() - 0.5
        );

        for (let i = 0; i < shuffled.length; i++) {
          const card = shuffled[i];
          card.pileName = `player-${players[i % players.length]}`;
        }

        state.status = "in-progress";
        return state;
      },
      play(state, payload, actor) {
        if (state.turn !== actor) return state;

        const player = state.players.find((p) => p.name === actor);

        if (!player) return state;

        if (player.didPass) return state;

        const pile = getPile(state, "discard").sort(
          (a, b) => a.value - b.value
        );
        let highestIndex = Math.max(...pile.map((c) => c.pileIndex));
        const size =
          pile.length === 0
            ? "any"
            : groupBy(pile, "value")[payload.cards[0].value];

        if (size !== "any" && payload.cards.length !== size.length)
          return state;

        for (const toPlay of payload.cards) {
          const card = state.cards[getKey(toPlay)];
          if (card.pileName !== `player-${actor}`) return state;
          card.pileName = "discard";
          card.pileIndex = ++highestIndex;
        }

        return state;
      },
    },
  }
);

const localState = reactive(
  /** @type {{
    cards: Record<string, { key: string; value: number, x: number, y: number, revealed: boolean, rotation: number, zIndex: number, selected: boolean }>
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
        zIndex: 0,
      };
      return acc;
    }, {}),
  })
);

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
 *   name: string,
 *   didPass: boolean,
 * }}
 *
 * @typedef ActionMap
 * @type {{
 *  join: { name: string },
 *  play: { cards: Card[] },
 *  pass: {},
 *  start: {},
 *  kick: { name: string },
 * }}
 *
 * @typedef {{
 *  version: string,
 *  status: 'pre-game' | 'in-progress' | 'finished',
 *  turn: string,
 *  players: Player[],
 *  cards: Record<string, Card & { pileName?: `player-${string}` | 'removed' | 'deck' | 'discard', pileIndex?: number }>,
 * }} State
 *
 */

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

// @ts-ignore
window.state = gameState;
// @ts-ignore
window.localState = localState;

async function render() {
  gate.cancel();
  gate = cancelable();
  const stacks = groupBy(Object.values(gameState.cards), "pileName");
  const stackKeys = Object.keys(stacks);
  console.log("stack keys", stackKeys);
  const cardWidth = document.querySelector(".card")?.clientWidth || 100;
  const middleOfScreenX = windowWidth() / 2 - cardWidth / 2;
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
        local.rotation = randomNumber(-360, 360);
      }
    }

    if (stackName.startsWith("player-")) {
      const player = stackName.slice("player-".length);
      const isMe = player === "player1";
      let sorted = cards.sort((a, b) => a.value - b.value);
      let zIndex = 0;
      if (isMe) {
        let y = windowHeight() - cardHeight() - 25;
        for (let i = 0; i < sorted.length; i++) {
          if (gate.isCanceled()) return;
          //   await wait(5);
          let card = sorted[i];
          const local = localState.cards[getKey(card)];
          let minX = 0;
          let maxX = windowWidth() - cardWidth;
          let dx = (maxX - minX) / sorted.length;
          local.x = minX + dx * i;
          local.y = y;
          local.revealed = true;
          local.zIndex = zIndex++;
          local.rotation = 0;
        }
      } else {
        for (let i = 0; i < sorted.length; i++) {
          if (gate.isCanceled()) return;
          //   await wait(5);
          const otherPlayers = gameState.players
            .filter((p) => p.name !== "player1")
            .map((p) => p.name);
          const playerIndex = otherPlayers.indexOf(player);
          const card = sorted[i];
          const local = localState.cards[getKey(card)];
          let userAreaWidth = windowWidth() / otherPlayers.length;
          local.x =
            userAreaWidth * playerIndex + userAreaWidth / 2 - cardWidth / 2;
          local.y = -0.5 * cardHeight() - 2 * i;
          local.revealed = false;
          local.zIndex = zIndex++;
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
        local.rotation = randomNumber(-360, 360);
      }
    }
  }
}

render();
async function runGame() {
  render();

  await wait(1000);
  // deal cards
  const cards = Object.values(gameState.cards);
  const shuffledCards = cards.sort(() => Math.random() - 0.5);
  let index = 0;
  while (shuffledCards.length) {
    for (const player of gameState.players) {
      const card = shuffledCards.pop();
      if (!card) break;
      card.pileName = `player-${player.name}`;
      card.pileIndex = index++;
    }
  }
  render();
}
runGame();

const playableCardsSet = van.derive(() => {
  if (gameState.turn !== "player1") {
      return new Set();
  }
  const hand = getPile(gameState, `player-player1`);
  const discardSetSize = getDiscardSetSize(gameState);
  const byValue = groupBy(hand, "value");

  const playable = new Set();
  for (const [_, cards] of Object.entries(byValue)) {
    if (cards.length >= discardSetSize) {
      cards.forEach((c) => playable.add(getKey(c)));
    }
  }
  return playable;
});

/**
 *
 * @param {State['cards'][number]} c
 * @returns
 */
function Card(c, covered = false) {
  const local = localState.cards[getKey(c)];

  return div(
    {
      "data-suite": () => c.suit,
      "data-value": () => c.value,
      "data-pile": () => c.pileName,
      class: () =>
        [
          "card",
          c.suit,
          local.revealed ? "revealed" : "",
          local.selected ? "selected" : "",
          playableCardsSet.val.has(getKey(c)) ? "playable" : "",
        ]
          .filter(Boolean)
          .join(" "),
      
      style: () => [
        `width: ${Math.max(windowWidth() / 20, 50)}px;`,
        `transform: translate(${local.x}px, ${local.y + (local.selected ? -(cardHeight()/3) : 0)}px) rotate(${local.rotation}deg);`,
        `z-index: ${local.zIndex};`,
      ].join(' '),
       
    },
    p(valueToCharacter(c.value)),
    p(suitToSymbol(c.suit))
  );
}

van.add(
  document.getElementById("game-slot"),
  list(
    () =>
      div({
        class: () => `game ${isDragging.val ? "dragging" : ""}`,
      }),
    gameState.cards,
    (c) => Card(c.val)
  )
);

const canPass = van.derive(() => {
  const player = gameState.players.find((p) => p.name === "player1");
  if (!player) return false;

  const hand = getPile(gameState, `player-${player.name}`);
  if (hand.length === 0) return false;

  return !player.didPass;
});

van.add(
  document.getElementById("game-slot"),
  list(
    () => div({ class: "player-area" }),
    gameState.players,
    (p) =>
      div(
        { class: "player", id: () => `player-${p.val.name}` },
        () => p.val.name
      )
  )
);

van.add(document.getElementById("game-slot"), () => {
  if (!canPass.val) {
    return span();
  } else {
    return button(
      {
        onclick: () => {
          server.send("pass", {});
        },
      },
      "pass"
    );
  }
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
  console.log("card", card);
  if (!card) {
    Object.values(localState.cards).forEach((c) => (c.selected = false));
    return;
  }
  const key = getKey(card);
  const clickedCardState = localState.cards[key];

  if (card.pileName !== "player-player1") return;

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
      gameState.cards[c.key].pileName = "discard";
      c.zIndex = discardPileSize++;
    });
    render();
    return;
  }

  let cardsOfValue =
    groupBy(getPile(gameState, "player-player1"), "value")[card.value] || [];
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

/**
 *
 * @param {State['cards'][string]} card
 */
function maybeRemoveDiscardPile(card) {
  if (!card) return;

  if (card.pileName === "discard") {
    Object.values(gameState.cards)
      .filter((c) => c.pileName === "discard")
      .forEach((c) => {
        c.pileName = "removed";
      });
    render();
  }
}

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
  maybeRemoveDiscardPile(card);
  selectOrPlay(card);
});
