import van from "../deps/van.js";
import { reactive, list, calc } from "../deps/van-x.js";
import { div, p, tr } from "./utils/tags.js";
import { css } from "./utils/css.js";
import { randomItem } from "./utils/random.js";
console.log("here");

const windowWidth = van.state(window.innerWidth);
const windowHeight = van.state(window.innerHeight);
window.addEventListener("resize", () => {
  windowWidth.val = window.innerWidth;
  windowHeight.val = window.innerHeight;
});

/**
 *
 * @param {Card} c
 */
function getKey(c) {
  return c.suit + c.value;
}

/**
 *
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

const state = reactive(
  /** @type {State} */
  ({
    players: [],
    cards: genCards().reduce((acc, c) => {
      acc[getKey(c)] = {
        ...c,
      };
      return acc;
    }, {}),
  })
);

const transforms = reactive(
  /** @type {Record<string, { x: number, y: number }>} */
  (
    genCards().reduce((acc, c) => {
      acc[getKey(c)] = {
        x: 0,
        y: 0,
      };
      return acc;
    }, {})
  )
);

const local = reactive({
  hand: calc(() => Object.values(state.cards)),
  discardPile: calc(() => Object.values(state.cards)),
});

console.log("game slot", document.getElementById("game-slot"));
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
 *  cards: Record<string, Card>,
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

setInterval(() => {
  const randomKey = randomItem(Object.keys(state.cards));
  transforms[randomKey] = {
    x: Math.random() * windowWidth.val - 100,
    y: Math.random() * windowHeight.val - 100,
  };
}, 100);

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
 *
 * @param {Card} c
 * @returns
 */
function Card(c, covered = false) {
  return div(
    {
      class: () => `card ${c.suit} ${covered ? "" : "revealed"}`,
      style: () => {
        console.log("update style!");
        const transform = transforms[c.suit + c.value];
        if (!transform) {
          return "";
        }
        return `transform: translate(${transform.x}px, ${transform.y}px)`;
      },
    },
    p(valueToCharacter(c.value)),
    p(suitToSymbol(c.suit))
  );
}

const myHand = document.querySelector("#my-hand");
const pile = document.querySelector("#pile");

console.log({
  pile,
  myHand,
});

van.add(
  document.getElementById("game-slot"),
  list(
    () => div({ id: "discard-pile", class: "pile" }),
    local.discardPile,
    (c) => Card(c.val, true)
  ),
  list(
    () => div({ id: "my-hand", class: "hand" }),
    local.hand,
    (c) => Card(c.val)
  )
);
css`
  .typewriter-cursor {
    animation: blink 1s infinite;
    font-weight: bold;
    font-size: 1.2em;
    color: #333;
    margin-left: 4px;
  }

  @keyframes blink {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
`;

function getTypewriterAction(currentValue, targetValue) {
  if (currentValue === targetValue) {
    return { action: "noop" };
  }
  if (currentValue.length > targetValue.length) {
    return { action: "delete" };
  }
  let mismatchIndex = -1;
  for (let i = 0; i < currentValue.length; i++) {
    if (currentValue[i] !== targetValue[i]) {
      mismatchIndex = i;
      break;
    }
  }

  if (mismatchIndex === -1) {
    return { action: "add", value: targetValue[currentValue.length] };
  }

  if (mismatchIndex < currentValue.length) {
    return { action: "delete" };
  }

  return { action: "add", value: targetValue[currentValue.length] };
}
// Array.from(document.querySelectorAll('code[data-class] > div[data-tag] > span[data-id] > i')).map(n => n.getAttribute('value')).join('')
// https://wgg522pwivhvi5gqsn675gth3q0otdja.lambda-url.us-east-1.on.aws/616e67'
// angelic
