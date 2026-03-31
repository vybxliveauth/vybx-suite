interface VybxMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Symmetry reference (viewBox 0 0 100 90, center x=50):
 *
 *  Left outer edge  x=5   → 45 units from center
 *  Right outer edge x=95  → 45 units from center  ✓
 *  Left inner edge  x=27  → 23 units from center
 *  Right inner edge x=73  → 23 units from center  ✓
 *  Both arm widths       = 22 units              ✓
 *  Chevron left     x=36  → 14 units from center
 *  Chevron right    x=64  → 14 units from center  ✓
 *  Gap arm↔chevron       = 9 units each side      ✓
 *  Bottom tip            = (50, 82) on center axis ✓
 */
export function VybxMark({ size = 32, className, style }: VybxMarkProps) {
  const h = Math.round(size * 0.9);
  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="vybx-brand-grad"
          x1="5"
          y1="7"
          x2="95"
          y2="82"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#00BFFF" />
          <stop offset="52%"  stopColor="#9933FF" />
          <stop offset="100%" stopColor="#FF00FF" />
        </linearGradient>
      </defs>

      {/* Left outer arm — 22 px wide at top */}
      <polygon points="5,7 27,7 50,82" fill="url(#vybx-brand-grad)" />

      {/* Right outer arm — 22 px wide at top, ticket notch near outer edge */}
      <path d="M73,7 L84,7 Q88,2 92,7 L95,7 L50,82 Z" fill="url(#vybx-brand-grad)" />

      {/* Inner chevron — 28 px wide, perfectly centred */}
      <polygon points="36,7 50,52 64,7" fill="url(#vybx-brand-grad)" />
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
