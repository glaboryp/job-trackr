# Security advisories

## GHSA-mrhx-c7xc-m3w5: Zod constrained collection denial of service

`@insforge/sdk@1.5.2` depends on `@insforge/shared-schemas@1.2.1`, which
requires Zod 3 and resolves `zod@3.25.76`. The advisory is fixed only in Zod
4.6.6 or newer. Forcing Zod 4 through an override would violate Insforge's
declared dependency range and can break API response validation at runtime.

The advisory is temporarily ignored by `pnpm.auditConfig` while waiting for an
Insforge release that supports a patched Zod version or provides a Zod 3
backport. The CI audit still fails for any other high-severity advisory.
