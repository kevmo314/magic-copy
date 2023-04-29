import { DEFAULT_ENDPOINT } from "./lib/constants";

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    title: "Magic copy",
    id: "copy",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  if (!tab?.id || !info.srcUrl || info.menuItemId !== "copy") {
    return;
  }

  const response = await fetch(info.srcUrl);
  const blob = await response.blob();
  chrome.tabs.sendMessage(tab.id, {
    action: "open",
    image: {
      data: Array.from(new Uint8Array(await blob.arrayBuffer())),
      type: blob.type,
    },
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, respond) {
  switch (message.action) {
    case "embeddings":
      const body = new Blob([new Uint8Array(message.embeddings.data)], {
        type: message.embeddings.type,
      });
      chrome.storage.sync.get(
        { endpoint: DEFAULT_ENDPOINT },
        function (result) {
          fetch(result.endpoint, { method: "POST", body })
            .then((response) => response.json())
            .then((result) => respond(result[0]));
        }
      );
      return true;
    case "firefox-copy":
      console.log("firefox-copy", message.image.type, message.image.data);
      browser.clipboard.setImageData(
        message.image.data,
        message.image.type.split("/")[1]
      );
      return true;
  }
});
