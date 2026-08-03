
const input = document.getElementById("manualSearch");
const searchable = Array.from(document.querySelectorAll(".manual-article h1, .manual-article h2, .manual-article h3, .manual-article p, .manual-article li, .manual-article table, .manual-figure"));
input?.addEventListener("input", () => {
  const q = input.value.trim().toLowerCase();
  searchable.forEach((node) => {
    node.classList.toggle("hidden-by-search", Boolean(q) && !node.textContent.toLowerCase().includes(q));
  });
});
function scrollToCurrentHash() {
  if (!location.hash) return;
  const raw = location.hash.slice(1);
  let id = raw;
  try { id = decodeURIComponent(raw); } catch {}
  const target = document.getElementById(id) || document.getElementById(raw);
  if (target) target.scrollIntoView({ block: "start" });
}
window.addEventListener("load", () => setTimeout(scrollToCurrentHash, 80));
window.addEventListener("hashchange", () => setTimeout(scrollToCurrentHash, 80));
