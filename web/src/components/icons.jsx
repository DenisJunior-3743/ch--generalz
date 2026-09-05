const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconHome(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function IconUsers(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.3c2.4.2 4.3 2.2 4.3 4.7" />
    </svg>
  );
}

export function IconGraduationCap(props) {
  return (
    <svg {...base} {...props}>
      <path d="m3 9 9-4 9 4-9 4-9-4Z" />
      <path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" />
      <path d="M21 9v6" />
    </svg>
  );
}

export function IconBuilding(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="1" />
      <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
      <path d="M10 20.5V17h4v3.5" />
    </svg>
  );
}

export function IconBook(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5c1.6-1 4.6-1 8 0v13c-3.4-1-6.4-1-8 0Z" />
      <path d="M20 5.5c-1.6-1-4.6-1-8 0v13c3.4-1 6.4-1 8 0Z" />
    </svg>
  );
}

export function IconClipboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4.5" width="14" height="16" rx="1.5" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </svg>
  );
}

export function IconMenu(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function IconShield(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 19 6v5c0 4.6-3 7.7-7 9.1-4-1.4-7-4.5-7-9.1V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4.2" />
    </svg>
  );
}

export function IconBriefcase(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="7.5" width="17" height="11.5" rx="1.5" />
      <path d="M8.5 7.5V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v1.5" />
      <path d="M3.5 12.5h17" />
    </svg>
  );
}

export function IconUserPlus(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <path d="M18 7.5v6M15 10.5h6" />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l4.6-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" />
      <path d="m13.5 7.5 3 3" />
    </svg>
  );
}

export function IconEye(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function IconEyeOff(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9.5 9.5a3 3 0 0 0 4.2 4.2" />
      <path d="M10.6 5.6A10 10 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a13.5 13.5 0 0 1-3.3 3.9M6.2 6.9C3.5 8.8 2.5 12 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4-.85" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3.5 8.5 4.5-8.5 4.5-8.5-4.5 8.5-4.5Z" />
      <path d="m3.5 12 8.5 4.5 8.5-4.5" />
      <path d="m3.5 16 8.5 4.5 8.5-4.5" />
    </svg>
  );
}

export function IconGauge(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 16a8 8 0 1 1 16 0" />
      <path d="M12 16 16 10" />
      <circle cx="12" cy="16" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconKey(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="7.5" cy="14.5" r="4" />
      <path d="m10.5 11.5 9-9M16 6l2.5 2.5M19 3l2 2" />
    </svg>
  );
}

export function IconUserCog(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" />
      <circle cx="18" cy="9" r="2.6" />
      <path d="M18 6.3v.9M18 10.8v.9M20.4 9h-.9M16.5 9h-.9M19.7 7.3l-.6.6M16.9 9.5l-.6.6M19.7 10.7l-.6-.6M16.9 8.5l-.6-.6" />
    </svg>
  );
}

export function IconLogOut(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
      <path d="M20 12H10.5" />
      <path d="m16 8 4 4-4 4" />
    </svg>
  );
}

export function IconChevronDown(props) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 7h14" />
      <path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M7 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4L17 7" />
      <path d="M10.2 11v6M13.8 11v6" />
    </svg>
  );
}

export function IconX(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
