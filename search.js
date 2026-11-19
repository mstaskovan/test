(() => {
  const panel = document.querySelector("[data-search]");
  const form = panel.querySelector("form");
  const input = form.elements.q;
  const results = panel.querySelector("#search-results");
  const status = panel.querySelector("#search-status");
  const toggle = document.querySelector("#show-search");
  const work = panel.dataset.search;
  const portable = document.documentElement.dataset.standalone === "true";
  const normalize = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("sk");
  const passages = searchIndex.filter((entry) => !work || entry.work === work).map((entry) => ({
    ...entry,
    searchable: normalize(`${entry.title} ${entry.section} ${entry.text}`),
  }));

  panel.hidden = false;
  toggle.hidden = false;
  toggle.setAttribute("aria-controls", "search");
  toggle.setAttribute("aria-expanded", "false");

  function closeSearch() {
    panel.classList.remove("search-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    if (panel.classList.contains("search-open")) {
      closeSearch();
      return;
    }
    panel.classList.add("search-open");
    toggle.setAttribute("aria-expanded", "true");
    input.focus({preventScroll: true});
  });

  document.addEventListener("pointerdown", (event) => {
    if (!panel.contains(event.target) && !toggle.contains(event.target)) closeSearch();
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !panel.classList.contains("search-open")) return;
    closeSearch();
    toggle.focus({preventScroll: true});
  });
  window.addEventListener("scroll", () => {
    if (document.activeElement !== input) closeSearch();
  }, {passive: true});

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
    const matches = words.length
      ? passages.filter((entry) => words.every((word) => entry.searchable.includes(word)))
      : [];
    results.replaceChildren();
    status.textContent = matches.length ? `Počet výsledkov: ${matches.length}` : "Bez výsledkov.";
    for (const match of matches.slice(0, 50)) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      const target = match.href.split("#")[1];
      link.href = portable ? `?dielo=${match.work}&jazyk=${match.code}#${target}` : match.href;
      link.lang = match.code;
      link.textContent = work ? match.section : `${match.title} · ${match.section}`;
      item.append(link, ` (${match.language})`);
      results.append(item);
    }
    if (matches.length > 50) status.textContent += " Zobrazujem prvých 50.";
  });
  results.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    closeSearch();
    const current = new URL(location.href);
    const destination = new URL(link.href);
    if (current.pathname === destination.pathname && current.search === destination.search) {
      event.preventDefault();
      location.hash = destination.hash;
      document.getElementById(destination.hash.slice(1))?.scrollIntoView();
    }
  });
})();
