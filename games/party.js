import van from "../deps/van.js";
import { getQRCodeDataUrl } from "./utils/qr-code.js";
import { getQueryParam, randomItem, setQueryParam } from "./utils/random.js";
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
  span,
} from "./utils/tags.js";
import {
  colors,
  emojis,
  partyId,
  isHost,
  user,
  makePartyId,
  makeUserId,
} from "./utils/game-values.js";
import { recursiveAssign } from "./utils/recursiveAssign.js";
import { stateFields, reactive, list } from "../deps/van-x.js";
import { Room } from "./utils/p2p/Room.js";

const qrCodeUrl = van.state("");
van.derive(() => {
  if (!partyId.val) {
    qrCodeUrl.val = "";
    return;
  }
  let curPartyId = partyId.val;
  let url = window.location.pathname + "?p=" + partyId.val;
  getQRCodeDataUrl(url).then((dataUrl) => {
    if (curPartyId !== partyId.val) return;
    qrCodeUrl.val = dataUrl;
  });
});

const games = [
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
    url: "/games/embeds/embed.html",
  },
  {
    name: "scum 🃏 (in progress)",
    url: "/games/scum.html",
    color: "lightpink",
  },
  // {
  //   name: "air hockey 🏒",
  //   url: "/games/air-hockey.html",
  //   color: "aqua",
  // },
];

/**
 * @typedef {{
 *   version: string,
 *   users: (User & { connected: boolean, isHost: boolean })[],
 *   game: string,
 *   gameState: any,
 * }} AppState
 */

const appState = reactive(
  /** @type {import('./utils/p2p/Room-types.js').RoomState} */ ({
    game: games.find((game) => game.url === getQueryParam("game"))?.url || "",
    version: "",
    users: [],
  })
);
const gameStateField = stateFields(appState).game;
van.derive(() => {
  setQueryParam("game", gameStateField.val);
});

const selectedGameUrl = stateFields(appState).game;
const selectedGame = van.derive(() => {
  return games.find((game) => game.url === selectedGameUrl.val);
});

const room = new Room(appState.game);

room.onStateChange((state) => {
  console.log("state update", state);
  recursiveAssign(appState, state);
});

const connected = van.derive(() => {
  return false;
});

room.onConnectionChange((_connected) => {
  connected.val = _connected;

  if (!_connected) {
    return;
  }
  room.send("userJoin", {
    user: {
      ...user.val,
      isConnected: true,
      isHost: isHost.val,
    },
  });
});

van.derive(() => {
  if (partyId.val && user.val?.id) {
    room.connect(isHost.val, user.val.id, partyId.val);
  }
});

const mainViewContents = van.derive(() => {
  if (!user.val?.id) {
    return "select-user-name";
  }
  if (!partyId.val) {
    console.log("party id", partyId.val);
    return "create-party";
  }
  if (!selectedGame.val?.url) {
    return "select-game";
  }
  return "in-game";
});

const modalIsOpen = van.state(false);

const root = document.getElementById("root");

const renderGames = () => {
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
          room.send("setGame", { game: game.url });
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
      h3("👻 ", () => selectedGame.val?.name || ""),
      div(
        {
          style: "display: flex; align-items: center; justify-content: center; gap: 6px;",
        },

          span({
            style: () =>
              `background-color: ${
                connected.val ? "green" : "gold"
              }; width: 0.5em; height: 0.5em; border-radius: 50%; display: inline-block;`,
          }),
        button(
          { onclick: () => (modalIsOpen.val = true) },
          img({
            style: "padding: 1px; display: flex;",
            src: "https://esm.sh/feather-icons@4.29.1/dist/icons/menu.svg",
          })
        )
      )
    ),
    main(
      {
        class: "game-container",
        style: "background-color: white;",
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
              };
          },
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
              ${mainViewContents.val === "select-game" ? "" : "display: none;"}
            `,
        },
        h2("hi ", () => user.val?.name, "! 👋"),
        p("what game do you want to play?"),
        ...renderGames(),

        br(),
        br(),
        h3("in your party"),
        ...renderPartyUi()
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
          },
        },
        h2("hi ", () => user.val?.name, "! 👋"),
        p("do you want to create a party?"),
        button({ name: "action", value: "create" }, "create"),
        p("or join existing party?"),
        input({
          name: "lobby-id",
          placeholder: "lobby id",
        }),
        button({ name: "action", value: "join" }, "join")
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
      h3(
        {
          "aria-hidden": "true",
        },
        "👻"
      ),
      button(
        { onclick: () => (modalIsOpen.val = false) },
        img({
          style: "padding: 1px; display: flex;",
          src: "https://esm.sh/feather-icons/dist/icons/x.svg",
        })
      )
    ),
    main(
      {
        style: "padding: 12px; padding-top: 0;",
      },
      h2("games"),
      ...renderGames(),
      h2("in your party"),

      ...renderPartyUi(),
    )
  )
);

let copyLinkTimeout;

function renderPartyUi() {
  return [
    list(div, appState.users, (user) => {
      return div(
        h3(
          {
            style: `display: inline-block; margin: 0; border-bottom: 2px solid ${user.val.color}; margin-bottom: 6px;`,
          },
          user.val.emoji,
          " ",
          user.val.name
        )
      );
    }),
    p("send an invite link"),
    button(
      {
        id: "copy-link-button",
        onclick: (e) => {
          clearTimeout(copyLinkTimeout);
          navigator.clipboard.writeText(window.location.href);
          let button = e.target.closest("button");
          button.innerText = "copied!";
          copyLinkTimeout = setTimeout(() => {
            button.innerText = "copy link";
          }, 1000);
        },
      },
      "copy link"
    ),
    p("or have a friend scan this qr code"),
    () =>
      qrCodeUrl.val
        ? img({ src: qrCodeUrl.val, style: "width: 100%; max-width: 200px;" })
        : div(),
  ];
}
