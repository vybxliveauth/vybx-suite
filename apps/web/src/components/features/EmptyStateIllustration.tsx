"use client";

/**
 * Inline SVG illustrations for empty states.
 * Avoids external dependencies and matches the vybx design system.
 */

export function TicketsIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.15)" strokeWidth="1" />
      {/* Ticket body */}
      <rect x="25" y="38" width="70" height="44" rx="8" fill="rgba(124,58,237,0.12)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
      {/* Notch top */}
      <circle cx="25" cy="60" r="6" fill="var(--bg-dark, #0a0a12)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
      <circle cx="95" cy="60" r="6" fill="var(--bg-dark, #0a0a12)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
      {/* Dashed line */}
      <line x1="50" y1="42" x2="50" y2="78" stroke="rgba(124,58,237,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* Star on ticket */}
      <path d="M70 53l2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z" fill="var(--accent-primary, #ff2a5f)" opacity="0.7" />
      {/* Small decorative dots */}
      <circle cx="36" cy="50" r="2" fill="rgba(124,58,237,0.25)" />
      <circle cx="36" cy="58" r="2" fill="rgba(124,58,237,0.25)" />
      <circle cx="36" cy="66" r="2" fill="rgba(124,58,237,0.25)" />
    </svg>
  );
}

export function SearchIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.15)" strokeWidth="1" />
      {/* Magnifying glass circle */}
      <circle cx="52" cy="52" r="20" stroke="rgba(124,58,237,0.4)" strokeWidth="2.5" fill="rgba(124,58,237,0.06)" />
      {/* Glass shine */}
      <path d="M42 42a14 14 0 0 1 14-5" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round" />
      {/* Handle */}
      <line x1="66" y1="66" x2="82" y2="82" stroke="rgba(124,58,237,0.4)" strokeWidth="3" strokeLinecap="round" />
      {/* Cross/X inside glass */}
      <line x1="45" y1="45" x2="59" y2="59" stroke="var(--accent-primary, #ff2a5f)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <line x1="59" y1="45" x2="45" y2="59" stroke="var(--accent-primary, #ff2a5f)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function EventsIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background circle */}
      <circle cx="60" cy="60" r="56" fill="rgba(124,58,237,0.06)" stroke="rgba(124,58,237,0.15)" strokeWidth="1" />
      {/* Calendar body */}
      <rect x="30" y="35" width="60" height="52" rx="8" fill="rgba(124,58,237,0.1)" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" />
      {/* Calendar header */}
      <rect x="30" y="35" width="60" height="16" rx="8" fill="rgba(124,58,237,0.2)" />
      <rect x="30" y="43" width="60" height="8" fill="rgba(124,58,237,0.2)" />
      {/* Calendar rings */}
      <line x1="46" y1="30" x2="46" y2="40" stroke="rgba(124,58,237,0.4)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="74" y1="30" x2="74" y2="40" stroke="rgba(124,58,237,0.4)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Calendar dots */}
      <circle cx="44" cy="62" r="3" fill="rgba(124,58,237,0.2)" />
      <circle cx="56" cy="62" r="3" fill="rgba(124,58,237,0.2)" />
      <circle cx="68" cy="62" r="3" fill="var(--accent-primary, #ff2a5f)" opacity="0.6" />
      <circle cx="80" cy="62" r="3" fill="rgba(124,58,237,0.2)" />
      <circle cx="44" cy="76" r="3" fill="rgba(124,58,237,0.2)" />
      <circle cx="56" cy="76" r="3" fill="rgba(124,58,237,0.2)" />
      {/* Sparkle */}
      <path d="M96 28l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="var(--accent-primary, #ff2a5f)" opacity="0.5" />
    </svg>
  );
}
