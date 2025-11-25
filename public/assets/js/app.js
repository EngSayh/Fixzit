(function () {
  const DEFAULT = localStorage.getItem("fxz.lang") || "en";
  function applyLang(lang) {
    const dict = (window.FXZ_I18N && window.FXZ_I18N[lang]) || {};
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (dict[k]) el.textContent = dict[k];
    });
    localStorage.setItem("fxz.lang", lang);
  }
  window.FXZ = { setLang: applyLang };
  applyLang(DEFAULT);

  // mark active nav by hash
  const setActive = () => {
    const hash = location.hash;
    document.querySelectorAll(".side-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href").endsWith(hash));
    });
  };
  window.addEventListener("hashchange", setActive);
  setActive();

  // footer year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
