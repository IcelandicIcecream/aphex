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
3. Enable auth system - use better auth. SHOULD WE BE AUTH AGNOSTIC? OR SHOULD WE JUST STICK WITH BETTER AUTH AND CALL IT A DAY FOR NOW. PERHAPS JUST HAVE SOME KIND OF PORTS AND ADAPTERS THING? OR PERHAPS EVEN KEEP THE AUTH TO BE IN THE APP LAYER. - we also need an authentication system for API calls. AS WELL AS CREATING "DATASETS" - i guess this extends the storage as well with signedurls?
4. Add support for Cloudflare R2 :)
5. Add support for version history - hash and shit

# Docs
1. Create docs and add it to the repo. FUMADOCS?
2. Create a guideline for what needs to be documented.
3. Create more readmes on how to use thiss.

# Architecture
1. Use turborepo for CI/CD?
2. Fix up package.jsons to properly use workspaces and aliases to avoid weird import issues
3. See how we can add first class support to shadcn components in the package - instead of actually importing, copying and then updating the imports manually.
4. I don't know how monorepos are actually structured. Probably look a bit more into it. Is this a turborepo kind of thing?
5. Publish the thingy to npm
6. CLI helper perhaps?

# Tests
1. We need some tests.. perhaps with some seeders and stuff?
2. Test with a LOOOOOOOOOOT of data.
