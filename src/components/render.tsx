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
      <style type="text/css">
        .magic-copy-toolbar {
          background: white;
          border-radius: 6px;
        }

        .magic-copy-toolbar button {
          background: white;
          color: black;
          border: none;
          padding: 0 8px;
          font: 14px sans-serif;
          cursor: pointer;
          outline: inherit;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          height: 42px;
        }

        .magic-copy-toolbar button svg {
          margin-right: 8px;
        }

        .magic-copy-toolbar button:disabled {
          color: #9f9f9f;
        }

        .magic-copy-toolbar button:hover {
          background: #eeeeee;
        }
      </style>
      <ModelLoader image={image} />
    </Popup>
  );
}
