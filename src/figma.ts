async function main() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.closePlugin("Please select a frame or component.");
    return;
  }
  const fills = (selection[0] as GeometryMixin).fills;
  for (const paint of fills as Paint[]) {
    if (paint.type === "IMAGE" && paint.imageHash) {
      const image = figma.getImageByHash(paint.imageHash);
      if (!image) {
        figma.closePlugin("Image not found.");
        return;
      }
      const bytes = await image.getBytesAsync();
      figma.showUI(__html__);
      figma.ui.postMessage({
        action: "open",
        image: {
          data: bytes,
        },
      });
      return;
    }
  }
  figma.closePlugin("Image not found.");
}
main();
