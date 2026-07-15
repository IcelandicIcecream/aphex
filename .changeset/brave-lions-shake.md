---
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
'@aphexcms/cms-core': minor
---

Plugin capabilities now reach owners, and settings honour their own gate

Two gaps in how plugin-declared capabilities integrate with the role model.

`owner` was seeded from `ALL_CAPABILITIES`, which is core-only, so an owner could not
hold a capability declared by an installed plugin — leaving owner with strictly fewer
permissions than an `admin`, who can be granted one through the roles UI. The engine
now derives owner's set from the merged capability catalog (core built-ins plus every
plugin-declared capability) and passes it to `seedBuiltinRoles`, which takes an
optional `ownerCapabilities`. Because the boot reconcile re-seeds every org,
installing or removing a plugin is enough to bring owners in line. New orgs seed the
same way, so a freshly created org's owner isn't missing its plugins' capabilities
until the next restart.

`hasCapability` accepted only the closed core `Capability` union, so checking a
plugin-declared capability didn't type-check. It now takes `Capability | (string &
{})`, keeping autocomplete for built-ins while admitting plugin ids.

`SettingsPart.requiredCapabilities` was documented as a way to "gate a specific
plugin's settings more tightly" but was read nowhere: every plugin's settings were
reachable by anyone holding `plugin.settings.manage`. It is now enforced on both
`GET /api/plugin-settings` (which filters declarations, so the admin panel hides what
you can't manage) and `PUT /api/plugin-settings/:pluginId`. Reads were already masked,
so the exposure this closes is write: overwriting the secrets of a plugin that asked
for a narrower capability.
