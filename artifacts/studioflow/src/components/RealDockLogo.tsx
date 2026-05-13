interface RealDockLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light" | "auto";
  showWordmark?: boolean;
  className?: string;
}

export function RealDockMark({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? 20 : size === "lg" ? 36 : 28;
  const gap = size === "sm" ? 2 : size === "lg" ? 3.5 : 3;
  const r = size === "sm" ? 2 : size === "lg" ? 3 : 2.5;
  const cell = (dim - gap) / 2;

  return (
    <svg
      width={dim}
      height={dim}
      viewBox={`0 0 ${dim} ${dim}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* 2×2 grid of rounded squares — the "dock" of media assets */}
      <rect x={0}             y={0}             width={cell} height={cell} rx={r} fill="currentColor" opacity="1" />
      <rect x={cell + gap}    y={0}             width={cell} height={cell} rx={r} fill="currentColor" opacity="0.65" />
      <rect x={0}             y={cell + gap}    width={cell} height={cell} rx={r} fill="currentColor" opacity="0.45" />
      <rect x={cell + gap}    y={cell + gap}    width={cell} height={cell} rx={r} fill="currentColor" opacity="0.25" />
    </svg>
  );
}

export default function RealDockLogo({ size = "md", variant = "auto", showWordmark = true, className = "" }: RealDockLogoProps) {
  const wordmarkSize = size === "sm" ? "text-[15px]" : size === "lg" ? "text-[24px]" : "text-[18px]";
  const textColor = variant === "light" ? "text-white" : variant === "dark" ? "text-foreground" : "text-foreground";
  const markColor = variant === "light" ? "text-white" : "text-primary";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <RealDockMark size={size} className={markColor} />
      {showWordmark && (
        <span className={`${wordmarkSize} font-semibold tracking-tight leading-none ${textColor}`}>
          Real<span className="font-bold">Dock</span>
        </span>
      )}
    </div>
  );
}
