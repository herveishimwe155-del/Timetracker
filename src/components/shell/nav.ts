import { BarChart3, Briefcase, Clock, FolderKanban, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { href: "/timer", label: "Timer", icon: Clock },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Briefcase },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export const footerNav: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];
