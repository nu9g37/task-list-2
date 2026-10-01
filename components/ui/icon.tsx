const paths = {
  grid: <><rect x="3" y="3" width="6" height="6" rx="1" /><rect x="15" y="3" width="6" height="6" rx="1" /><rect x="3" y="15" width="6" height="6" rx="1" /><rect x="15" y="15" width="6" height="6" rx="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
  folder: <path d="M3 7V5a2 2 0 0 1 2-2h5l3 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  right: <path d="m9 6 6 6-6 6" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  more: <><circle cx="5" cy="12" r=".6" /><circle cx="12" cy="12" r=".6" /><circle cx="19" cy="12" r=".6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8.5a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2.5M12 17h.01" /></>,
} as const;

export type IconName = keyof typeof paths;
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
