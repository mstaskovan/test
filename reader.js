(() => {
  const article = document.querySelector("#reading");
  if (!article) return;

  const root = document.documentElement;
  const portable = root.dataset.standalone === "true";
  const languageLinks = [...document.querySelectorAll(".languages [data-code]")];
  const codes = languageLinks.map((link) => link.dataset.code);
  const params = new URLSearchParams(location.search);
  const requestedLanguage = params.get("jazyk");
  const language = portable && codes.includes(requestedLanguage) ? requestedLanguage : root.dataset.language;
  const sections = [...article.querySelectorAll(":scope > section")];
  const contents = document.querySelector("#obsah");
  const entries = [...contents.querySelectorAll("[data-entry]")];
  const questionGroups = [...contents.querySelectorAll("[data-toc-group]")];
  const comparison = document.querySelector("#porovnanie");
  const form = document.querySelector("#compare-form");
  const compareButton = document.querySelector('[data-open="porovnanie"]');
  const compareStatus = document.querySelector("#compare-status");
  const singleButton = document.querySelector("#single-language");
  const compact = matchMedia("(max-width: 50rem)");
  const pager = document.querySelector(".pager");
  const backToTop = document.querySelector(".back-to-top");
  const position = document.querySelector("#reading-position");
  const header = document.querySelector(".masthead");
  const previous = pager.querySelector('[data-page="-1"]');
  const next = pager.querySelector('[data-page="1"]');
  const hideAfter = 48;
  const showAfter = 80;
  let controlsHidden = false;
  let directionOrigin = Math.max(0, window.scrollY);
  let selected = codes.filter((code) => params.get("porovnat")?.split(",").includes(code));
  if (selected.length < 2) selected = [language];
  let visibleSections = sections;
  let readingSection = null;
  let linkedSection = sections.find((section) => section.id === location.hash.slice(1));
  let comparisonAnchor = null;

  if (portable) {
    const activeLink = languageLinks.find((link) => link.dataset.code === language);
    for (const [selector, field] of [["h1", "title"], [".author", "author"], [".edition", "edition"]]) {
      const element = document.querySelector(selector);
      element.textContent = activeLink.dataset[field];
      element.lang = language;
    }
    document.title = `${activeLink.dataset.title} · Tomáš Akvinský`;
    for (const link of document.querySelectorAll("[data-download-lang]")) {
      link.hidden = link.dataset.downloadLang !== language;
    }
    document.querySelector(".downloads").addEventListener("click", (event) => {
      const link = event.target.closest("a[download]");
      if (!link || !link.href.startsWith("data:") || !URL.createObjectURL) return;
      const [header, encoded] = link.href.split(",", 2);
      const type = header.slice(5, -7);
      const raw = atob(encoded);
      const bytes = Uint8Array.from(raw, (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], {type}));
      const download = document.createElement("a");
      download.href = url;
      download.download = link.download;
      document.body.append(download);
      try {
        event.preventDefault();
        download.click();
      } finally {
        download.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    });
  }

  function updateLanguageLinks() {
    const active = (linkedSection || readingSection)?.id;
    for (const link of languageLinks) {
      const destination = new URL(link.getAttribute("href"), location.href);
      destination.searchParams.delete("porovnat");
      if (portable) destination.searchParams.set("jazyk", link.dataset.code);
      destination.hash = active && link.dataset.passages.split(" ").includes(active) ? active : "";
      link.href = destination.href;
      if (selected.length === 1 && link.dataset.code === language) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  function renderTranslations() {
    article.dataset.columns = selected.length;
    compareButton.setAttribute("aria-pressed", String(selected.length > 1));
    compareButton.textContent = selected.length > 1 ? `Porovnať (${selected.length})` : "Porovnať";

    for (const [index, section] of sections.entries()) {
      const translations = [...section.querySelectorAll(".translation")];
      const available = translations.find((block) => block.dataset.available === "true" && selected.includes(block.dataset.code));
      const preferred = translations.find((block) => block.dataset.code === language);
      const heading = preferred?.dataset.available === "true" && selected.includes(language) ? preferred : available;
      section.hidden = !available;
      entries[index].hidden = !available;
      if (heading) {
        const title = section.querySelector("h2");
        title.textContent = heading.dataset.heading;
        title.lang = heading.lang;
        const link = entries[index].querySelector("a");
        link.textContent = title.textContent;
        link.lang = title.lang;
      }
      for (const block of translations) {
        block.hidden = !selected.includes(block.dataset.code);
      }
    }
    for (const group of questionGroups) {
      group.hidden = !group.querySelector("[data-entry]:not([hidden])");
    }
    visibleSections = sections.filter((section) => !section.hidden);
    updateProgress();
  }

  function updateProgress() {
    const previousSection = readingSection;
    const marker = (controlsHidden && compact.matches ? 0 : header.offsetHeight) + 38;
    let lower = 0;
    let upper = visibleSections.length;
    while (lower < upper) {
      const middle = Math.floor((lower + upper) / 2);
      if (visibleSections[middle].getBoundingClientRect().top <= marker) lower = middle + 1;
      else upper = middle;
    }
    readingSection = visibleSections[Math.max(0, lower - 1)];
    if (readingSection !== previousSection) {
      for (const entry of entries) {
        const link = entry.querySelector("a");
        if (entry.dataset.entry === readingSection?.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
      updateLanguageLinks();
    }
    position.textContent = `${visibleSections.indexOf(readingSection) + 1} / ${visibleSections.length}`;
    previous.disabled = window.scrollY < 2;
    next.disabled = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
    backToTop.hidden = window.scrollY < window.innerHeight * 1.5;
  }

  function showComparison(languages) {
    selected = languages;
    renderTranslations();
    updateLanguageLinks();
    const url = new URL(location.href);
    if (selected.length > 1) url.searchParams.set("porovnat", selected.join(","));
    else url.searchParams.delete("porovnat");
    try {
      history.replaceState(null, "", url);
    } catch {
      // Some offline viewers restrict writes to history.
    }
    if (comparisonAnchor && !comparisonAnchor.section.hidden) {
      const {section, top} = comparisonAnchor;
      requestAnimationFrame(() => {
        window.scrollBy({top: section.getBoundingClientRect().top - top, behavior: "instant"});
        updateProgress();
      });
    }
  }

  compareButton.addEventListener("click", () => {
    updateProgress();
    const section = linkedSection && !linkedSection.hidden ? linkedSection : readingSection;
    comparisonAnchor = section ? {
      section,
      top: section === linkedSection ? header.getBoundingClientRect().bottom + 12 : section.getBoundingClientRect().top,
    } : null;
    const defaultPartner = language !== "la" && codes.includes("la") ? "la" : codes.find((code) => code !== language);
    const checked = selected.length > 1 ? selected : [language, defaultPartner];
    for (const checkbox of form.querySelectorAll("input")) checkbox.checked = checked.includes(checkbox.value);
    compareStatus.textContent = "";
    singleButton.hidden = selected.length < 2;
    comparison.showModal();
  });
  form.addEventListener("change", () => { compareStatus.textContent = ""; });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const checked = new FormData(form).getAll("language");
    if (checked.length < 2) {
      compareStatus.textContent = "Na porovnanie vyberte aspoň dva jazyky.";
      return;
    }
    comparison.close();
    showComparison(checked);
  });
  singleButton.addEventListener("click", () => {
    comparison.close();
    showComparison([language]);
  });
  compareButton.hidden = codes.length < 2;

  function setContents() {
    contents.open = !compact.matches || location.hash === "#obsah";
  }
  setContents();
  compact.addEventListener("change", setContents);
  for (const link of document.querySelectorAll('a[href="#obsah"]')) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      contents.open = true;
      const currentGroup = contents.querySelector('[aria-current="location"]')?.closest("[data-toc-group]");
      if (currentGroup) currentGroup.querySelector("details").open = true;
      location.hash = "obsah";
      contents.scrollIntoView({block: "start"});
      contents.querySelector("summary").focus({preventScroll: true});
    });
  }
  contents.addEventListener("click", (event) => {
    const link = event.target.closest("li a");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    if (compact.matches) contents.open = false;
    linkedSection = target;
    location.hash = target.id;
    target.scrollIntoView({block: "start"});
    requestAnimationFrame(() => {
      target.scrollIntoView({block: "start"});
      updateProgress();
    });
  });
  window.addEventListener("hashchange", () => {
    linkedSection = sections.find((section) => section.id === location.hash.slice(1));
    updateLanguageLinks();
  });

  function clearLinkedSection() {
    if (!linkedSection) return;
    linkedSection = null;
    updateLanguageLinks();
  }

  function turnPage(direction) {
    clearLinkedSection();
    const readableHeight = window.innerHeight - header.offsetHeight - pager.offsetHeight;
    const overlap = 32;
    window.scrollBy({
      top: direction * Math.max(readableHeight - overlap, 80),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  previous.addEventListener("click", () => turnPage(-1));
  next.addEventListener("click", () => turnPage(1));
  backToTop.addEventListener("click", () => {
    clearLinkedSection();
    if (location.hash) {
      const url = new URL(location.href);
      url.hash = "";
      try { history.replaceState(null, "", url); } catch { /* Local viewers may restrict history. */ }
    }
    window.scrollTo({
      top: 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  });
  pager.hidden = false;

  let touch = null;
  let tapDirection = 0;
  const controls = "a, button, input, select, label, summary, dialog, .search, .masthead, .pager, .contents";
  document.addEventListener("pointerdown", (event) => {
    touch = null;
    tapDirection = 0;
    if (!["touch", "pen"].includes(event.pointerType) || !event.isPrimary || event.target.closest(controls)) return;
    if (document.querySelector("dialog[open]") || root.dataset.pageAxis === "off") return;
    touch = {id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now()};
  }, {passive: true});
  document.addEventListener("pointermove", (event) => {
    if (touch && touch.id === event.pointerId && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 12) {
      touch = null;
      clearLinkedSection();
    }
  }, {passive: true});
  document.addEventListener("pointercancel", () => { touch = null; }, {passive: true});
  document.addEventListener("pointerup", (event) => {
    const start = touch;
    touch = null;
    if (!start || start.id !== event.pointerId || event.target.closest(controls)) return;
    if (performance.now() - start.time > 400 || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;
    if (!window.getSelection()?.isCollapsed || (window.visualViewport?.scale || 1) > 1.05) return;
    const vertical = root.dataset.pageAxis === "vertical";
    const ratio = vertical ? event.clientY / window.innerHeight : event.clientX / window.innerWidth;
    if (ratio < 0.3) tapDirection = -1;
    if (ratio > 0.7) tapDirection = 1;
  }, {passive: true});
  document.addEventListener("click", (event) => {
    if (!tapDirection || event.detail === 0 || event.target.closest(controls)) return;
    const direction = tapDirection;
    tapDirection = 0;
    event.preventDefault();
    requestAnimationFrame(() => turnPage(direction));
  }, {capture: true});
  window.addEventListener("wheel", clearLinkedSection, {passive: true});
  window.addEventListener("keydown", (event) => {
    if (["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "].includes(event.key) && !event.target.closest(controls)) {
      clearLinkedSection();
    }
  });

  function setControlsHidden(hidden, scrollPosition) {
    controlsHidden = hidden;
    directionOrigin = scrollPosition;
    root.classList.toggle("reading-controls-hidden", hidden);
  }

  function updateControls() {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const scrollPosition = Math.max(0, Math.min(maxScroll, window.scrollY));
    const active = document.activeElement;
    const keyboardControl = active?.matches(":focus-visible") && (header.contains(active) || pager.contains(active) || active === backToTop);
    if (scrollPosition <= 12 || keyboardControl || document.querySelector("dialog[open], .search-open")) {
      setControlsHidden(false, scrollPosition);
    } else if (controlsHidden) {
      directionOrigin = Math.max(directionOrigin, scrollPosition);
      if (directionOrigin - scrollPosition >= showAfter) setControlsHidden(false, scrollPosition);
    } else {
      directionOrigin = Math.min(directionOrigin, scrollPosition);
      if (scrollPosition - directionOrigin >= hideAfter) setControlsHidden(true, scrollPosition);
    }
  }

  for (const bar of [header, pager, backToTop]) {
    bar.addEventListener("focusin", (event) => {
      if (event.target.matches(":focus-visible")) setControlsHidden(false, Math.max(0, window.scrollY));
    });
  }

  let updatePending = false;
  function requestProgress() {
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(() => {
      updatePending = false;
      updateControls();
      updateProgress();
    });
  }
  window.addEventListener("scroll", requestProgress, {passive: true});
  window.addEventListener("resize", requestProgress);
  renderTranslations();
  updateLanguageLinks();
  const initialAnchor = document.getElementById(location.hash.slice(1));
  if (initialAnchor && !initialAnchor.hidden) requestAnimationFrame(() => initialAnchor.scrollIntoView());
})();
