import React from "react";
import { createRoot, Root } from "react-dom/client";
import ModelLoader from "./ModelLoader";
import Popup from "./Popup";

let activeScrim: HTMLElement | null = null;
let activeRoot: Root | null = null;

export function render(image: Blob) {
  if (activeScrim) {
    activeScrim.remove();
  }
  const host = document.createElement("div");
  document.body.appendChild(host);
  const scrim = document.createElement("div");
  host.attachShadow({ mode: "closed" }).appendChild(scrim);
  activeScrim = scrim;
  activeRoot = createRoot(scrim);
  activeRoot.render(
    <Popup
      onClose={() => {
        activeScrim?.remove();
        activeScrim = null;
        activeRoot = null;
      }}
    >
      <ModelLoader image={image} />
    </Popup>
  );
}
