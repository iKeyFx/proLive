/**
 * Custom line icons — thin, geometric, instrument-panel flavored. No emoji, no
 * icon-font dependency. All inherit `currentColor` and take a size.
 */
type IconProps = { size?: number; className?: string };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
}

export const MarketIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M3 17l5-5 4 3 6-7" />
    <path d="M21 8h-4V4" />
  </svg>
);

export const PortfolioIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M3 9h18M9 4v16" />
  </svg>
);

export const HistoryIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

export const AccountIcon = ({ size = 20, className }: IconProps) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);

export const ArrowUp = ({ size = 14, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const ArrowDown = ({ size = 14, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

export const DashIcon = ({ size = 14, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M6 12h12" />
  </svg>
);

export const CloseIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const EyeIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.75" />
  </svg>
);

export const EyeOffIcon = ({ size = 18, className }: IconProps) => (
  <svg {...base(size, className)}>
    <path d="M4 4l16 16" />
    <path d="M10.6 6.1a10 10 0 0 1 1.4-.6c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-2.9 3.8M6.5 6.9A16.4 16.4 0 0 0 2.5 12S6 18.5 12 18.5a9.7 9.7 0 0 0 4.1-1" />
    <path d="M9.9 9.9a2.75 2.75 0 0 0 3.9 3.9" />
  </svg>
);
