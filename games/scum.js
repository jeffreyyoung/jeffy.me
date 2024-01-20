import van from "../deps/van.js";
import { reactive, list } from "../deps/van-x.js";
import { div, p } from "./utils/tags.js";
import { groupBy, wait, randomNumber } from "./utils/random.js";

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

const localState = reactive(
  /** @type {Record<string, { key: string; value: number, x: number, y: number, revealed: boolean, rotation: number, zIndex: number, selected: boolean }>} */
  (
    genCards().reduce((acc, c) => {
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
    }, {})
  )
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
 * }}
 *
 * @typedef {{
 *  players: Player[],
 *  cards: Record<string, Card & { pileName?: string, pileIndex?: number }>,
 * }} State
 *
 * @typedef {{
 *   action: 'join'
 * } | {
 *   action: 'play',
 *   cards: Card[],
 * } | {
 *   action: 'pass',
 * }} Actions
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

// setInterval(() => {
//   const randomKey = randomItem(Object.keys(gameState.cards));
//   Object.assign(localState[randomKey], {
//     revealed: !localState[randomKey].revealed,
//     x: Math.random() * windowWidth.val - 100,
//     y: Math.random() * windowHeight.val - 100,
//   });
// }, 30);

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
const isDragging = van.state(false);
const windowWidth = van.state(window.innerWidth);
const windowHeight = van.state(window.innerHeight);
window.addEventListener("resize", () => {
  windowWidth.val = window.innerWidth;
  windowHeight.val = window.innerHeight;
  render();
});

function cancelable() {
  let isCanceled = false;

  return {
    cancel() {
      isCanceled = true;
    },
    isCanceled() {
      return isCanceled;
    },
  };
}

let iter = cancelable();

async function render() {
  iter.cancel();
  iter = cancelable();
  const stacks = groupBy(Object.values(gameState.cards), "pileName");
  const stackKeys = Object.keys(stacks);

  console.log("stack keys", stackKeys);
  const cardWidth = document.querySelector(".card")?.clientWidth || 100;
  const middleOfScreenX = windowWidth.val / 2 - cardWidth;
  const middleOfScreenY = windowHeight.val / 2 - cardHeight();
  let timeOut = 0;
  let handIndex = 0;
  for (const [stackName, cards] of Object.entries(stacks)) {
    if (iter.isCanceled()) return;

    if (stackName === "deck") {
      if (iter.isCanceled()) {return;}
      for (const card of cards) {
        await wait(5);
        if (iter.isCanceled()) return;
        const local = localState[getKey(card)];
        local.x = middleOfScreenX;
        local.y = middleOfScreenY;
        local.revealed = false;
        local.rotation = randomNumber(-360, 360);
      }
    }

    if (stackName.startsWith("player-hand#")) {
      const player = stackName.split("#")[1];
      const isMe = player === "player1";
      let sorted = cards.sort((a, b) => a.value - b.value);
      let zIndex = 0;
      if (isMe) {
        for (let i = 0; i < sorted.length; i++) {
            if (iter.isCanceled()) return;
            await wait(5);
            let card = sorted[i];
            const local = localState[getKey(card)];
            let minX = 0;
            let maxX = windowWidth.val - cardWidth;
            let dx = (maxX - minX) / sorted.length;
            local.x = minX + dx * i;
            local.y = windowHeight.val - cardHeight() - 15;
            local.revealed = true;
            local.zIndex = zIndex++;
            local.rotation = 0;
        }
      } else {
        for (let i = 0; i < sorted.length; i++) {
            if (iter.isCanceled()) return;
            await wait(5);
            const otherPlayers = gameState.players.filter((p) => p.name !== "player1").map((p) => p.name);
            const playerIndex = otherPlayers.indexOf(player);
            const card = sorted[i];
            const local = localState[getKey(card)];
            let userAreaWidth = windowWidth.val / otherPlayers.length;
            local.x = userAreaWidth * playerIndex + userAreaWidth / 2 - cardWidth / 2;
            local.y = cardHeight()/2-(2*i);
            local.revealed = false;
            local.zIndex = zIndex++;
            local.rotation = 0;
        }
      }
      // align cards at bottom of screen
    }

    if (stackName === "discard") {
      for (let i = 0; i < cards.length; i++) {
        if (iter.isCanceled()) return;
        await wait(5);
        let card = cards[i];
        const local = localState[getKey(card)];
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
        if (iter.isCanceled()) return;
        await wait(5);
        const local = localState[getKey(card)];
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
      card.pileName = "player-hand#" + player.name;
      card.pileIndex = index++;
    }
  }
  render();
}
runGame();

/**
 *
 * @param {Card} c
 * @returns
 */
function Card(c, covered = false) {
  const local = localState[getKey(c)];

  return div(
    {
      "data-suite": () => c.suit,
      "data-value": () => c.value,
      class: () =>
        `card ${c.suit} ${local.revealed ? "revealed" : ""} ${
          local.selected ? "selected" : ""
        }}`,
      style: () =>
        `
        width: ${Math.max(windowWidth.val / 20, 50)}px;
        transform:
            translate(${local.x}px, ${
          local.y + (local.selected ? -(cardHeight() / 3) : 0)
        }px)
            rotate(${local.rotation}deg);
        z-index: ${local.zIndex}`,
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

/**
 *
 * @param {State['cards'][string]} card
 */
function selectOrPlay(card) {
  const key = getKey(card);
  const clickedCardState = localState[key];

  if (card.pileName !== "player-hand#player1") return;

  let curSelected = Object.values(localState).filter((c) => c.selected);

  if (!clickedCardState.selected) {
    Object.values(localState)
      .filter((c) => c.selected && c.value !== clickedCardState.value)
      .forEach((c) => (c.selected = false));
    clickedCardState.selected = true;
  } else {
    const discardSize = Object.values(gameState.cards).filter(
      (c) => c.pileName === "discard"
    ).length;
    Object.values(localState)
      .filter((c) => c.selected)
      .forEach((local, index) => {
        local.zIndex = discardSize + 1 + index;
        local.selected = false;
        gameState.cards[local.key].pileName = "discard";
      });
    render();
    // move to deck
  }
}

/**
 *
 * @param {State['cards'][string]} card
 */
function maybeRemoveDiscardPile(card) {
  if (card.pileName === "discard") {
    Object.values(gameState.cards)
      .filter((c) => c.pileName === "discard")
      .forEach((c) => {
        c.pileName = "removed";
      });
    render();
  }
}

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

document.getElementById("game-slot").addEventListener("click", (e) => {
  const card = getCardFromTarget(e.target);
  if (!card) return;
  console.log("card clicked!", card.pileName);
  maybeRemoveDiscardPile(card);
  selectOrPlay(card);
});
