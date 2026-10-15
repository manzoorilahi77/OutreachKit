type P = { className?: string };
const base = {
  width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

export const CopyIcon = ({ className }: P) => (
  <svg {...base} className={className}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
);
export const CheckIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const AlertIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.5v.01" /></svg>
);
export const SunIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></svg>
);
export const MoonIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
);
export const MapPinIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const GlobeIcon = ({ className }: P) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>
);
export const ArrowRightIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const WhatsAppIcon = ({ className }: P) => (
  <svg {...base} className={className}><path d="M4 20l1.3-4.2A8 8 0 1 1 8.3 18.8z" /><path d="M9.2 8.6c.3 2.6 2.6 5.1 5.4 5.7l1.2-1.3-2-1-.9.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.9-1-2z" /></svg>
);
