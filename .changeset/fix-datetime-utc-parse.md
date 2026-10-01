---
'@aphexcms/cms-core': patch
---

Fix `convertDateTimeToISO` reading an ISO `...Z` datetime in the server's local time zone instead of UTC. The `[Z]` in the dayjs format string is a literal character, not the UTC marker, so `dayjs(value, 'YYYY-MM-DDTHH:mm:ss[Z]', true)` parsed the wall-clock digits in whatever zone the process runs in. A server not running in UTC stored every datetime field shifted by its own offset. Parse with `dayjs.utc(...)` instead.
