import { useEffect, useRef } from "react";

const surfaces =
  ".home-action, .home-discovery, .person-card, .talk-card, .room-preview, .conversation-row, .note-card, .provider-card";
const controls =
  ".button, .chip, .icon-button, .home-action, .home-residence-shortcuts a, .bottom-nav > a";

/** Decorative feedback stays outside React state and never captures a gesture. */
export function useGlassEffects() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    let lit: HTMLElement | null = null;
    let frame = 0;
    const waves = new Set<HTMLElement>();
    const animations = new Set<Animation>();

    function clearLight() {
      cancelAnimationFrame(frame);
      lit?.removeAttribute("data-lit");
      lit = null;
    }
    function sync() {
      root!.dataset.motion =
        reduced.matches || document.hidden ? "still" : "active";
      if (reduced.matches || document.hidden) {
        clearLight();
        animations.forEach((animation) => animation.cancel());
        animations.clear();
        waves.forEach((wave) => wave.remove());
        waves.clear();
      }
    }
    function move(event: PointerEvent) {
      if (
        reduced.matches ||
        !finePointer.matches ||
        event.pointerType === "touch"
      )
        return;
      const surface = (event.target as Element).closest<HTMLElement>(surfaces);
      if (surface !== lit) {
        clearLight();
        lit = surface;
      }
      if (!surface) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = surface.getBoundingClientRect();
        surface.style.setProperty(
          "--light-x",
          `${event.clientX - bounds.left}px`,
        );
        surface.style.setProperty(
          "--light-y",
          `${event.clientY - bounds.top}px`,
        );
        surface.dataset.lit = "true";
      });
    }
    function press(event: PointerEvent) {
      if (reduced.matches || !event.isPrimary || event.button !== 0) return;
      const control = (event.target as Element).closest<HTMLElement>(controls);
      if (!control || control.matches(":disabled, [aria-disabled='true']"))
        return;
      // A separate, clipped layer cannot change the hit target or the scroll gesture.
      const bounds = control.getBoundingClientRect();
      const wave = document.createElement("span");
      wave.className = "tap-wave";
      wave.setAttribute("aria-hidden", "true");
      const diameter = Math.hypot(bounds.width, bounds.height) * 2;
      wave.style.setProperty("--wave-size", `${diameter}px`);
      wave.style.setProperty("--wave-x", `${event.clientX - bounds.left}px`);
      wave.style.setProperty("--wave-y", `${event.clientY - bounds.top}px`);
      control.appendChild(wave);
      waves.add(wave);
      const animation = wave.animate(
        [
          { transform: "scale(0)", opacity: 0.65 },
          { transform: "scale(1)", opacity: 0 },
        ],
        { duration: 650, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      animations.add(animation);
      animation.finished
        .catch(() => {})
        .finally(() => {
          wave.remove();
          waves.delete(wave);
          animations.delete(animation);
        });
    }
    sync();
    reduced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", clearLight);
    root.addEventListener("pointerdown", press, { passive: true });
    return () => {
      clearLight();
      animations.forEach((animation) => animation.cancel());
      waves.forEach((wave) => wave.remove());
      reduced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", clearLight);
      root.removeEventListener("pointerdown", press);
    };
  }, []);
  return ref;
}
