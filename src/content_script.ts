chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action != "open") {
    return;
  }
  const image = new Blob([new Uint8Array(message.image.data)], {
    type: message.image.type,
  });
  import("./render").then(({ render }) => render(image));
});
