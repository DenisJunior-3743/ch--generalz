import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { hasPermission } from "../../auth/permissions";
import logo from "../../assets/must-logo.png";
import {
  IconHome,
  IconUsers,
  IconGraduationCap,
  IconBuilding,
  IconBook,
  IconLayers,
  IconCalendar,
  IconGauge,
  IconClipboard,
  IconUserPlus,
  IconEdit,
  IconKey,
  IconUserCog,
  IconChevronDown,
} from "../icons";

const NAV_SECTIONS = [
  {
    key: "overview",
    label: "Overview",
    icon: IconHome,
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: IconHome,
        end: true,
        module: "overview",
        action: "read",
      },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: IconUsers,
    excludeRoles: ["student"],
    items: [
      { to: "/staff", label: "Staff", icon: IconUsers, end: true, module: "staff", action: "read" },
      {
        to: "/students",
        label: "Students",
        icon: IconGraduationCap,
        end: true,
        module: "students",
        action: "read",
      },
      {
        to: "/students/register",
        label: "Register Student",
        icon: IconUserPlus,
        module: "students",
        action: "create",
      },
    ],
  },
  {
    key: "academic",
    label: "Academic Setup",
    icon: IconBuilding,
    excludeRoles: ["student"],
    items: [
      { to: "/faculties", label: "Faculties", icon: IconBuilding, module: "faculties", action: "read" },
      { to: "/programs", label: "Programs", icon: IconBook, module: "programs", action: "read" },
      { to: "/courses", label: "Courses", icon: IconLayers, module: "courses", action: "read" },
      { to: "/semesters", label: "Semesters", icon: IconCalendar, module: "semesters", action: "read" },
      { to: "/grade-bands", label: "Grade Bands", icon: IconGauge, module: "grade_bands", action: "read" },
    ],
  },
  {
    key: "marks",
    label: "Marks",
    icon: IconClipboard,
    excludeRoles: ["student"],
    items: [
      { to: "/marks", label: "Marks", icon: IconClipboard, end: true, module: "marks", action: "read" },
      { to: "/marks/entry", label: "Marks Entry", icon: IconEdit, module: "marks", action: "create" },
    ],
  },
  {
    key: "access",
    label: "Access Control",
    icon: IconKey,
    items: [
      { to: "/users", label: "Users", icon: IconUserCog, module: "users", action: "read" },
      { to: "/permissions", label: "Roles & Permissions", icon: IconKey, module: "permissions", action: "read" },
    ],
  },
  {
    key: "my-records",
    label: "My Records",
    icon: IconGraduationCap,
    includeRoles: ["student"],
    items: [
      { to: "/my-overview", label: "Overview", icon: IconHome, end: true },
      { to: "/my-marks", label: "My Marks", icon: IconClipboard },
    ],
  },
];

function getVisibleSections(user) {
  if (!user) return [];
  return NAV_SECTIONS.map((section) => {
    if (section.excludeRoles?.includes(user.role)) return null;
    if (section.includeRoles && !section.includeRoles.includes(user.role)) return null;
    const items = section.items.filter((item) =>
      item.module ? hasPermission(user, item.module, item.action) : true,
    );
    return items.length > 0 ? { ...section, items } : null;
  }).filter(Boolean);
}

function initialOpenSections(sections, pathname) {
  const open = {};
  sections.forEach((section, index) => {
    open[section.key] = index === 0 || section.items.some((item) => item.to === pathname);
  });
  return open;
}

export default function Sidebar({ isOpen, onNavigate, swipeHandlers }) {
  const { user } = useAuth();
  const location = useLocation();
  const sections = getVisibleSections(user);

  const [openSections, setOpenSections] = useState(() =>
    initialOpenSections(sections, location.pathname),
  );

  function toggleSection(key) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col overflow-y-auto bg-navy text-white shadow-md transition-transform duration-200 ease-in-out nav:sticky nav:shadow-none nav:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      {...swipeHandlers}
    >
      <div className="flex items-center gap-3 border-b border-white/12 p-5">
        <img src={logo} alt="MUST logo" className="h-10 w-10 shrink-0 rounded-full bg-white object-contain p-1" />
        <div className="flex flex-col leading-tight">
          <strong className="text-[15px] tracking-wide">MUST</strong>
          <span className="text-xs text-white/65">Records System</span>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 p-3">
        {sections.map((section) => {
          const SectionIcon = section.icon;
          const isSectionOpen = openSections[section.key] ?? false;

          return (
            <div className="flex flex-col" key={section.key}>
              <button
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left text-white hover:bg-white/8"
                aria-expanded={isSectionOpen}
                onClick={() => toggleSection(section.key)}
              >
                <SectionIcon className="h-[18px] w-[18px] shrink-0 text-gold" />
                <span className="flex flex-1 min-w-0 flex-col leading-tight">
                  <span className="text-[13px] font-bold uppercase tracking-wide">{section.label}</span>
                </span>
                <IconChevronDown
                  className={`h-4 w-4 shrink-0 text-white/55 transition-transform duration-150 ${
                    isSectionOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isSectionOpen && (
                <div className="ml-[21px] mb-1.5 mt-0.5 flex flex-col gap-0.5 border-l border-white/14 pl-[13px]">
                  {section.items.map((item) => (
                    <NavLink
                      key={`${section.key}-${item.to}`}
                      to={item.to}
                      end={item.end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-md border-l-[3px] px-2.5 py-2 text-[13.5px] font-medium no-underline transition-colors duration-150 ${
                          isActive
                            ? "border-gold bg-gold/14 text-white"
                            : "border-transparent text-white/78 hover:bg-white/8 hover:text-white"
                        }`
                      }
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
