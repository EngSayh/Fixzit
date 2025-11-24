(async function () {
  async function inject(id, file) {
    const el = document.getElementById(id);
    if (!el) return;
    const res = await fetch(file);
    el.innerHTML = await res.text();
  }
  await inject("site-header", "partials_header.html");
  const footerInjected = inject("site-footer", "partials_footer.html");
  const sidebar = document.getElementById("site-sidebar");
  if (sidebar) {
    const res = await fetch("partials_sidebar.html");
    sidebar.innerHTML = await res.text();
  }

  // language toggles (header + footer)
  const apply = (lang) => window.FXZ.setLang(lang);
  const hdr = document.getElementById("lang-toggle");
  if (hdr)
    hdr.addEventListener("click", () =>
      apply(document.documentElement.lang === "ar" ? "en" : "ar"),
    );
  await footerInjected;
  const ftr = document.getElementById("lang-toggle-footer");
  if (ftr)
    ftr.addEventListener("click", () =>
      apply(document.documentElement.lang === "ar" ? "en" : "ar"),
    );

  // profile dropdown
  const btn = document.getElementById("profile-btn");
  const menu = document.getElementById("profile-menu");
  if (btn && menu) {
    btn.addEventListener("click", () => menu.classList.toggle("hidden"));
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target))
        menu.classList.add("hidden");
    });
  }
})();
