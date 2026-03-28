import { i as head } from './index5-DltsKoco.js';
import { g as goto } from './client-BGGljB7r.js';
import { p as page } from './index6-DBfMzOzG.js';
import { B as Button } from './button-1bYQaKO-.js';
import { C as Card, a as Card_header, c as Card_title, b as Card_content } from './card-title-DpOlyEWh.js';
import { C as Card_description } from './card-description-B4j6Vmwc.js';
import './context-CAhUmS6w.js';
import './exports-Ci9YzwMm.js';
import './utils2-CVx6kO_W.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    page.url.searchParams.get("callbackUrl");
    head("bbbx7h", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Email Verified</title>`);
      });
    });
    $$renderer2.push(`<div class="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12"><div class="w-full max-w-md"><!---->`);
    Card($$renderer2, {
      class: "shadow-lg",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Card_header($$renderer3, {
          class: "space-y-1",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Card_title($$renderer4, {
              class: "text-center text-2xl font-bold",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Email Verified`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Card_description($$renderer4, {
              class: "text-center",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Your email has been verified successfully`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <!---->`);
        Card_content($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<div class="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center"><p class="font-medium text-green-700 dark:text-green-400">Your email address has been verified. You can now sign in.</p></div> `);
            Button($$renderer4, {
              class: "mt-6 w-full",
              onclick: () => goto(),
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Continue to Sign In`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <p class="text-muted-foreground mt-6 text-center text-xs">Aphex CMS - Built with SvelteKit</p></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-By0fDmVr.js.map
