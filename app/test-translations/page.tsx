"use client";

import { useTranslation } from "@/contexts/TranslationContext";
import { useAutoTranslator } from "@/i18n/useAutoTranslator";

export default function TranslationTestPage() {
  const { t, language } = useTranslation();
  const auto = useAutoTranslator("testTranslations");

  const testKeys = [
    "app.fm",
    "app.souq",
    "app.aqar",
    "app.switchApplication",
    "nav.dashboard",
    "common.brand",
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {auto("Translation Test Page", "title")}
      </h1>

      <div className="mb-4 p-4 bg-primary/10 rounded">
        <strong>{auto("Current Language:", "currentLanguage")}</strong>{" "}
        {language}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">
          {auto("Translation Keys Test:", "section.keys")}
        </h2>

        {testKeys.map((key) => (
          <div key={key} className="p-4 border rounded">
            <div className="font-mono text-sm text-gray-600 mb-2">
              {auto("Key:", "section.keyLabel")}{" "}
              <code className="bg-gray-200 px-2 py-1 rounded">{key}</code>
            </div>
            <div className="text-lg font-semibold">
              {auto("Translation:", "section.translationLabel")}{" "}
              <span className="text-primary">
                {t(key, auto("❌ MISSING", "section.missing"))}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-warning/10 rounded">
        <h3 className="font-bold mb-2">
          {auto("Instructions:", "instructions.title")}
        </h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            {auto(
              'If you see "❌ MISSING", the translation key does not exist.',
              "instructions.step1",
            )}
          </li>
          <li>
            {auto(
              "If you see the localized text, the translation is working.",
              "instructions.step2",
            )}
          </li>
          <li>
            {auto(
              "Try switching language using the TopBar language selector.",
              "instructions.step3",
            )}
          </li>
        </ol>
      </div>
    </div>
  );
}
