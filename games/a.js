import van from "../deps/van.js";
import { css } from "./utils/css.js";

const { div, p, button, span } = van.tags;

let count1 = van.state(0);
let count2 = van.state(0);
let count3 = van.state(0);
let yourscore = van.state(0);
setInterval(() => {
  yourscore.val = count1.val + count2.val + count3.val;
});

let state = {};

css`
  .layout--div {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 75vh;
    justify-content: space-around;
  }

  .layout--center-text {
    text-align: center;
  }
`;

const layout = (content) => {
  return div(
    {
      class: "layout--div",
    },
    button(
      {
        onclick: () => {
          count1.val++;
        },
      },
      "count1 ",
      count1,
    ),
    button(
      {
        onclick: () => {
          count2.val++;
        },
      },
      "count2 ",
      count2,
    ),
    button(
      {
        onclick: () => {
          count3.val++;
        },
      },
      "count3 ",
      count3,
    ),
    div({ class: "layout--center-text" }, () =>
      yourscore.val >= 0
        ? p({ class: "fadeInUp-animation" }, "Your score: ", yourscore)
        : span(),
    ),
  );
};

van.add(document.getElementById("game-slot"), layout());
