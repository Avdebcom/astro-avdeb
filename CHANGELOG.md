# Changelog

## 0.1.0 — 2026-11-21

- First release: `astro-avdeb` integration with `<AvdebProducts>`, `<AvdebProduct>` and `<AvdebButton>`
  components; grid, carousel, list and spotlight layouts; horizontal, hero and compact single-product
  styles; inherit / light / dark / auto themes; `--avdeb-*` design tokens with zero-specificity defaults,
  `styles: false` and an importable `astro-avdeb/styles.css`; headless `getAvdebProducts()`
  (`astro-avdeb/data`); in-memory cache with one-week stale fallback, request merging and a per-minute
  request budget; secret key / referral code from options or `AVDEB_SECRET_KEY` / `AVDEB_REF_CODE`.
