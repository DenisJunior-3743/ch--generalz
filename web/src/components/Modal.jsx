import { useEffect } from "react";
import { IconX } from "./icons";

const MAX_WIDTH = {
  md: "max-w-md",
  lg: "max-w-2xl",
};

export default function Modal({ title, onClose, children, size = "md" }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1126]/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[calc(100vh-2rem)] w-full ${MAX_WIDTH[size]} overflow-y-auto rounded-lg bg-surface p-6 shadow-md`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-base text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]"
          >
            <IconX />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
