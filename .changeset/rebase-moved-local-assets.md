---
'@aphexcms/cms-core': patch
'create-aphex': patch
---

Rebase persisted local-asset paths from explicitly trusted former storage roots after an uploads directory move, while continuing to reject every other path outside the active storage root. The templates now recognize their former `static/uploads` and `uploads` defaults so existing media keeps working after files are moved to `APHEX_UPLOADS_DIR`.
