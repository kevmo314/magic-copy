async function main() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.closePlugin("Please select a frame or component.");
    return;
  }
  const fills = (selection[0] as GeometryMixin).fills as Paint[];
  for (let i = 0; i < fills.length; i++) {
    const paint = fills[i];
    if (paint.type === "IMAGE" && paint.imageHash) {
      const image = figma.getImageByHash(paint.imageHash);
      if (!image) {
        figma.closePlugin("Image not found.");
        return;
      }
      const bytes = await image.getBytesAsync();
      const size = await image.getSizeAsync();
      const scaleToFit = Math.min(800 / size.width, 600 / size.height);
      figma.showUI(__html__, {
        width: Math.ceil(size.width * scaleToFit),
        height: Math.ceil(size.height * scaleToFit) + 52,
      });
      figma.ui.postMessage({
        action: "open",
        image: {
          data: bytes,
        },
      });
      figma.ui.onmessage = (message) => {
        if (message.action === "apply") {
          const newPaint = JSON.parse(JSON.stringify(paint));
          newPaint.imageHash = figma.createImage(
            new Uint8Array(message.image.data)
          ).hash;
          const newFills = JSON.parse(JSON.stringify(fills));
          newFills[i] = newPaint;
          (selection[0] as GeometryMixin).fills = newFills;
          figma.closePlugin("Image updated.");
        }
        if (message.action === "resize") {
          figma.ui.resize(message.width, message.height);
        }
      };
      return;
    }
  }
  figma.closePlugin("Image not found.");
}
main();
