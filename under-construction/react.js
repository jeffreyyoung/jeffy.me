import React from "https://esm.sh/react@18.2.0";
import ReactDOM from "https://esm.sh/react-dom@18.2.0";
import { motion, AnimatePresence } from "https://esm.sh/framer-motion@11.0.3";
import htm from "https://esm.sh/htm@3.1.1";
const html = htm.bind(React.createElement);
const h = React.createElement;

function App() {
  const [count, setCount] = React.useState(0);
  return html`<div>
    <${AnimatePresence} mode="popLayout">
      <${motion.p}
        layout
        key=${count}
        initial=${{ y: 10, opacity: 0 }}
        animate=${{ y: 0, opacity: 1 }}
        exit=${{ y: -10, opacity: 0 }}
        transition=${{ duration: 0.2 }}
      >
        You clicked ${count} times
      <//>
      <${motion.button}
        onClick=${() => setCount(count + 1)}
        whileHover=${{ scale: 1.1 }}
        whileTap=${{ scale: 0.9 }}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Click me
      <//>
    <//>
  </div>`;
}

ReactDOM.render(h(App, {}), document.getElementById("root"));
