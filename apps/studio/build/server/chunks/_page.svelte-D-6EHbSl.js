import { i as head } from './index5-DltsKoco.js';
import { C as Card, a as Card_header, c as Card_title, b as Card_content } from './card-title-DpOlyEWh.js';
import { C as Card_description } from './card-description-B4j6Vmwc.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './utils2-CVx6kO_W.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    head("18vx7m7", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - God Mode</title>`);
      });
    });
    $$renderer2.push(`<div class="space-y-8"><div class="hidden sm:block"><h2 class="text-xl font-semibold">General</h2> <p class="text-muted-foreground text-sm">Identify your instance and get key details.</p></div> <!---->`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Card_header($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Card_title($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Instance Information`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Card_description($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Details about this Aphex CMS instance`);
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
            $$renderer4.push(`<div class="grid gap-4"><div class="flex items-center justify-between"><span class="text-muted-foreground text-sm">Admin</span> <span class="text-sm font-medium">${escape_html(data.user.email)}</span></div></div>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-D-6EHbSl.js.map
