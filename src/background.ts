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
