const ICON_PATHS = {
  calendar:
    "M8 2v2m8-2v2M3 9h18M5 5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  user:
    "M15 19a6 6 0 0 0-12 0m9-11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm9 11a6 6 0 0 0-6-6m3-5a3 3 0 1 1-6 0",
  link: "m10 14 4-4m-7.5 7.5 3-3m-6-1.5a4 4 0 0 1 0-5.7l2.8-2.8a4 4 0 1 1 5.7 5.7l-.7.7m1.5 6.1.7-.7a4 4 0 1 1 5.7-5.7l-2.8 2.8a4 4 0 0 1-5.7 0",
  mail: "M4 5h16v14H4V5Zm0 0 8 7 8-7",
  phone:
    "M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 19a19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-2.9-8.6A2 2 0 0 1 4.2 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.4 2.1L8.3 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7A2 2 0 0 1 22 16.9Z",
  location: "M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  globe:
    "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.9 9h-3.2a15.7 15.7 0 0 0-1.2-5A8 8 0 0 1 19.9 11ZM12 4a13.6 13.6 0 0 1 2.5 7h-5A13.6 13.6 0 0 1 12 4ZM8.5 6a15.7 15.7 0 0 0-1.2 5H4.1A8 8 0 0 1 8.5 6ZM4.1 13h3.2a15.7 15.7 0 0 0 1.2 5A8 8 0 0 1 4.1 13Zm7.9 7a13.6 13.6 0 0 1-2.5-7h5A13.6 13.6 0 0 1 12 20Zm3.5-2a15.7 15.7 0 0 0 1.2-5h3.2a8 8 0 0 1-4.4 5Z",
  moon: "M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z",
  sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.4 6.4-1.4-1.4M7 7 5.6 5.6m12.8 0L17 7M7 17l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  shield:
    "M12 3 4 7v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V7l-8-4Zm0 7v8m-3-4h6",
  sparkle:
    "m12 3 1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8L12 3Zm7 12 .8 2 .2.4.4.2 2 .8-2 .8-.4.2-.2.4-.8 2-.8-2-.2-.4-.4-.2-2-.8 2-.8.4-.2.2-.4.8-2Z",
  check: "M20 6 9 17l-5-5"
};

function Icon({ name, className = "icon", title }) {
  const path = ICON_PATHS[name] || ICON_PATHS.sparkle;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : "true"}
      role={title ? "img" : "presentation"}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}

export { Icon };

