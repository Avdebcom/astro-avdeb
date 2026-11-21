# Changelog

## 0.1.1 — 2026-11-21

- Fix: cards were padded, narrowed or recoloured on blogs whose theme styles the `article` element
  (e.g. `article { padding: 1rem; max-width: 42rem }`): product cards are `<article>`s. A layout guard now
  resets them; restyle card padding and background with the new `--avdeb-card-pad` token and
  `--avdeb-card-bg`.
- Fix: themes that style `article p` (colour, size) no longer reach prices, notes, intro and disclosure,
  which made prices unreadable on dark cards. New token `--avdeb-price-size`.
- Fix: themes that underline links with an inset `box-shadow` (e.g. Drupal's Olivero) no longer draw lines
  under card titles, "View all" and buttons. The solid button's shadow is now `--avdeb-btn-shadow`.

## 0.1.0 — 2026-11-21

- First release: `astro-avdeb` integration with `<AvdebProducts>`, `<AvdebProduct>` and `<AvdebButton>`
  components; grid, carousel, list and spotlight layouts; horizontal, hero and compact single-product
  styles; inherit / light / dark / auto themes; `--avdeb-*` design tokens with zero-specificity defaults,
  `styles: false` and an importable `astro-avdeb/styles.css`; headless `getAvdebProducts()`
  (`astro-avdeb/data`); in-memory cache with one-week stale fallback, request merging and a per-minute
  request budget; secret key / referral code from options or `AVDEB_SECRET_KEY` / `AVDEB_REF_CODE`.
