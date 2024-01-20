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
  /** @type {Record<string, { x: number, y: number, revealed: boolean, rotation: number, zIndex: number, selected: boolean }>} */
  (
    genCards().reduce((acc, c) => {
      acc[getKey(c)] = {
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
const isDragging = van.state(false)
const windowWidth = van.state(window.innerWidth);
const windowHeight = van.state(window.innerHeight);
window.addEventListener("resize", () => {
  windowWidth.val = window.innerWidth;
  windowHeight.val = window.innerHeight;
  render();
});

function render() {
  const stacks = groupBy(Object.values(gameState.cards), "pileName");
  const stackKeys = Object.keys(stacks);

  console.log("stack keys", stackKeys);
  const cardWidth = document.querySelector(".card")?.clientWidth || 100;
  const middleOfScreenX = windowWidth.val / 2 - cardWidth;
  const middleOfScreenY = windowHeight.val / 2 - cardHeight();
  let timeOut = 0;
  let handIndex = 0;
  for (const [stackName, cards] of Object.entries(stacks)) {
    if (stackName === "deck") {
      for (const card of cards) {
        setTimeout(() => {
          const local = localState[getKey(card)];
          local.x = middleOfScreenX;
          local.y = middleOfScreenY;
          local.revealed = false;
          local.rotation = randomNumber(-360, 360);
        }, ++timeOut * 7);
      }
    }

    if (stackName.startsWith("player-hand#")) {
      const player = stackName.split("#")[1];
      const isMe = player === "player1";
      let sorted = cards.sort((a, b) => a.value - b.value);
      let zIndex = 0;
      for (let i = 0; i < sorted.length; i++) {
        let card = sorted[i];
        const local = localState[getKey(card)];
        // if is me
        let minX = 0;
        let maxX = windowWidth.val - cardWidth;
        let y = windowHeight.val - cardHeight() - 15;
        if (!isMe) {
          const otherPlayers = gameState.players
            .map((p) => p.name)
            .filter((p) => p !== "player1");
          const numHands = otherPlayers.length;
          console.log("numHands", numHands);
          const handWidth = windowWidth.val / numHands;
          minX = handWidth * otherPlayers.indexOf(player);
          maxX = minX + handWidth - handWidth / 1.2; // 30 for padding
          y = 15;
        }
        let dx = (maxX - minX) / sorted.length;
        local.x = minX + dx * i;
        const rx = 30 / sorted.length;
        //   local.rotation = -15 + i * rx;
        local.rotation = 0;
        local.y = y;
        local.revealed = isMe;
        local.zIndex = zIndex++;
        handIndex++;
      }

      // align cards at bottom of screen
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
        `transform: translate(${local.x}px, ${
          local.y + (local.selected ? -(cardHeight() / 3) : 0)
        }px) rotate(${local.rotation}deg); z-index: ${local.zIndex}`,
    },
    p(valueToCharacter(c.value)),
    p(suitToSymbol(c.suit))
  );
}

van.add(
  document.getElementById("game-slot"),
  list(() => div({
    class: () => `game ${isDragging.val ? 'dragging' : ''}`,
  }), gameState.cards, (c) => Card(c.val))
);


/**
 *
 * @param {State['cards'][string]} card
 */
function maybeSelectCard(card) {
  const key = getKey(card);
  const local = localState[key];

  if (card.pileName !== "player-hand#player1") return;

  if (!local.selected) {
    // clear selected
    Object.entries(localState).forEach(([k, v]) => {
      if (v.selected && gameState.cards[k].value !== card.value) {
        v.selected = false;
      }
    });
  }

  local.selected = !local.selected;
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




function onDragStart(target) {
    isDragging.val = false;
}

function onDrag(x, y) {
    isDragging.val = true;
  Object.entries(localState)
    .filter(([k, v]) => v.selected)
    .forEach(([k, v]) => {
      v.x = x;
      v.y = y;
    });
}

function onDragEnd(target) {
    if (!isDragging.val) {
        const card = getCardFromTarget(target);
        if (card) {
            maybeSelectCard(card);
        }
    }
    isDragging.val = false;
  // maybe do something?

  render();
}
const gameEl = document.getElementById("game-slot");

let isMouseDown = false;
gameEl.addEventListener("mousedown", (e) => {
    isMouseDown = true;
  onDragStart(e.target);
});

gameEl.addEventListener("mouseup", (e) => {
    isMouseDown = false;
    onDragEnd(e.target);
});

gameEl.addEventListener("mousemove", (e) => {
    if (isMouseDown && e.clientY < (windowHeight.val - cardHeight()-20)) {
        onDrag(e.clientX, e.clientY);
    }
});

gameEl.addEventListener('touchstart', (e) => {
    onDragStart(e.target);
});

gameEl.addEventListener('touchmove', (e) => {
    onDrag(e.touches[0].clientX, e.touches[0].clientY);
});

gameEl.addEventListener('touchend', (e) => {
    onDragEnd(e.target);
});