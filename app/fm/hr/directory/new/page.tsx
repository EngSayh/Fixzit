import { getMergedDictionaries } from "@/i18n/getDictionary";
import type { Locale } from "@/i18n/config";
import { getServerI18n } from "@/lib/i18n/server";
import NewEmployeePageClient from "./NewEmployeePageClient";

export default async function HRDirectoryCreatePage() {
  const { locale } = await getServerI18n();
  const dictionary = await getMergedDictionaries(locale as Locale, [
    "fm",
    "hr",
    "misc",
  ]);

  return (
    <NewEmployeePageClient
      locale={locale as Locale}
      dictionary={dictionary}
    />
  );
}
