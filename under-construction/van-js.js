import van from "../deps/van.js";

console.log("here!", van);
const { h1, span, div, button, p, ul, li, a } = van.tags;

const Counter = () => {
  const counter = van.state(0);

  return div(
    "count: ",
    () => (counter.val > 3 ? span(counter, "!!!!") : span(counter)),
    div(
      button({ onclick: () => counter.val++ }, "+"),
      button({ onclick: () => counter.val-- }, "-"),
    ),
  );
};

const Display = ({ count }) => {
  return () => {
    if (count.val > 3) {
      return span("whoa thats big!", count);
    }
    return span(count);
  };
};

van.add(document.getElementById("app"), Counter());
