// Section changes keep the current viewport, including while a shorter view loads.
export function preserveAdminViewport(href: string) {
  const main = document.querySelector<HTMLElement>(".admin-main");
  if (!main) return;
  main.dataset.preserveViewport = new URL(href, window.location.href).pathname;
  const top = main.getBoundingClientRect().top + window.scrollY;
  main.style.minHeight = `${Math.max(0, Math.ceil(window.scrollY + window.innerHeight - top))}px`;
}
