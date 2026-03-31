/**
 * VYBX brand mark and logo lockup.
 *
 * VybxMark – SVG icon only (the V with ticket notch + gradient)
 * VybxLogo – icon + "vybx" wordmark side by side
 */

interface VybxMarkProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * The VYBX icon mark: a V-shape composed of two outer arms + one inner
 * chevron, with a ticket notch on the upper-right arm.
 * Gradient runs top-left (cyan) → centre (violet) → bottom-right (magenta).
 *
 * A fixed gradient ID is intentional — multiple instances on the same page
 * all define the same gradient, which is harmless and avoids the need for
 * a client-side hook just to generate unique IDs.
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
          x1="6"
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

      {/* Left outer arm */}
      <polygon
        points="6,7 28,7 50,82"
        fill="url(#vybx-brand-grad)"
      />

      {/* Right outer arm with ticket notch on the top-right corner */}
      <path
        d="M72,7 L83,7 Q86,2 89,7 L95,7 L50,82 Z"
        fill="url(#vybx-brand-grad)"
      />

      {/* Inner chevron — creates the nested-V depth effect */}
      <polygon
        points="36,7 50,52 64,7"
        fill="url(#vybx-brand-grad)"
      />
    </svg>
  );
}

interface VybxLogoProps extends VybxMarkProps {
  /** Font size for the wordmark. Defaults to "1.4rem". */
  textSize?: string;
  /** Text colour for the wordmark. Defaults to var(--text-light). */
  textColor?: string;
}

/**
 * Full logo lockup: icon mark + "vybx" wordmark.
 */
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
