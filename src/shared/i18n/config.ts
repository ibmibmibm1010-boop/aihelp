import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";

export const LANG_STORAGE_KEY = "app-lang";

function initialLng(): string {
  if (typeof localStorage === "undefined") {
    return "ru";
  }
  const v = localStorage.getItem(LANG_STORAGE_KEY);
  if (v === "en" || v === "ru") {
    return v;
  }
  return "ru";
}

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initialLng(),
  fallbackLng: "ru",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LANG_STORAGE_KEY, lng);
  }
});

export default i18n;
