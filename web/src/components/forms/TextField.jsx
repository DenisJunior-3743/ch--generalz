import { useState } from "react";
import { IconEye, IconEyeOff } from "../icons";
import "./forms.css";

export default function TextField({
  label,
  type = "text",
  error,
  placeholder,
  ...registration
}) {
  const id = registration.name;
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          placeholder={placeholder}
          className={`form-input w-full${isPassword ? " pr-9" : ""}${error ? " form-input--error" : ""}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
          {...registration}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground [&>svg]:h-[18px] [&>svg]:w-[18px]"
          >
            {revealed ? <IconEyeOff /> : <IconEye />}
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" id={`${id}-error`}>
          {error.message}
        </p>
      )}
    </div>
  );
}
