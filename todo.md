# UI
1. Extend image field to be able to select images.
2. Change the image preview overlay to be more like sanity's
3. Add grouping at the top - and filter functionality
4. [Complex] Handle more nested UI. For example, can we get types that are SUPER nested? I think sanity actually has support for quite nested schemaTypes, it just folds to the side. (NEED SOME KIND OF SYSTEM TO HANDLE THIS AS WELL)
5. Modal should actually have autosave as well and proper validation. not sure if the validation works for modals. (DOUBLE CHECK)
6. Very buggy ArrayField. and also its super ugly. Perhaps change it to a button and a dropdown? Rather than a select. Select boxes SUUUUCK
7. Review how state is managed currently
8. Add customisable logo into the sidebar and favicon - make it easily customisable
9. Add the error messages after validation - per input
10. Enable icon support for documents. Lucide svelte pls.
11. When a reference is selected. When you press it, it should bring you said Document.

# Backend
1. Enable depth in documents http call - set max depth and etc.
2. Enable plugin system - enable graphql addition (shouldn't come by default, should be on plugin install)
3. Add factory supports to handle different adapters / config for Storage and DB. Start with Storage -> Cloudflare R2 | and then MySQL
4. Auth System - Handle ts in the app layer. That way we can utilise better-auth's built in plugins to without having to create wrappers or interfaces.
6. Add support for version history - hash and shit

# Docs
1. Create docs and add it to the repo. FUMADOCS?
2. Create a guideline for what needs to be documented.
3. Create more readmes on how to use thiss.

# Architecture
5. Publish the thingy to npm
6. CLI helper perhaps?

# Tests
1. We need some tests.. perhaps with some seeders and stuff?
2. Test with a LOOOOOOOOOOT of data.
