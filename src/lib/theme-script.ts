// Plain (not "use client") so the server-rendered root layout can inline the script.

export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint so the page never flashes the wrong
 * theme. Kept tiny and dependency-free; mirrors `apply` in theme.ts.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"dark";var t=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p==="light"?"light":"dark";var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t==="dark");}catch(e){}})();`;
