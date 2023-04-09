import React from "react";
import { createRoot } from "react-dom/client";
import { Options } from "./components/Options";

const element = document.getElementById("root");
if (element) {
  createRoot(element).render(<Options />);
}
