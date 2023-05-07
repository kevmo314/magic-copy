import React from "react";
import useFigmaEditor from "./hooks/useFigmaEditor";
import { LeftToolbar, RightFigmaToolbar } from "./Toolbars";

const UPLOAD_IMAGE_SIZE = 1024;

export default function Figma({
  image,
  initialShowAd,
}: {
  image: Blob;
  initialShowAd: boolean;
}) {
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const [showAd, setShowAd] = React.useState(initialShowAd);

  const {
    bitmap,
    isLoading,
    traced,
    renderedImage,
    onClick,
    onUndo,
    isUndoable,
  } = useFigmaEditor(image);

  React.useEffect(() => {
    if (!bitmap) return;
    const scaleToFit = Math.min(800 / bitmap.width, 600 / bitmap.height);
    window.parent.postMessage(
      {
        pluginMessage: {
          action: "resize",
          width: Math.ceil(bitmap.width * scaleToFit),
          height:
            Math.ceil(bitmap.height * scaleToFit) + 52 + (showAd ? 52 : 0),
        },
      },
      "*"
    );
  }, [bitmap, showAd]);

  if (!bitmap) {
    return <div>Loading...</div>;
  }

  const scaleToFit = Math.min(800 / bitmap.width, 600 / bitmap.height);

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
        <RightFigmaToolbar
          onUndo={onUndo}
          isUndoDisabled={!isUndoable}
          onApply={async () => {
            if (!renderedImage) return;
            window.parent.postMessage(
              {
                pluginMessage: {
                  action: "apply",
                  image: {
                    data: await renderedImage.arrayBuffer(),
                    type: renderedImage.type,
                  },
                },
              },
              "*"
            );
          }}
          isApplyDisabled={!renderedImage}
        />
      </div>
      <Renderer
        traced={traced}
        image={bitmap}
        canvasScale={scaleToFit}
        svgScale={Math.max(bitmap.height, bitmap.width) / UPLOAD_IMAGE_SIZE}
        onMaskClick={(x, y) => {
          const w = bitmap.width;
          const h = bitmap.height;
          const IMAGE_SIZE = 500;
          const d = Math.min(w, h);
          let scale = IMAGE_SIZE / d;
          if (d * scale > 1333) {
            scale = 1333 / d;
          }
          onClick((x * scale) / scaleToFit, (y * scale) / scaleToFit, "left");
        }}
        mode={mode}
      />
      {showAd && (
        <div className="magic-copy-ad">
          <div>
            This is free, no sweat. What's a new product you'd pay us to make?{" "}
            <a href="https://forms.gle/Y7EiPpELcLtjmJrw9">
              Tell us. We're working on the next thing.
            </a>
          </div>
          <div>
            <button
              onClick={() => {
                setShowAd(false);
                window.parent.postMessage(
                  {
                    pluginMessage: { action: "hide-ad" },
                  },
                  "*"
                );
              }}
            >
              x
            </button>
          </div>
        </div>
      )}
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
