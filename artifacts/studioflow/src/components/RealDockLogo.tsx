interface RealDockLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light" | "auto";
  showWordmark?: boolean;
  className?: string;
}

const SIZE_HEIGHT: Record<string, number> = {
  sm: 24,
  md: 34,
  lg: 50,
};

export function RealDockMark({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const h = SIZE_HEIGHT[size] ?? 34;
  return (
    <img
      src="/logo.png"
      alt="RealDock"
      height={h}
      style={{ height: h, width: "auto", objectFit: "contain", userSelect: "none" }}
      className={className}
      draggable={false}
    />
  );
}

export default function RealDockLogo({ size = "md", className = "" }: RealDockLogoProps) {
  const h = SIZE_HEIGHT[size] ?? 34;
  return (
    <img
      src="/logo.png"
      alt="RealDock"
      height={h}
      style={{ height: h, width: "auto", objectFit: "contain", userSelect: "none" }}
      className={className}
      draggable={false}
    />
  );
}
