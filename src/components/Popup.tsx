import React from "react";
import { FrameSizeContext } from "./FrameSizeContext";

export default function Popup({
  children,
  onClose,
}: React.PropsWithChildren<{ onClose: () => void }>) {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [frame, setFrame] = React.useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  React.useEffect(() => {
    const handleResize = () => {
      if (!frameRef.current) return;
      setFrame({
        width: frameRef.current.clientWidth * 0.9,
        height: frameRef.current.clientHeight * 0.9,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [frameRef]);

  // listen for escape key to close
  React.useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [onClose]);

  return (
    <div
      ref={frameRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 2147483647,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "5vw",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <FrameSizeContext.Provider value={frame}>
        <div onClick={(e) => e.stopPropagation()}>{children}</div>
      </FrameSizeContext.Provider>
    </div>
  );
}
