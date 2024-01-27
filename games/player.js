import van from "../deps/van.js";
import { getQRCodeDataUrl } from "./utils/qr-code.js";
import { randomItem } from "./utils/random.js";
import {
  button,
  div,
  form,
  h1,
  h2,
  h3,
  iframe,
  img,
  label,
  main,
  nav,
  p,
  br,
  input,
} from "./utils/tags.js";
import {
    colors,
    emojis,
    partyId,
    isHost,
    user,
    makePartyId,
    makeUserId,
} from './utils/game-values.js';




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

const selectedGameUrl = van.state("");
const selectedGame = van.derive(() => {
  return games.find((game) => game.url === selectedGameUrl.val);
});
const mainViewContents = van.derive(() => {
  if (!user.val?.id) {
    return "select-user-name";
  }
  if (!selectedGame.val?.url) {
    return "select-game";
  }
  if (!partyId.val) {
    console.log("party id", partyId.val);
    return "create-party";
  }
  return "in-game";
});

const modalIsOpen = van.state(false);

const root = document.getElementById("root");

const renderGames = (props) => {
  return games.map((game) => {
    return button(
      {
        style: () => `
                    background-color: ${game.color};
                    border: 1px solid black;
                    color: black;
                    font-size: 1.17em;
                    padding: 6px 12px;
                    margin-right: 6px;
                    margin-bottom: 6px;
                    outline: 4px solid ${
                      selectedGameUrl.val === game.url ? "gold" : "transparent"
                    };
                  `,
        onclick: () => {
          selectedGameUrl.val = game.url;
          modalIsOpen.val = false;
        },
      },
      game.name
    );
  });
};

// game
van.add(
  root,
  div(
    {
      class: () => `page`,
      style: () => `background-color: ${selectedGame.val?.color};`,
    },
    nav(
      h1("👻 ", () => selectedGame.val?.name || "jeffy games"),
      button({ onclick: () => (modalIsOpen.val = true) }, "open")
    ),
    main(
      {
        class: "game-container",
        style: 'background-color: white;'
      },

      //   select user name
      form(
        {
          style: () => `
              padding: 12px;
              ${
                mainViewContents.val === "select-user-name"
                  ? ""
                  : "display: none;"
              }
            `,
            onsubmit: (e) => {
                e.preventDefault();
                if (e.target[0].value)
                user.val = {
                    id: makeUserId(),
                    name: e.target[0].value,
                    color: randomItem(colors),
                    emoji: randomItem(emojis),
                }
            }
        },
        label(
          "whats your name?",
          br(),
          input({
            name: "username",
            placeholder: "your name",
          }),
          button("continue")
        )
      ),
      //   select game
      div(
        {
          style: () => `
              padding: 12px;
              ${
                mainViewContents.val === "select-game"
                  ? ""
                  : "display: none;"
              }
            `,
        },
        h3("hi ", () => user.val?.name, "! 👋"),
        p("what game do you want to play?"),
        ...renderGames()
      ),

      //   create party
      form(
        {
          style: () => `
                  padding: 12px;
                  ${
                    mainViewContents.val === "create-party"
                      ? ""
                      : "display: none;"
                  }
                `,
            onsubmit: (e) => {
                e.preventDefault();
                if (!user.val?.id) {
                    return;
                }
                const userId = user.val.id;
                
                partyId.val = makePartyId(userId);


            }
        },
        label(p("create a party?"), br(), button({ name: 'action', value: "create" }, "create")),
        p("or join existing party?"),
        input({
        name: "lobby-id",
        placeholder: "lobby id",
        }),
        button({ name: 'action', value: "join" }, "join")
      ),

      //   in game
      () =>
        mainViewContents.val === "in-game"
          ? iframe({
              src: selectedGame.val?.url,
              style: "border: none; width: 100%; height: 100%;",
            })
          : div()
    )
  )
);


const players = van.state([
  {
    id: "ABDF",
    name: "jeffy",
    color: randomItem(colors),
    emojis: randomItem(emojis),
  },
  {
    id: "ABDF",
    name: "&rea",
    color: randomItem(colors),
    emojis: randomItem(emojis),
  },
  {
    id: "ABDF",
    name: "harold",
    color: randomItem(colors),
    emojis: randomItem(emojis),
  },
  {
    id: "ABDF",
    name: "millie",
    color: randomItem(colors),
    emojis: randomItem(emojis),
  },
  {
    id: "ABDF",
    name: "sam",
    color: randomItem(colors),
    emojis: randomItem(emojis),
  },
]);

const qrCodeUrl = van.state("");
van.derive(() => {
  let curUrl = selectedGameUrl.val;

  if (!curUrl) {
    qrCodeUrl.val = "";
    return;
  }
  getQRCodeDataUrl(curUrl).then((dataUrl) => {
    if (curUrl !== selectedGameUrl.val) return;
    qrCodeUrl.val = dataUrl;
  });
});

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
      h1(
        {
          "aria-hidden": "true",
        },
        "👻"
      ),
      button({ onclick: () => (modalIsOpen.val = false) }, "close")
    ),
    main(
      {
        style: "padding: 12px; padding-top: 0;",
      },
      h2("games"),
      ...renderGames(),
      h2("in your party"),
      ...players.val.map((player) => {
        return div(
          h3(
            {
              style: `display: inline-block; margin: 0; border-bottom: 2px solid ${player.color}; margin-bottom: 6px;`,
            },
            player.emojis,
            " ",
            player.name
          )
        );
      }),
      h2("invite to party"),
      p("send an invite link"),
      button(
        {
          onclick: () => {
            navigator.clipboard.writeText(window.location.href);
          },
        },
        "copy link"
      ),
      p("or have a friend scan this qr code"),
      () =>
        qrCodeUrl.val
          ? img({ src: qrCodeUrl.val, style: "width: 100%; max-width: 200px;" })
          : div()

      // div({ class: 'big' }, 'hi world')
    )
  )
);
