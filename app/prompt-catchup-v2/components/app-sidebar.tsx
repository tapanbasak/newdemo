"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useBrowse } from "./browse-context";

/**
 * Left navigation shell for Prompt Hub v2 (matches docs/screens/pdf 1.pdf).
 * ACTIONS/RESOURCES are links (some are #-placeholders until later phases).
 * GUIDE items are group filters — clicking narrows the home grid to a category
 * slug, mirroring v1's group chips. Slugs come from GET /api/home groups[].
 */
type LinkItem = { kind: "link"; label: string; href: string; icon: ReactNode };
type GroupItem = { kind: "group"; label: string; slug: string; icon: ReactNode };
type NavItem = LinkItem | GroupItem;
type NavGroup = { heading: string; items: NavItem[] };

function Icon({ path }: { path: ReactNode }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Actions",
    items: [
      { kind: "link", label: "Share a Prompt", href: "#", icon: <Icon path={<><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 3v13" /><path d="m8 7 4-4 4 4" /></>} /> },
      { kind: "link", label: "Certify a Prompt", href: "#", icon: <Icon path={<><path d="M12 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="m8.5 13-1.5 7 5-3 5 3-1.5-7" /></>} /> },
      { kind: "link", label: "Browse Prompts", href: "/prompt-catchup-v2", icon: <Icon path={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>} /> },
      { kind: "link", label: "Add an Assistant", href: "#", icon: <Icon path={<><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 12-6.9" /><path d="M18 14v6M15 17h6" /></>} /> },
    ],
  },
  {
    heading: "Guide",
    items: [
      { kind: "group", label: "My Likes", slug: "my-upvotes", icon: <Icon path={<path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20z" />} /> },
      { kind: "group", label: "Assistants", slug: "agents", icon: <Icon path={<><circle cx="9" cy="9" r="3" /><circle cx="16" cy="15" r="3" /></>} /> },
      { kind: "group", label: "Agent", slug: "agent", icon: <Icon path={<><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M12 3v4M9 13h.01M15 13h.01" /></>} /> },
      { kind: "group", label: "Tasks", slug: "apps", icon: <Icon path={<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></>} /> },
      { kind: "group", label: "Roles", slug: "roles", icon: <Icon path={<><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0 1 16 0" /></>} /> },
      { kind: "group", label: "Business Organization", slug: "business-org", icon: <Icon path={<><rect x="4" y="8" width="16" height="12" rx="1" /><path d="M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></>} /> },
      { kind: "group", label: "Functions", slug: "functions", icon: <Icon path={<><path d="M4 7h16M4 12h16M4 17h10" /></>} /> },
    ],
  },
  {
    heading: "Resources",
    items: [
      { kind: "link", label: "About", href: "#", icon: <Icon path={<><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></>} /> },
      { kind: "link", label: "FAQ", href: "#", icon: <Icon path={<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 17h.01" /></>} /> },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { group, setGroup, toggleGroup } = useBrowse();

  return (
    <nav className="v2-sidebar" aria-label="Primary">
      <Link href="/prompt-catchup-v2" className="v2-brand" onClick={() => setGroup(null)}>
        <span className="v2-brand-citi">citi</span>
        <span className="v2-brand-name">Prompt Hub</span>
        <span className="v2-brand-chat" aria-hidden="true">
          <Icon path={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />} />
        </span>
      </Link>

      {NAV_GROUPS.map((navGroup) => (
        <div className="v2-nav-group" key={navGroup.heading}>
          <p className="v2-nav-heading">{navGroup.heading}</p>
          {navGroup.items.map((item) => {
            if (item.kind === "group") {
              const isActive = group === item.slug;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`v2-nav-item${isActive ? " active" : ""}`}
                  onClick={() => toggleGroup(item.slug)}
                  aria-pressed={isActive}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            }
            // Browse Prompts is active on the home grid when no group filter is set.
            const isActive =
              item.label === "Browse Prompts" && pathname === "/prompt-catchup-v2" && group === null;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`v2-nav-item${isActive ? " active" : ""}`}
                onClick={item.label === "Browse Prompts" ? () => setGroup(null) : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
