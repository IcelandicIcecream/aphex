# UI
1. Extend image field to be able to select images.
2. Change the image preview overlay to be more like sanity's
3. Add grouping at the top - and filter functionality
4. Add customisable logo into the sidebar and favicon - make it easily customisable
5. Add the error messages after validation - per input
6. Enable icon support for documents. Lucide svelte pls.
7. When a reference is selected. When you press it, it should bring you said Document.

# Backend
1. Enable depth in documents http call - set max depth and etc.
2. Enable plugin system - enable graphql addition (shouldn't come by default, should be on plugin install)
3. Add factory supports to handle different adapters / config for Storage and DB. Start with Storage -> Cloudflare R2 | and then MySQL & Mongodb
4. Auth System - Handle ts in the app layer. That way we can utilise better-auth's built in plugins to without having to create wrappers or interfaces. | I DONT REALLY CARE THAT IT'S NOT AGNOSTIC FOR NOW
5. Add support for version history - hash and shit

# Docs
1. Create docs and add it to the repo. FUMADOCS?
2. Create a guideline for what needs to be documented.
3. Create more readmes on how to use thiss.

# Architecture
1. Publish the thingy to npm
2. CLI helper perhaps?

# Tests
1. We need some tests.. perhaps with some seeders and stuff?
2. Test with a LOOOOOOOOOOT of data.
