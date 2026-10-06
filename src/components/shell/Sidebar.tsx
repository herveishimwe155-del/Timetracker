"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { LogIn, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Sun, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocalStorageFlag } from "@/hooks/use-local-storage-flag";
import { signOut } from "@/lib/auth/actions";
import { signUpUrl } from "@/lib/guest";
import { useResolvedTheme, useThemePreference } from "@/lib/theme";
import { APP_NAME, LogoMark } from "./Logo";
import { footerNav, mainNav, type NavItem } from "./nav";

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "flex h-8 items-center justify-center gap-2 rounded-sm text-muted-foreground transition-colors outline-none",
        "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        active && "bg-surface text-foreground shadow-sm",
        !collapsed && "md:justify-start md:px-2",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active && "text-brand")} strokeWidth={1.75} />
      {!collapsed && <span className="hidden truncate md:inline">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({ email, guest = false }: { email: string | null; guest?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useLocalStorageFlag("sidebar-collapsed", false);
  const theme = useResolvedTheme();
  const [, setTheme] = useThemePreference();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Ctrl/Cmd + B toggles the sidebar.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed(!collapsed);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed, setCollapsed]);

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "glass flex h-full shrink-0 flex-col overflow-hidden transition-[width]",
        collapsed ? "w-12" : "w-12 md:w-52",
      )}
    >
      <div className={cn("flex h-12 items-center justify-center gap-2 border-b border-line", !collapsed && "md:justify-start md:px-3")}>
        <LogoMark />
        {!collapsed && <span className="hidden truncate font-semibold tracking-tight md:inline">{APP_NAME}</span>}
      </div>

      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 p-2">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-line p-2">
        {footerNav.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-keyshortcuts="Control+B Meta+B"
          className={cn(
            "hidden h-8 items-center gap-2 rounded-sm px-2 text-muted-foreground transition-colors outline-none md:flex",
            "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" strokeWidth={1.75} />
          ) : (
            <>
              <PanelLeftClose className="size-4" strokeWidth={1.75} />
              <span className="flex-1 text-left">Collapse</span>
              <kbd className="tabular text-xs text-muted-foreground">Ctrl B</kbd>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          title={collapsed ? `Switch to ${nextTheme} mode` : undefined}
          className={cn(
            "flex h-8 w-full items-center justify-center gap-2 rounded-sm text-muted-foreground transition-colors outline-none",
            "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
            !collapsed && "md:justify-start md:px-2",
          )}
        >
          {theme === "dark" ? <Sun className="size-4 shrink-0" strokeWidth={1.75} /> : <Moon className="size-4 shrink-0" strokeWidth={1.75} />}
          {!collapsed && <span className="hidden md:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
        {guest ? (
          <>
            <Link
              href={signUpUrl(pathname)}
              aria-label="Sign up free"
              className={cn(
                "flex h-8 w-full items-center justify-center gap-2 rounded-sm bg-brand font-medium text-primary-foreground transition-colors outline-none",
                "hover:bg-brand/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                !collapsed && "md:justify-start md:px-2",
              )}
            >
              <UserPlus className="size-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="hidden md:inline">Sign up free</span>}
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              aria-label="Sign in"
              className={cn(
                "flex h-8 w-full items-center justify-center gap-2 rounded-sm text-muted-foreground transition-colors outline-none",
                "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                !collapsed && "md:justify-start md:px-2",
              )}
            >
              <LogIn className="size-4 shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="hidden md:inline">Sign in</span>}
            </Link>
          </>
        ) : (
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Sign out"
            title={email ? `Signed in as ${email}` : undefined}
            className={cn(
              "flex h-8 w-full items-center justify-center gap-2 rounded-sm text-muted-foreground transition-colors outline-none",
              "hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
              !collapsed && "md:justify-start md:px-2",
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
            {!collapsed && (
              <span className="hidden min-w-0 flex-1 truncate text-left md:inline">Sign out</span>
            )}
          </button>
        </form>
        )}
      </div>
    </aside>
  );
}
