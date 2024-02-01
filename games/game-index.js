export const isLocal = window.location.hostname === "localhost";

export const games = [
  {
    name: "💣 speed minesweeper",
    url: "/games/minesweeper.html",
    color: "lightgray",
  },
  {
    name: "🕵️ cross-clues",
    url: "/games/cross-clues.html",
    color: "lightcoral",
  },
  {
    name: "🧠 the-mind",
    url: "/games/the-mind.html",
    color: "lightgreen",
  },
  {
    name: "🔴🔵 connect 4",
    url: "/games/embeds/connect-4.js",
    color: "dodgerblue",
    // hidden: !isLocal,
  },
  {
    name: "🔢 increment",
    url: "/games/embeds/increment.html",
  },
  {
    name: "❌⭕️ tic-tac-toe",
    url: "/games/tic-tac-toe.html",
    color: "lightblue",
  },
  {
    name: "🃏 scum (in progress)",
    url: "/games/scum.html",
    color: "lightpink",
  },
  // {
  //   name: "harvest",
  //   url: "/games/embeds/harvest.js",
  //   color: "lightgreen",
  // },
  {
    name: "🗼 stack",
    url: "/games/embeds/stack.js",
    color: "magenta",
  },
  // wordle race
  // sudoku race
  // tallest tower https://codepen.io/ste-vg/pen/ppLQNW
  // {
  //   name: "air hockey 🏒",
  //   url: "/games/air-hockey.html",
  //   color: "aqua",
  // },
  // symphony
  // users must move touch in circles at same rate to make music
];
