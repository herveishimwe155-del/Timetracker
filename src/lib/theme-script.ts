// Plain (not "use client") so the server-rendered root layout can inline the script.

export const THEME_KEY = "theme";

/** "0" turns motion effects off (Settings → Appearance); read here so the first paint is right. */
export const MOTION_KEY = "motion";

/**
 * Runs in <head> before the first paint so the page never flashes the wrong
 * theme. Kept tiny and dependency-free; mirrors `apply` in theme.ts.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p==="light"?"light":"dark";var d=document.documentElement;d.dataset.theme=t;d.classList.add("dark");if(localStorage.getItem("${MOTION_KEY}")==="0")d.dataset.motion="off";}catch(e){}})();`;
