import { i as head, s as spread_props } from './index5-DltsKoco.js';
import { p as page } from './index6-DBfMzOzG.js';
import './exports-Ci9YzwMm.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './client-BGGljB7r.js';
import { B as Button } from './button-1bYQaKO-.js';
import { I as Input } from './input-BofgIw5Q.js';
import { L as Label } from './label-5D2TW-nG.js';
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title } from './index9-DT6mVqr6.js';
import './date-utils-xyIWAIQq.js';
import './logger-C1WBmfZZ.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import { D as Dialog_trigger, a as Dialog_description, b as Dialog_footer } from './dialog-trigger-CprxzeZo.js';
import { O as OrganizationsList } from './OrganizationsList-kKYs_FEC.js';
import './utils2-CVx6kO_W.js';
import './create-id-BLMzD-FL.js';
import './dialog-BO7xkDHk.js';
import './_commonjsHelpers-C1uiShF5.js';
import './events-C5y5VZ_W.js';
import './dialog-description-BCqoT53F.js';
import './Icon-DO-BLZpI.js';

function CreateOrganization($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let open = false;
    let name = "";
    let slug = "";
    let isSubmitting = false;
    let error = null;
    function generateSlug(text) {
      return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function handleNameInput(event) {
      const target = event.target;
      name = target.value;
      if (!slug || slug === generateSlug(name.slice(0, -1))) {
        slug = generateSlug(name);
      }
    }
    function handleSlugInput(event) {
      const target = event.target;
      slug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }
    function resetForm() {
      name = "";
      slug = "";
      error = null;
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Root($$renderer3, {
        onOpenChange: (v) => !v && resetForm(),
        get open() {
          return open;
        },
        set open($$value) {
          open = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          {
            let child = function($$renderer5, { props }) {
              Button($$renderer5, spread_props([
                props,
                {
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Create Organization`);
                  },
                  $$slots: { default: true }
                }
              ]));
            };
            Dialog_trigger($$renderer4, { child, $$slots: { child: true } });
          }
          $$renderer4.push(`<!----> <!---->`);
          Dialog_content($$renderer4, {
            class: "sm:max-w-[480px]",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->`);
              Dialog_header($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Dialog_title($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Create Organization`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Dialog_description($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Create a new organization for your instance`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <form class="grid gap-4 py-4"><div>`);
              Label($$renderer5, {
                for: "org-name",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Organization name`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> `);
              Input($$renderer5, {
                id: "org-name",
                value: name,
                oninput: handleNameInput,
                placeholder: "My Organization",
                disabled: isSubmitting,
                class: "mt-1"
              });
              $$renderer5.push(`<!----></div> <div>`);
              Label($$renderer5, {
                for: "org-slug",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Slug`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="mt-1 flex gap-2">`);
              Input($$renderer5, {
                id: "org-slug",
                value: slug,
                oninput: handleSlugInput,
                placeholder: "my-organization",
                disabled: isSubmitting,
                class: "flex-1"
              });
              $$renderer5.push(`<!----> `);
              Button($$renderer5, {
                type: "button",
                variant: "outline",
                size: "sm",
                onclick: () => slug = generateSlug(name),
                disabled: !name.trim() || isSubmitting,
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Generate`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> <p class="text-muted-foreground mt-1 text-xs">Lowercase letters, numbers, and hyphens only.</p></div> `);
              if (error) {
                $$renderer5.push("<!--[-->");
                $$renderer5.push(`<p class="text-destructive text-sm">${escape_html(error)}</p>`);
              } else {
                $$renderer5.push("<!--[!-->");
              }
              $$renderer5.push(`<!--]--> <!---->`);
              Dialog_footer($$renderer5, {
                children: ($$renderer6) => {
                  Button($$renderer6, {
                    type: "button",
                    variant: "outline",
                    onclick: () => open = false,
                    disabled: isSubmitting,
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Cancel`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> `);
                  Button($$renderer6, {
                    type: "submit",
                    disabled: !name.trim(),
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->${escape_html("Create")}`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></form>`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const userRole = page.data?.sidebarData?.user?.role;
    const isSuperAdmin = userRole === "super_admin";
    head("2j3l05", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Organizations</title>`);
      });
    });
    $$renderer2.push(`<div class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8"><div class="mx-auto flex w-full max-w-6xl items-center justify-between"><div><h1 class="text-3xl font-semibold">Organizations</h1> <p class="text-muted-foreground">Manage your organizations</p></div> `);
    if (isSuperAdmin) {
      $$renderer2.push("<!--[-->");
      CreateOrganization($$renderer2);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="mx-auto grid w-full max-w-6xl gap-6">`);
    OrganizationsList($$renderer2, { orgs: data.organizations });
    $$renderer2.push(`<!----></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-zDvx_K4A.js.map
