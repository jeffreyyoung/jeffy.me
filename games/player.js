import van from "../deps/van.js";
import { button, div, h1, h3, iframe, main, nav } from "./utils/tags.js";

const modalIsOpen = van.state(false);

const root = document.getElementById("root");

const games = [
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
    name: "scum 🃏",
    url: "/games/scum.html",
    color: "lightpink",
  },
  {
    name: "air hockey 🏒",
    url: "/games/air-hockey.html",
    color: "aqua",
  },
];

const gameUrl = van.state("");

const gameName = van.derive(() => {
  const game = games.find((game) => game.url === gameUrl.val);
  return game?.name || "";
});

const gameColor = van.derive(() => {
  const game = games.find((game) => game.url === gameUrl.val);
  return game?.color || "white";
});


// game
van.add(
  root,
  div(
    {
      class: () => `page`,
      style: () => `background-color: ${gameColor.val};`,
    },
    nav(
      h1(
        "👻 ",
        () => gameName.val || "jeffy games"
        ),
      button({ onclick: () => (modalIsOpen.val = true) }, "open")
    ),
    main(
      {
        class: "game-container",
      },
      () => (gameUrl.val ? iframe(
        {
            src: gameUrl.val,
            style: 'border: none; width: 100%; height: 100%;'
        }
        ) : div())
    )
  )
);


// menu
van.add(
  root,
  div(
    {
      class: () => `page
                ${modalIsOpen.val ? "" : "hidden"}
            `,
      style: () => "background-color: ivory;",
    },
    nav(
      h1({
        "aria-hidden": "true",
      }, "👻"),
      button({ onclick: () => (modalIsOpen.val = false) }, "close")
    ),
    main(
      {
        style: "padding: 12px; padding-top: 0;",
      },
      h3("games"),
      ...games.map((game) => {
        return button(
          {
            style: () => `
                  background-color: ${game.color};
                  border: 1px solid black;
                  color: black;
                  padding: 6px 12px;
                  margin-right: 6px;
                  margin-bottom: 6px;
                  outline: 3px solid ${gameUrl.val === game.url ? "white" : "transparent"};

                `,
            onclick: () => {
              gameUrl.val = game.url;
              modalIsOpen.val = false;
            },
          },
          game.name
        );
      }),
      h3('in your party'),

      // div({ class: 'big' }, 'hi world')
    )
  )
);
