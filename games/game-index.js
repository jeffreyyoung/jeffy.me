export const isLocal = window.location.hostname === "localhost";

export const games = [
  {
    name: "speed minesweeper 💣",
    url: "/games/minesweeper.html",
    color: "lightgray",
  },
  {
    name: "tic-tac-toe ❌⭕️",
    url: "/games/tic-tac-toe.html",
    color: "lightblue",
  },
  {
    name: "cross-clues 🕵️",
    url: "/games/cross-clues.html",
    color: "lightcoral",
  },
  {
    name: "the-mind 🧠",
    url: "/games/the-mind.html",
    color: "lightgreen",
  },
  {
    name: "increment 🔢",
    url: "/games/embeds/increment.html",
  },
  {
    name: "scum 🃏 (in progress)",
    url: "/games/scum.html",
    color: "lightpink",
  },
  {
    url: "/games/embeds/connect-4.js",
    name: "connect 4",
    color: "dodgerblue",
    // hidden: !isLocal,
  },
  // {
  //   name: "air hockey 🏒",
  //   url: "/games/air-hockey.html",
  //   color: "aqua",
  // },
];
