import { h, render, Component } from "https://esm.sh/preact";

class MyButton extends Component {
  state = { clicked: false };

  handleClick = () => {
    this.setState({ clicked: !this.state.clicked });
  };

  render() {
    return h(
      "button",
      { onClick: this.handleClick },
      this.state.clicked ? "Clicked!" : "Not clicked"
    );
  }
}

// Create your app
const app = h(
  "h1",
  null,
  "Hello World!",
  h("a", { "data-meow": "meow", href: "a" }, "hi"),
  h(MyButton, null)
);

render(app, document.body);
