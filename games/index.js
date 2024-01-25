import { stateFields, calc } from "../deps/van-x.js";
import { list, reactive } from "../deps/van-x.js";
import van from "../deps/van.js";
import { lobbyId, PreGameGate, username } from "./utils/pre-game.js";
import { getQueryParam, setQueryParam } from "./utils/random.js";
import {
  div,
  iframe,
  option,
  select,
  button,
  h3,
  p,
  img,
  input,
  form,
  h4,
  hr,
} from "./utils/tags.js";
import { getQRCodeDataUrl } from "./utils/qr-code.js";

const modals = reactive(
  /** @type {{ kind: "invite" }[]} */
  ([])
);

const isConnected = van.state(false);

const games = [
  ["", "select a game"],
  ["tic-tac-toe.html", "tic tac toe ⭕️❌"],
  ["cross-clues.html", "cross clues 🕵️"],
  ["the-mind.html", "the mind 🧠"],
  ["scum.html", "scum 🃏"],
  ["air-hockey.html", "air hockey 🏒"],
  ["watermelon-hunt.html", "water-melon-hunt 🍉"],
];

const maybeGame = games.find(([value]) => value === getQueryParam("game"))?.[0];

console.log("query param!!!", maybeGame, getQueryParam("game"));
const game = van.state(maybeGame || "");

const qrcode = van.state("");

van.derive(() => {
  if (game.val) {
    setQueryParam("game", encodeURIComponent(game.val));
  }
});

van.derive(() => {
  if (lobbyId.val) {
    document.getElementById("invite-button").style.display = "block";
  } else {
    document.getElementById("invite-button").style.display = "none";
  }
});

van.derive(() => {
  // add lobbyId as query param
  // url
  let searchParams = new URLSearchParams(window.location.search);
  searchParams.set("lobbyId", lobbyId.val);
  searchParams.set('game', game.val);
  window.history.replaceState(
    {},
    "",
    window.location.pathname + "?" + searchParams.toString()
  );
})

document.getElementById("invite-button").addEventListener("click", () => {
  if (modals.at(-1)?.kind === "invite") {
    return;
  }
  getQRCodeDataUrl(window.location.href).then((dataUrl) => {
    qrcode.val = dataUrl;
  });
  modals.push({
    kind: "invite",
  });
});

let inviteLinkTimeout;

van.add(
  document.getElementById("modal-slot"),
  list(
    () =>
      div({
        id: "modals-container",
        onclick: () => {},
        style: () =>
          [
            "position: absolute;",
            "top: 0; left: 0; right: 0; bottom: 0;",
            "pointer-events: none;",
            // modalFields.length ? 'background-color: rgba(0, 0, 0, 0.5);' : ' pointer-events: none;',
            "flex: 1; height: 100%;",
          ].join(" "),
        class: "modals-wrapper",
      }),
    modals,
    (modal, remove, i) => {
      if (modal.val.kind === "invite") {
        return div(
          {
            class: 'inverted',
            style: `
                pointer-events: all;
                padding: 12px;
                background-color: rgba(256, 256, 256);
                border-radius: 12px;
                height: 50vh;
                position: relative;
                top: 50%;
                transform: translateY(-50%);
                width: 30vw;
                max-width: 400px;
                min-width: 200px;
                margin: 0 auto;
                color: black;
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: center;
                justify-content: center;
            `,
          },
          h3("invite link"),
          button(
            {
              id: "copy-invite-link",
              onclick: () => {
                navigator.clipboard.writeText(window.location.href);
                document.getElementById("copy-invite-link").innerText =
                  "copied!";
                clearTimeout(inviteLinkTimeout);
                inviteLinkTimeout = setTimeout(() => {
                  document.getElementById("copy-invite-link").innerText =
                    "copy invite link";
                }, 1000);
              },
            },
            "copy invite link"
          ),
          h3("qr code"),
          p("scan the qr code to join"),
          img({
            src: qrcode,
          }),
          button({ onclick: () => modals.pop() }, "close")
        );
      }
    }
  )
);

van.add(
  document.getElementById("select-game-slot"),
  select(
    {
      style: () => (username.val && game.val ? "" : "display: none;"),
      value: () => game.val,
      onchange: (e) => {
        game.val = e.target.value;
      },
    },
    ...games.map(([value, text]) => option({ value }, text))
  )
);

van.derive(() => {
  document.querySelector("#select-game-slot select").value = game.val;
});

function MyPregameGate() {
  return div(
    div({
      style: () => (username.val ? "" : "display: none;"),
    })
  );
}

van.add(
  document.getElementById("game-slot"),
  div(
    div(
      {
        style: () =>
          `
          padding: 12px;
          display: flex;
          gap: 12px;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          flex: 1;
        ` + (username.val ? "display: none;" : ""),
      },
      h3("what is your name?"),
      form(
        {
          onsubmit: (e) => {
            e.preventDefault();
            username.val = e.target[0].value;
          },
        },
        input({
          value: () => username.val,
          style: 'margin-right: 12px;',
          placeholder: "your name",
        }),
        button("set name")
      )
    )
  ),
  div(
    {
      style: () => `
    padding: 12px;
    display: flex;
    gap: 12px;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    display: ${!username.val || game.val ? "none" : "flex"};
    `,
    },
    h3("what game do you want to play?"),
    select(
      {
        value: game,
        onchange: (e) => {
          game.val = e.target.value;
        },
      },
      ...games.map(([value, text]) => option({ value }, text))
    )
  ),
  div(
    {
      style: () => `
    padding: 12px;
    display: flex;
    gap: 12px;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    display: ${username.val && game.val && !lobbyId.val ? "flex" : "none"};
    `,
    },
    h3("almost ready!"),
    button(
      {
        onclick: () => {
          lobbyId.val = Math.random().toString(36).slice(2);
        },
      },
      'start playing',
    ),
    hr({ style: 'width: 50%; background-color: white; border: 1px solid white;' }),
    form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          lobbyId.val = e.target[0].value;
        },
      },
      input({
        value: () => lobbyId.val,
        style: 'margin-right: 12px;',
        placeholder: "lobby id",
      }),
      button("join lobby")
    )
  ),
  iframe({
    frameBorder: "0",
    src: () => `/games/${game.val}?lobbyId=${lobbyId.val}`,
    style: () => (game.val && lobbyId.val ? "" : "display: none;"),
  })

  // PreGameGate(() => {
  //   return iframe({
  //     frameBorder: "0",
  //     src: () => `/games/${game.val}?lobbyId=${lobbyId.val}`,
  //     style: () => (game.val ? "" : "display: none;"),
  //   });
  // })
);
