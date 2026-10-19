import { BarChart3, Briefcase, Clock, FolderKanban, LayoutDashboard, Settings, Tag, Target, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = { title: string; items: NavItem[] };

/** The sidebar, in sections like Toggl's: Track, Analyze, Manage. */
export const navSections: NavSection[] = [
  {
    title: "Track",
    items: [
      { href: "/overview", label: "Overview", icon: LayoutDashboard },
      { href: "/timer", label: "Timer", icon: Clock },
    ],
  },
  { title: "Analyze", items: [{ href: "/reports", label: "Reports", icon: BarChart3 }] },
  {
    title: "Manage",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/clients", label: "Clients", icon: Briefcase },
      { href: "/tags", label: "Tags", icon: Tag },
      { href: "/goals", label: "Goals", icon: Target },
    ],
  },
];

export const mainNav: NavItem[] = navSections.flatMap((s) => s.items);

export const footerNav: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];
