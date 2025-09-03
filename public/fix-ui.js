(function () {
  function hideMarketing() {
    try {
      const needles = [
        "Next Generation Insurance",
        "For Agencies & FMOs",
        "For Agents",
        "See Pricing"
      ];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let foundParent = null;

      while (walker.nextNode()) {
        const t = (walker.currentNode.nodeValue || "").trim();
        if (!t) continue;
        if (needles.some(s => t.includes(s))) {
          foundParent = walker.currentNode.parentElement;
          break;
        }
      }

      if (foundParent) {
        // Climb to a likely section/container to hide
        let el = foundParent;
        for (let i = 0; i < 6 && el && el.parentElement; i++) {
          const cls = (el.className || "").toString().toLowerCase();
          if (el.tagName === "SECTION" || cls.includes("hero") || cls.includes("landing")) break;
          el = el.parentElement;
        }
        (el || foundParent).style.display = "none";
        console.log("[fix-ui] hid marketing section");
        return true;
      }
    } catch (e) {
      console.warn("[fix-ui] error", e);
    }
    return false;
  }

  function tick(tries = 0) {
    if (hideMarketing() || tries > 60) return; // try up to ~12s
    setTimeout(() => tick(tries + 1), 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => tick());
  } else {
    tick();
  }
})();
