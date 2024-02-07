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
  a,
  h4,
  b,
  small,
  details,
  summary,
  pre,
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
import { games as allGames } from "./game-index.js";
import { safeStringify } from "./utils/safe-stringify.js";
const games = allGames.filter((g) => !g.hidden);
const qrCodeUrl = van.state("");
van.derive(() => {
  if (!partyId.val) {
    qrCodeUrl.val = "";
    return;
  }
  let curPartyId = partyId.val;
  let url =
    window.location.origin + window.location.pathname + "?p=" + partyId.val;
  getQRCodeDataUrl(url).then((dataUrl) => {
    if (curPartyId !== partyId.val) return;
    qrCodeUrl.val = dataUrl;
  });
});

/**
 * @typedef {{
 *   version: string,
 *   users: (import('./utils/p2p/Room-types.js').User & { connected: boolean, isHost: boolean })[],
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

const iframeUrl = van.derive(() => {
  if (!selectedGameUrl.val) return "";

  if (selectedGameUrl.val.endsWith(".js")) {
    return `/games/embeds/embed.html?game=${encodeURIComponent(
      selectedGameUrl.val
    )}`;
  }

  return selectedGameUrl.val;
});

// debug messages
let messages = [];

const room = new Room(appState.game, (name, ...args) => {
  let stringified = safeStringify(name) + "\n" + safeStringify(args, null, 1);

  console.log("room event", stringified);
  messages.push(stringified);
  let el = document.getElementById("debug-message");
  if (!el) {
    return;
  }
  el.querySelector("pre").innerText = messages.join(
    "\n------------------------------------------------\n"
  );
});

room.onStateChange((state) => {
  console.log("state update", state);
  recursiveAssign(appState, state);
});

const connected = van.state(false);

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
  console.log("derive!");
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
const gamePickerIsOpen = van.state(false);

const root = document.getElementById("root");

const renderGames = (onClick = () => {}) => {
  return games.map((game) => {
    const selected = van.derive(() => selectedGameUrl.val === game.url);
    return button(
      {
        style: () => `
                    background-color: ${game.color};
                    display: block;
                    width: 100%;
                    border: 1px solid black;
                    color: black;
                    font-size: 1.17em;
                    padding: 12px 12px;
                    margin-bottom: 12px;
                    ${selected.val ? "outline: 4px solid gold;" : ""}
                  `,
        onclick: () => {
          room.send("setGame", { game: game.url });
          modalIsOpen.val = false;
          onClick();
        },
      },
      game.name
    );
  });
};

// on escape, close menu
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    modalIsOpen.val = false;
    document.getElementById("menu-button").focus();
  }
});

/**
 *
 * @param {{
 * name: () => any,
 * menuIconSrc: string,
 * onMenuClick: () => void
 * onNameClick?: () => void
 * }} param0
 * @returns
 */
function NavBar({ name, menuIconSrc, onMenuClick }) {
  return nav(
    h3(name),
    div(
      {
        style:
          "display: flex; align-items: center; justify-content: center; gap: 6px;",
      },

      span({
        style: () =>
          `background-color: ${
            connected.val ? "green" : "gold"
          }; width: 0.5em; height: 0.5em; border-radius: 50%; display: inline-block; display: ${() =>
            partyId.val ? "inline-block" : "none"};`,
      }),
      button(
        {
          id: "menu-button",
          onclick: onMenuClick,
        },
        img({
          style: "padding: 1px; display: flex;",
          alt: "menu",
          src: menuIconSrc,
        })
      )
    )
  );
}

