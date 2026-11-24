const paths = {
  home: "M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9",
  discover: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM16 8l-2 6-6 2 2-6 6-2Z",
  bookings: "M7 3v4m10-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 10h3m3 0h2",
  chats: "M5 17l-2 4 5-2h9a4 4 0 0 0 4-4V7a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6c0 2 1 3 2 4Zm3-8h8m-8 4h5",
  team: "M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m10-13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm5 1v6m-3-3h6",
  shield: "M12 22s7-4 7-10V5l-7-3-7 3v7c0 6 7 10 7 10Zm-3-10 2 2 4-4",
  location: "M20 10c0 5-8 11-8 11s-8-6-8-11a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  grid: "M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z",
} as const;

export function PlusOneIcon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
