# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.


## Account roles — 19/10/2026

The app supports ADMIN and STUDENT (normal User). Only ADMIN can open /admin routes. User Management offers two tabs, account details and deletion of non-admin accounts. Account creation/promotion controls for the retired role have been removed, along with its notification target and translations. Unknown/retired roles fail authorization; the legacy USER spelling normalizes to STUDENT.

Regression checks: `node --test tests/authorization.test.mjs tests/adminUsersApi.test.mjs tests/accountRoles.browser.test.mjs`, `npm test`, `npm run build`. The browser tests cover English/Vietnamese, desktop/mobile, notification targets, and denied admin URLs.
