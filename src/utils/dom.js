export function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");

  setTimeout(() => {
    el.classList.add("hidden");
  }, 4000);
}
