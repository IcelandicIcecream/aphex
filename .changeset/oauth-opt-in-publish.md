---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

Connected apps can be allowed to publish. Under each app in Connected apps, a user can switch on publishing, unpublishing, deleting documents or deleting media for that app alone, if they can do it themselves. New connections still work on drafts only, disconnecting removes the switches, and an app can still never manage members, roles, keys or settings. `oauthScopeCapabilities` takes the opted-in capabilities as a third argument; `OAuthServer` gains `setAllowed` and `OAuthConnection.allowed`.
