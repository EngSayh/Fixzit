# Language Selector Requirements

The language selector enables users to view Fixzit content in their preferred language across web and mobile clients.

## Supported Locales (Must-Pass)
- English (`en-US`) and Spanish (`es-MX`) are GA.
- French (`fr-CA`) is beta behind the `beta.frLocale` feature flag.
- Default fallback is `en-US` whenever a translation string is missing.

## UX Behavior
- The selector lives in the top navigation for desktop and within the profile drawer on mobile.
- Selecting a language persists the choice in local storage and syncs to the user profile when authenticated.
- After selection, the interface reloads copy without a full page refresh; use the internationalization context provider.
- The selector shows language name in the current locale plus the native name (e.g., “Spanish · Español”).

## Accessibility Requirements
- Component must be keyboard navigable with arrow keys and `Enter` to confirm.
- Announce the active language using `aria-live="polite"` after a change.
- Provide high contrast focus outlines consistent with the design system.

## Telemetry
- Emit `language.change` events containing `from`, `to`, and `source` (e.g., `nav`, `profileDrawer`).
- Log missing translation keys to the `i18n.missing` channel for monitoring.

## QA Must-Pass
- Automated tests confirm persistence across sessions and fallback behavior.
- Visual regression coverage for the selector in desktop and mobile breakpoints.
