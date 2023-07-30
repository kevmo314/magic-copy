import React from "react";
import { pairwiseImageCrop } from "../lib/crop";
import { LeftToolbar, RightFigmaToolbar } from "./Toolbars";
import useFigmaEditor from "./hooks/useFigmaEditor";
import { toDataUrl } from "../lib/debug";

const UPLOAD_IMAGE_SIZE = 1024;

export default function Figma({
  image: initialImage,
  initialShowAd,
}: {
  image: Blob;
  initialShowAd: boolean;
}) {
  const [image, setImage] = React.useState(initialImage);
  const [mode, setMode] = React.useState<"edit" | "preview">("edit");
  const [showAd, setShowAd] = React.useState(initialShowAd);

  const {
    bitmap,
    isLoading,
    traced,
    maskImage,
    originalImage,
    renderedImage,
    onClick,
    onReset,
    onUndo,
    isUndoable,
  } = useFigmaEditor(image);

  const [inpaintingProgress, setInpaintingProgress] = React.useState(1.0);

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

  console.log(inpaintingProgress);

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
            const appliedImage = renderedImage ?? image;
            window.parent.postMessage(
              {
                pluginMessage: {
                  action: "apply",
                  image: {
                    data: await appliedImage.arrayBuffer(),
                    type: appliedImage.type,
                  },
                },
              },
              "*"
            );
          }}
          isApplyDisabled={false}
          onErase={async () => {
            console.log(inpaintingProgress);
            if (!maskImage || !originalImage || inpaintingProgress !== 1) return;
            const cropped = await pairwiseImageCrop(originalImage, maskImage,
              {
                width: bitmap.width, height: bitmap.height
              }, {
              width: 512, height: 512
            });
            if (!cropped) {
              console.log('could not crop, no mask');
              return;
            }
            let progress = 0;
            let timer = 0;
            const updateProgress = () => {
              progress += 0.03;
              setInpaintingProgress(progress);
              if (progress < 0.8) {
                timer = setTimeout(updateProgress, 1000);
              }
            }
            updateProgress();
            // make a post request to the server
            const formData = new FormData();
            formData.append("image", cropped.original);
            formData.append("mask", cropped.mask);
            const response = await fetch("https://magic-cut.kevmo314.com/", {
              method: "POST",
              body: formData,
            });
            const blob = await response.blob();
            // patch the original image
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(await createImageBitmap(image), 0, 0);
            ctx.drawImage(await createImageBitmap(blob), cropped.startX, cropped.startY);
            // render the new image
            const patched = await canvas.convertToBlob();
            if (!patched) return;
            setImage(patched);
            onReset();
            setInpaintingProgress(1.0);
            setTimeout(() => {
              setInpaintingProgress(0.0);
            }, 1000);
            if (timer) {
              clearTimeout(timer);
            }
          }}
          isEraseDisabled={!maskImage || !originalImage}
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
        mode={mode}>
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: inpaintingProgress > 0 && inpaintingProgress < 1 ? "6px" : 0,
          transition: "height 0.2s ease-in-out",
          backgroundColor: "rgba(62, 67, 195, 0.31)",
        }}>
          <div style={{
            backgroundColor: "#3E43C3",
            height: "100%",
            width: `${inpaintingProgress * 100}%`,
            transition: "width 1s linear",
          }}>
          </div>
        </div>
      </Renderer>
      {showAd && (
        <div className="magic-copy-ad">
          <div>
            <a href="https://forms.gle/Y7EiPpELcLtjmJrw9">Give us feedback.</a>
            We're working on the next thing.
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
  children,
}: React.PropsWithChildren<{
  traced: string[] | null;
  image: HTMLImageElement;
  canvasScale: number;
  svgScale: number;
  onMaskClick: (x: number, y: number) => void;
  mode: "edit" | "preview";
}>) {
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
      {children}
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
