import { createRoot } from "react-dom/client";
import React from "react";
import Figma from "./components/Figma";

window.addEventListener("message", (event) => {
  const message = event.data.pluginMessage;
  if (message.action != "open") {
    return;
  }
  const image = new Blob([message.image.data]);
  const root = document.getElementById("root");
  if (!root) {
    return;
  }
  createRoot(root).render(
    <>
      <style type="text/css">
        {`
        body {
          margin: 0;
        }
        
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
        
        .magic-copy-loading {
          color: white;
          font: 14px sans-serif;
        }`}
      </style>
      <Figma image={image} />
    </>
  );
});