// game
van.add(
  root,
  div(
    {
      class: () => `page`,
      style: () => `background-color: ${selectedGame.val?.color || "ivory"};`,
    },
    NavBar({
      name: () =>
        selectedGame.val?.name
          ? button(
              {
                style:
                  "display: inline-flex; align-items: center; gap: 6px; border: none; background: none; cursor: pointer; text-align: start; padding: 0; color: black;",
                onclick: () => {
                  gamePickerIsOpen.val = !gamePickerIsOpen.val;
                },
              },
              span(selectedGame.val.name),
              img({
                alt: "show game picker",
                src: () =>
                  gamePickerIsOpen.val
                    ? "https://esm.sh/feather-icons@4.29.1/dist/icons/chevron-up.svg"
                    : "https://esm.sh/feather-icons@4.29.1/dist/icons/chevron-down.svg",
              })
            )
          : span("👻"),
      menuIconSrc: "https://esm.sh/feather-icons@4.29.1/dist/icons/users.svg",
      onMenuClick: () => {
        modalIsOpen.val = true;
        document.getElementById("close-menu-button").focus();
      },
    }),
    main(
      {
        class: "game-container",
        style: () =>
          `background-color: ${selectedGame.val ? "white" : "ivory"};`,
      },

      //   select user name
      form(
        {
          class: "container",
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
          h4("enter a user name to play"),
          br(),
          input({
            style: "margin-right: 6px;",
            name: "username",
            placeholder: "your name",
          }),
          button("continue")
        )
      ),
      //   select game
      div(
        {
          class: "container",
          style: () => `
              padding: 12px;
              ${mainViewContents.val === "select-game" ? "" : "display: none;"}
            `,
        },
        h2("what game do you want to play?"),
        div(
          {
            style: "display: flex; flex-direction: column; align-items: start;",
          },
          ...renderGames()
        )
      ),
      div(
        {
          class: "container",
          style: () => `
              padding: 12px;
              ${mainViewContents.val === "create-party" ? "" : "display: none;"}
            `,
        },
        //   create party
        h2("hi ", () => user.val?.name, "! 👋"),
        p("do you want to create a party?"),
        form(
          {
            onsubmit: (e) => {
              e.preventDefault();
              if (!user.val?.id) {
                return;
              }
              partyId.val = makePartyId(user.val.id);
            },
          },
          button({ type: "submit", name: "action", value: "create" }, "create")
        ),
        p("or join existing party?"),
        form(
          {
            onsubmit: (e) => {
              e.preventDefault();
              if (!user.val?.id) {
                return;
              }
              const formValues = new FormData(e.target);
              const localId = formValues.get("party-id");

              if (typeof localId !== "string") return;

              if (localId.length < 1) return;

              partyId.val = localId;
            },
          },
          input({
            name: "party-id",
            placeholder: "party id",
          }),
          button({ type: "submit", name: "action", value: "join" }, "join")
        )
      ),

      //   in game
      () =>
        mainViewContents.val === "in-game"
          ? iframe({
              id: "game-iframe",
              src: iframeUrl,
              style:
                "border: none; width: 100%; height: 100%; top: 0; left: 0; bottom: 0; right: 0; position: absolute;",
            })
          : div(),
      div(
        {
          style: () => `
            display: ${gamePickerIsOpen.val ? "block" : "none"};
            padding: 12px;
            background-color: ${selectedGame.val?.color || "ivory"};
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            max-height: 100%;
            overflow-y: auto;
          `,
        },
        ...renderGames(() => (gamePickerIsOpen.val = false))
      )
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
    NavBar({
      name: () => "👻 menu",
      menuIconSrc: "https://esm.sh/feather-icons@4.29.1/dist/icons/x.svg",
      onMenuClick: () => {
        document.getElementById("menu-button").focus();
        modalIsOpen.val = false;
      },
    }),
    main(
      {
        style: "padding: 12px; padding-top: 0; padding-bottom: 48px;",
      },
      div(
        {
          class: "container",
        },
        h3(
          "in your party ",
          small(
            {
              style:
                "font-weight: normal; padding: 6px; font-size: 1rem; background-color: #ddd;",
            },
            "(",
            partyId,
            ")"
          )
        ),

        ...renderPartyUi(),
        br(),
        br(),
        br(),
        a({ href: window.location.pathname }, "leave party"),
        br(),
        br(),
        a({ href: "/" }, "jeffy.me"),
        br(),
        br(),
        details(
          { id: "debug-message" },
          summary("debug messages"),
          pre({
            style: "overflow-x: scroll; background-color: white; padding: 6px;",
          })
        )
      )
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
            style: () =>
              `display: inline-block; margin: 0; margin-bottom: 6px; font-weight: normal;`,
          },
          span(
            {
              style: () =>
                `border-bottom: 2px solid ${user.val.color}; font-weight: bold;`,
            },
            user.val.emoji,
            " ",
            user.val.name
          ),
          () => (user.val.isHost ? " (host)" : ""),
          () => (user.val.id === room.userId ? " (you)" : "")
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
