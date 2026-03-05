const ACCORDION_CLOSE_DURATION = 1000;

export function smoothCloseAccordion(details: HTMLDetailsElement): void {
  if (!details.open || details.classList.contains("accordion-closing")) return;

  details.classList.add("accordion-closing");

  const finishClose = () => {
    details.removeAttribute("open");
    details.classList.remove("accordion-closing");
  };

  const wrapper = details.querySelector(
    ".hero-level-content-wrapper, .accordion-expand-wrapper"
  ) as HTMLElement | null;

  const onTransitionEnd = (e: TransitionEvent) => {
    if (e.target !== wrapper) return;
    if (e.propertyName !== "grid-template-rows") return;
    wrapper?.removeEventListener("transitionend", onTransitionEnd);
    finishClose();
  };

  wrapper?.addEventListener("transitionend", onTransitionEnd);
  setTimeout(finishClose, ACCORDION_CLOSE_DURATION + 50);
}
