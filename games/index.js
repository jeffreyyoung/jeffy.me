import van from "../deps/van.js";
import { lobbyId, PreGameGate } from "./utils/pre-game.js";
import { getQueryParam, setQueryParam } from "./utils/random.js";
import { iframe, option, select } from "./utils/tags.js";

const isConnected = van.state(false);


const games = [
    ['', 'select a game'],
    ['tic-tac-toe.html', 'tic tac toe ⭕️❌'],
    ['cross-clues.html', 'cross clues 🕵️'],
    ['the-mind.html', 'the mind 🧠'],
    ['scum.html', 'scum 🃏'],
    ['air-hockey.html', 'air hockey 🏒'],
    ['watermelon-hunt.html', 'water-melon-hunt 🍉'],
]

const maybeGame = games.find(([value]) => value === getQueryParam('game'))?.[0];

console.log('query param!!!', maybeGame, getQueryParam('game'));
const game = van.state(maybeGame || '');
van.derive(() => {
    if (game.val) {
        setQueryParam('game', encodeURIComponent(game.val));
    }
})

van.add(
  document.getElementById("select-game-slot"),
  select(
    {
      value: () => game.val,
      onchange: (e) => {
        game.val = e.target.value;
      },
    },
    ...games.map(([value, text]) => option({ value }, text))
  )
);

van.derive(() => {
    document.querySelector('#select-game-slot select').value = game.val;
})



van.add(
  document.getElementById("game-slot"),
  PreGameGate(() => {
    return iframe({
        frameBorder: '0',
        src: () => `/games/${game.val}?lobbyId=${lobbyId.val}`,
        style: () => game.val ? "" : "display: none;",
    });
  })
);
