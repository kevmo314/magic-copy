import { Tensor } from "onnxruntime-web";
import React from "react";
import { FrameSizeContext } from "./FrameSizeContext";
import { traceOnnxMaskToSVG } from "../lib/mask_utils";
import useImageEditor from "./hooks/useImageEditor";

const UPLOAD_IMAGE_SIZE = 1024;

export default function ModelLoader({ image }: { image: Blob }) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");

  const sandboxRef = React.useRef<HTMLIFrameElement>(null);

  const { bitmap, mask, traced, renderedImage, onClick, onUndo, isUndoable } =
    useImageEditor(image, sandboxRef.current?.contentWindow ?? null);

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
          padding: "5px",
        }}
      >
        <iframe
          ref={sandboxRef}
          src={chrome.runtime.getURL("sandbox.html")}
          style={{ display: "none" }}
        ></iframe>
        {/* toolbar */}
        <div>
          <button onClick={() => setMode("edit")} disabled={mode === "edit"}>
            Edit
          </button>
          <button
            onClick={() => setMode("preview")}
            disabled={mode === "preview"}
          >
            Preview
          </button>
        </div>
        <div>
          <button onClick={onUndo} disabled={!isUndoable}>
            Undo
          </button>
          <button
            onClick={() => {
              if (!renderedImage) return;
              navigator.clipboard.write([
                new ClipboardItem({
                  // The key is determined dynamically based on the blob's type.
                  [renderedImage.type]: renderedImage,
                } as any),
              ]);
            }}
            disabled={!renderedImage}
          >
            Copy
          </button>
          <button
            onClick={() => {
              if (!renderedImage) return;
              const a = document.createElement("a");
              a.href = URL.createObjectURL(renderedImage);
              a.download = "image.png";
              a.click();
            }}
            disabled={!renderedImage}
          >
            Download
          </button>
        </div>
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
  image: ImageBitmap;
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
    ctx.drawImage(image, 0, 0);
    if (!traced) {
      ctx.restore();
      return;
    }
    if (mode === "edit") {
      ctx.fillStyle = "rgba(0, 255, 0, 0.4)";
      ctx.globalCompositeOperation = "multiply";
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 1)";
      ctx.globalCompositeOperation = "destination-in";
    }
    for (const path of traced) {
      ctx.fill(new Path2D(path));
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
