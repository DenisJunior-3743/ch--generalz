export default function Stepper({ steps, current }) {
  return (
    <div className="mb-5 flex items-center">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === current;
        const isDone = stepNumber < current;

        return (
          <div className="flex flex-none items-center" key={label}>
            <span
              className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold ${
                isActive || isDone
                  ? "border-navy bg-navy text-white"
                  : "bg-background text-muted-foreground"
              }`}
            >
              {isDone ? "✓" : stepNumber}
            </span>
            <span
              className={`mx-2.5 whitespace-nowrap text-xs font-medium ${
                isActive ? "font-semibold text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {stepNumber < steps.length && <span className="mr-2.5 h-px w-10 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
