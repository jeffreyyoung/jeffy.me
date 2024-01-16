import { html, render } from "https://cdn.jsdelivr.net/npm/lit-html@3.0.2/lit-html.min.js";
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
 *   hand: Card[],
 * }}
 *
 * @typedef {{
 *  players: Player[],
 *  deck: Card[],
 *  discard: Card[],
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
  return html`
    <div class="card ${c.suit} ${covered ? 'covered' : ''}" draggable="true">
      <p>${valueToCharacter(c.value)}</p>
      <p>${suitToSymbol(c.suit)}</p>
    </div>
  `;
}

const myHand = document.querySelector("#my-hand");
const pile = document.querySelector("#pile");

console.log({
    pile,
    myHand
})

render(
    html`
    ${Card({ suit: "spades", value: 1 })}
    ${Card({ suit: "hearts", value: 1 })}
    ${Card({ suit: "clubs", value: 1 })}
    ${Card({ suit: "diamonds", value: 1 })}
    `,
    pile

)

render(
    html`
    ${Card({ suit: "spades", value: 1 })}
    ${Card({ suit: "hearts", value: 1 })}
    ${Card({ suit: "clubs", value: 1 })}
    ${Card({ suit: "diamonds", value: 1 })}
    `,
    myHand
)

render(
        html`
        ${Card({ suit: "spades", value: 1 })}
        ${Card({ suit: "hearts", value: 1 })}
        ${Card({ suit: "clubs", value: 1 })}
        ${Card({ suit: "diamonds", value: 1 })}
        `,
        document.getElementById('hand-2')
)