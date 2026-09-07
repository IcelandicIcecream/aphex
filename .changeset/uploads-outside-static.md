---
'@aphexcms/base': minor
'@aphexcms/website': minor
---

Store local uploads outside `static/`, so `private: true` is actually private

The local storage adapter defaulted to `./static/uploads`. Everything under
`static/` is published at the site root and copied into the build output, so every
uploaded file was also reachable at `/uploads/<id>/original.jpg` — no session, no
access check — and any file present when you built shipped inside the artifact
permanently.

That is a second door to bytes the first door guards. Asset privacy is enforced by
the `/media/:id/:filename` route (`isAssetPrivate`, field-level `private`, signed
URLs) and only there, so a private asset was private in the admin and public to
anyone who guessed its path. The default is now `./uploads`, outside the served
tree, leaving `/media` as the only way to reach an asset.

Production deploys were already clear of this: the Docker, Render and Railway
configs all set `APHEX_UPLOADS_DIR=/data/uploads`. The exposure was local
development, plus any deploy that didn't set that variable.

**Upgrading:** if you have been running on the default, move your existing files so
they keep resolving — stored URLs are unchanged, only the directory moved:

```bash
mv static/uploads uploads
```

Nothing else needs updating: `getUrl()` is never called, and every asset URL is
built as `/media/:id/:filename`.
