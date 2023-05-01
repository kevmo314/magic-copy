import React from "react";
import { FrameSizeContext } from "./FrameSizeContext";
import useFigmaEditor from "./hooks/useFigmaEditor";
import { LeftToolbar, RightToolbar } from "./Toolbars";

const UPLOAD_IMAGE_SIZE = 1024;

export default function Figma({ image }: { image: Blob }) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");

  const {
    bitmap,
    isLoading,
    traced,
    renderedImage,
    onClick,
    onUndo,
    isUndoable,
  } = useFigmaEditor(image);

  if (!bitmap) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "row",
          padding: "5px 0",
        }}
      >
        <LeftToolbar mode={mode} onModeChange={setMode} />
        {isLoading && (
          <div className="magic-copy-loading">Loading embeddings...</div>
        )}
        <RightToolbar
          onUndo={onUndo}
          isUndoDisabled={!isUndoable}
          onCopy={async () => {
            if (!renderedImage) return;
            if (typeof ClipboardItem === "undefined") {
              // Firefox :\ render the image and copy it to the clipboard
              const data = {
                action: "firefox-copy",
                image: {
                  data: await renderedImage.arrayBuffer(),
                  type: renderedImage.type,
                },
              };
              chrome.runtime.sendMessage(data);
              return;
            }
            navigator.clipboard.write([
              new ClipboardItem({
                // The key is determined dynamically based on the blob's type.
                [renderedImage.type]: renderedImage,
              } as any),
            ]);
          }}
          isCopyDisabled={!renderedImage}
          onDownload={() => {
            if (!renderedImage) return;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(renderedImage);
            a.download = "image.png";
            a.click();
          }}
          isDownloadDisabled={!renderedImage}
        />
      </div>
      <FrameSizeContext.Consumer>
        {(frame) => {
          const scaleToFit = Math.min(
            frame.width / bitmap.width,
            frame.height / bitmap.height
          );
          return (
            <Renderer
              traced={traced}
              image={bitmap}
              canvasScale={scaleToFit}
              svgScale={
                Math.max(bitmap.height, bitmap.width) / UPLOAD_IMAGE_SIZE
              }
              onMaskClick={(x, y) => {
                const w = bitmap.width;
                const h = bitmap.height;
                const IMAGE_SIZE = 500;
                const d = Math.min(w, h);
                let scale = IMAGE_SIZE / d;
                if (d * scale > 1333) {
                  scale = 1333 / d;
                }
                onClick(
                  (x * scale) / scaleToFit,
                  (y * scale) / scaleToFit,
                  "left"
                );
              }}
              mode={mode}
            />
          );
        }}
      </FrameSizeContext.Consumer>
    </>
  );
}

function Renderer({
  traced,
  image,
  canvasScale,
  svgScale,
  onMaskClick,
  mode,
}: {
  traced: string[] | null;
  image: HTMLImageElement;
  canvasScale: number;
  svgScale: number;
  onMaskClick: (x: number, y: number) => void;
  mode: "edit" | "preview";
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
    if (mode === "edit") {
      ctx.drawImage(image, 0, 0);
      if (!traced) {
        ctx.restore();
        return;
      }
      ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
      ctx.globalCompositeOperation = "multiply";
      for (const path of traced) {
        ctx.fill(new Path2D(path));
      }
    } else {
      if (!traced) {
        ctx.drawImage(image, 0, 0);
        ctx.restore();
        return;
      }
      for (const path of traced) {
        ctx.fill(new Path2D(path));
      }
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.globalCompositeOperation = "source-in";
      ctx.drawImage(image, 0, 0);
    }
    ctx.restore();
  }, [image, traced, mode, canvasScale, svgScale]);

  const width = Math.round(image.width * canvasScale);
  const height = Math.round(image.height * canvasScale);

  return (
    <div
      style={{
        position: "relative",
        width: width,
        height: height,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: -1,
          width: width,
          height: height,
          background:
            "repeating-conic-gradient(#AAAAAA 0% 25%, white 0% 50%) 50% / 20px 20px",
        }}
      ></div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={(e) => {
          if (mode !== "edit") return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          onMaskClick(x, y);
        }}
      />
    </div>
  );
}
