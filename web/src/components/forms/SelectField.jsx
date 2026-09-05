import "./forms.css";

export default function SelectField({
  label,
  error,
  options,
  placeholder = "Select...",
  ...registration
}) {
  const id = registration.name;

  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <select
        id={id}
        className={`form-input${error ? " form-input--error" : ""}`}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
        defaultValue=""
        {...registration}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="form-error" id={`${id}-error`}>
          {error.message}
        </p>
      )}
    </div>
  );
}
