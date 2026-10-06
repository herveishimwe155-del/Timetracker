"use client";

import { useEffect } from "react";

/** Motion is off when the device asks for less of it or the user turned it off in Settings. */
export function motionOff(): boolean {
  return (
    document.documentElement.dataset.motion === "off" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The app's interactive motion, wired once for every page (styles in globals.css):
 * - [data-reveal] elements fade and rise into place the first time they scroll into
 *   view (set --reveal-delay on them to stagger a group).
 * - .glass panels carry a soft light that follows the pointer.
 * - [data-tilt] cards tilt toward the pointer in 3D, with a moving glare.
 * Markup opts in with attributes, so server components can use it too.
 */
export function MotionEffects() {
  // Reveal on scroll.
  useEffect(() => {
    const reveal = (el: Element) => el.setAttribute("data-revealed", "");
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll("[data-reveal]").forEach(reveal);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    const watch = (root: ParentNode) =>
      root.querySelectorAll("[data-reveal]:not([data-revealed])").forEach((el) => {
        if (motionOff()) reveal(el);
        else io.observe(el);
      });
    watch(document);
    // Pages and lists render more as you navigate and scroll; pick those up too.
    const mo = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("[data-reveal]:not([data-revealed])")) {
            if (motionOff()) reveal(node);
            else io.observe(node);
          }
          watch(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  // Pointer spotlight on glass panels, and 3D tilt on cards.
  useEffect(() => {
    let frame = 0;
    let panel: HTMLElement | null = null;
    let card: HTMLElement | null = null;

    const leavePanel = () => {
      panel?.removeAttribute("data-spot");
      panel = null;
    };
    const leaveCard = () => {
      if (!card) return;
      card.removeAttribute("data-tilting");
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card = null;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target instanceof Element ? event.target : null;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (motionOff()) {
          leavePanel();
          leaveCard();
          return;
        }
        const nextPanel = target?.closest<HTMLElement>(".glass") ?? null;
        if (nextPanel !== panel) leavePanel();
        if (nextPanel) {
          const r = nextPanel.getBoundingClientRect();
          nextPanel.style.setProperty("--mx", `${(event.clientX - r.left).toFixed(0)}px`);
          nextPanel.style.setProperty("--my", `${(event.clientY - r.top).toFixed(0)}px`);
          nextPanel.setAttribute("data-spot", "");
          panel = nextPanel;
        }

        const nextCard = target?.closest<HTMLElement>("[data-tilt]") ?? null;
        if (nextCard !== card) leaveCard();
        if (nextCard) {
          const r = nextCard.getBoundingClientRect();
          const px = (event.clientX - r.left) / r.width;
          const py = (event.clientY - r.top) / r.height;
          const max = Number(nextCard.dataset.tilt) || 8;
          nextCard.style.setProperty("--rx", `${((0.5 - py) * max).toFixed(2)}deg`);
          nextCard.style.setProperty("--ry", `${((px - 0.5) * max).toFixed(2)}deg`);
          nextCard.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
          nextCard.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
          nextCard.setAttribute("data-tilting", "");
          card = nextCard;
        }
      });
    };
    const onLeaveWindow = () => {
      cancelAnimationFrame(frame);
      leavePanel();
      leaveCard();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeaveWindow);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
      onLeaveWindow();
    };
  }, []);

  return null;
}
