interface VybxMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function VybxMark({ size = 32, className, style }: VybxMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vybx-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c6ff" />
          <stop offset="100%" stopColor="#d500f9" />
        </linearGradient>
      </defs>

      <g transform="translate(0, -10)">
        <path
          d="M 110 160 L 200 290 L 280 160 L 310 190 A 15 15 0 0 0 310 230 L 200 350 L 80 160 Z"
          fill="none"
          stroke="url(#vybx-gradient)"
          strokeWidth="26"
          strokeLinejoin="miter"
        />
        <path
          d="M 160 160 L 200 220 L 230 170"
          fill="none"
          stroke="url(#vybx-gradient)"
          strokeWidth="26"
          strokeLinejoin="miter"
        />
      </g>
    </svg>
  );
}

interface VybxLogoProps extends VybxMarkProps {
  textSize?: string;
  textColor?: string;
}

export function VybxLogo({
  size = 28,
  textSize = "1.4rem",
  textColor = "var(--text-light)",
  className,
  style,
}: VybxLogoProps) {
  return (
    <span
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        textDecoration: "none",
        ...style,
      }}
    >
      <VybxMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: textSize,
          fontWeight: 900,
          letterSpacing: "-0.5px",
          color: textColor,
          lineHeight: 1,
        }}
      >
        vybx
      </span>
    </span>
  );
}
