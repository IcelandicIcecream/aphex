---
'@aphexcms/cms-core': minor
---

A list choice can need a capability (`{ title, value, requiredCapabilities }`): the admin leaves it out on a site without it, and still shows a value already stored. An empty reference field whose every target type the site lacks is hidden, rather than showing a picker that can find and create nothing.
