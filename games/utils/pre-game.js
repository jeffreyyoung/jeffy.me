import van from "../../deps/van.js";
const {
  form,
  p,
  div,
  hr,
  input,
  button,
} = van.tags;

const urlSearchParams = new URLSearchParams(
  window.location.search.split("?")?.[1] || ""
);

export const lobbyId = van.state(
  Object.fromEntries(urlSearchParams.entries())?.lobbyId || ""
);
export const isHost = van.derive(() => {
  return window.localStorage.getItem(`isHost-${lobbyId.val}`) === "true";
});
export const username = van.state(localStorage.getItem("username") || "");

van.derive(() => {
  localStorage.setItem("username", username.val);
});

export const needsUserName = van.derive(() => {
  return !username.val;
});

export const needsLobbyId = van.derive(() => {
  return !lobbyId.val;
});

export function SetUserName() {
  return div(
    { style: "margin-bottom: 30px" },
    p("What is your name?"),
    form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          let form = new FormData(e.target);
          let value = form.get("username");
          if (typeof value !== "string") {
            return;
          }
          let trimmed = value.trim();
          if (!trimmed) {
            return;
          }
          username.val = trimmed;
        },
      },
      input({ name: "username", placeholder: "your name" }),
      button("join")
    )
  );
}

export function LobbySelection() {
  return div(
    { style: "margin-bottom: 30px" },
    p("create new game"),
    form(
      {
        onsubmit: (e) => {
          e.preventDefault();
          const randomChars = Math.floor(Math.random() * 10000) + "";
          window.localStorage.setItem(`isHost-${randomChars}`, "true");
          window.location.href = `?lobbyId=${randomChars}`;
        },
      },
      button("create")
    ),
    hr(),
    p("join existing game"),
    form(
      {
        style: "display: flex; gap: 12px; flex-wrap: wrap; align-items: center",
        onsubmit: (e) => {
          e.preventDefault();
          let form = new FormData(e.target);
          let value = form.get("lobbyId");
          if (typeof value !== "string") {
            return;
          }
          let trimmed = value.trim();
          if (!trimmed) {
            return;
          }
          window.location.href = `?lobbyId=${trimmed}`;
        },
      },
      input({ name: "lobbyId", placeholder: "lobby id", style: 'padding: 6px' }),
      button("join")
    )
  );
}
