import React from "react";
import reactDom from "react-dom/client";
import { motion } from "framer-motion";
import { create } from "zustand";

const useMenu = create((set) => ({
  show: false,
  setShow: (show) => set({ show }),
}));
const App = () => {
  return (
    <>
      <motion.div>
        <h1>Hi</h1>
      </motion.div>
      <motion.div>
        <h1>hey</h1>
      </motion.div>
    </>
  );
};

reactDom.createRoot(document.getElementById("root")).render(<App />);
