import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import LandingPage from "../../app/page";
import { I18nProvider } from "../../i18n/I18nProvider";
import { TranslationProvider } from "../../contexts/TranslationContext";

type Locale = "ar" | "en";

const renderLanding = (locale: Locale) => {
  const html = renderToStaticMarkup(
    <I18nProvider initialLocale={locale}>
      <TranslationProvider initialLanguage={locale}>
        <div
          style={{ background: "#f5f1ec", color: "#1f1c18", padding: "16px" }}
        >
          <LandingPage />
        </div>
      </TranslationProvider>
    </I18nProvider>,
  );
  return "<!DOCTYPE html>" + html;
};

const outDir = path.join(process.cwd(), "_artifacts");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "landing-ar.html"),
  renderLanding("ar"),
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "landing-en.html"),
  renderLanding("en"),
  "utf8",
);
console.log("Wrote HTML snapshots to", outDir);
