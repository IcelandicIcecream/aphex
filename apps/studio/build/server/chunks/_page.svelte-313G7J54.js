import { i as head } from './index5-DltsKoco.js';
import { C as Card, a as Card_header, b as Card_content, c as Card_title } from './card-title-DpOlyEWh.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import { B as Button } from './button-1bYQaKO-.js';
import { I as Input } from './input-BofgIw5Q.js';
import { L as Label } from './label-5D2TW-nG.js';
import { C as Card_footer } from './card-footer-CVs8Uocz.js';
import { A as Avatar, a as Avatar_image, b as Avatar_fallback } from './avatar-fallback-CuOJJEgC.js';
import { S as Separator } from './separator-ixXNQJwr.js';
import { i as invalidateAll } from './client-BGGljB7r.js';
import './date-utils-xyIWAIQq.js';
import './logger-C1WBmfZZ.js';
import './badge-DEuvdmY7.js';
import { V as organizations } from './sheet-content-CfdNXqIw.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import { U as Users } from './users-DgFSLYaw.js';
import { C as Copy } from './copy-CXjBEQlY.js';
import { a as toast } from './toast-state.svelte-Mh0AHws7.js';
import './utils2-CVx6kO_W.js';
import './create-id-BLMzD-FL.js';
import './exports-Ci9YzwMm.js';
import './_commonjsHelpers-C1uiShF5.js';
import './events-C5y5VZ_W.js';
import './Icon-DO-BLZpI.js';

function OrganizationsSettings($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { activeOrganization } = $$props;
    let editOrgName = activeOrganization.name;
    let editOrgSlug = activeOrganization.slug;
    let isUpdatingOrg = false;
    let error = null;
    const orgInitials = activeOrganization.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
    const formattedDate = new Date(activeOrganization.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    function generateSlug(text) {
      return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function handleSlugInput(event) {
      const target = event.target;
      editOrgSlug = target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    }
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
    async function updateOrganization() {
      if (!editOrgName.trim() || !editOrgSlug.trim()) {
        error = "Please enter both organization name and slug";
        return;
      }
      isUpdatingOrg = true;
      error = null;
      try {
        const result = await organizations.update(activeOrganization.id, { name: editOrgName.trim(), slug: editOrgSlug.trim() });
        if (!result.success) {
          throw new Error(result.error || "Failed to update organization");
        }
        toast.success("Organization updated successfully");
        await invalidateAll();
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to update organization";
      } finally {
        isUpdatingOrg = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Card($$renderer3, {
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Card_header($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<div class="flex items-center gap-4"><!---->`);
              Avatar($$renderer5, {
                class: "h-12 w-12 text-lg",
                children: ($$renderer6) => {
                  if (activeOrganization.metadata?.logo) {
                    $$renderer6.push("<!--[-->");
                    $$renderer6.push(`<!---->`);
                    Avatar_image($$renderer6, {
                      src: activeOrganization.metadata.logo,
                      alt: activeOrganization.name
                    });
                    $$renderer6.push(`<!---->`);
                  } else {
                    $$renderer6.push("<!--[!-->");
                  }
                  $$renderer6.push(`<!--]--> <!---->`);
                  Avatar_fallback($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->${escape_html(orgInitials)}`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="min-w-0 flex-1"><!---->`);
              Card_title($$renderer5, {
                class: "text-lg",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->${escape_html(activeOrganization.name)}`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"><span class="flex items-center gap-1">`);
              Users($$renderer5, { class: "h-3 w-3" });
              $$renderer5.push(`<!----> ${escape_html(activeOrganization.members.length)} member${escape_html(activeOrganization.members.length !== 1 ? "s" : "")}</span> <span>Created ${escape_html(formattedDate)}</span></div></div></div>`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> <!---->`);
          Card_content($$renderer4, {
            children: ($$renderer5) => {
              $$renderer5.push(`<div class="mb-4">`);
              Label($$renderer5, {
                class: "text-muted-foreground text-xs",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Organization ID`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="mt-1 flex items-center gap-2"><code class="bg-muted text-muted-foreground flex-1 truncate rounded-md px-3 py-1.5 font-mono text-xs">${escape_html(activeOrganization.id)}</code> `);
              Button($$renderer5, {
                variant: "ghost",
                size: "icon",
                class: "h-7 w-7 shrink-0",
                onclick: () => copyToClipboard(activeOrganization.id),
                children: ($$renderer6) => {
                  Copy($$renderer6, { class: "h-3.5 w-3.5" });
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div></div> `);
              Separator($$renderer5, { class: "mb-4" });
              $$renderer5.push(`<!----> <div class="grid gap-4"><div>`);
              Label($$renderer5, {
                for: "org-name",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Organization Name`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> `);
              Input($$renderer5, {
                id: "org-name",
                placeholder: "Acme Inc",
                class: "mt-2",
                get value() {
                  return editOrgName;
                },
                set value($$value) {
                  editOrgName = $$value;
                  $$settled = false;
                }
              });
              $$renderer5.push(`<!----></div> <div>`);
              Label($$renderer5, {
                for: "org-slug",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Slug`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="mt-2 flex gap-2">`);
              Input($$renderer5, {
                id: "org-slug",
                value: editOrgSlug,
                oninput: handleSlugInput,
                placeholder: "acme-inc",
                class: "flex-1"
              });
              $$renderer5.push(`<!----> `);
              Button($$renderer5, {
                variant: "outline",
                size: "sm",
                onclick: () => editOrgSlug = generateSlug(editOrgName),
                disabled: !editOrgName.trim(),
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Generate`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> <p class="text-muted-foreground mt-1.5 font-mono text-xs">/${escape_html(editOrgSlug || "your-slug")}</p></div> `);
              if (error) {
                $$renderer5.push("<!--[-->");
                $$renderer5.push(`<p class="text-destructive text-sm">${escape_html(error)}</p>`);
              } else {
                $$renderer5.push("<!--[!-->");
              }
              $$renderer5.push(`<!--]--></div>`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> <!---->`);
          Card_footer($$renderer4, {
            class: "border-t px-6 py-4",
            children: ($$renderer5) => {
              Button($$renderer5, {
                onclick: updateOrganization,
                disabled: isUpdatingOrg,
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->${escape_html(isUpdatingOrg ? "Saving..." : "Save")}`);
                },
                $$slots: { default: true }
              });
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
    head("193z1pc", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Organization Settings</title>`);
      });
    });
    $$renderer2.push(`<div class="grid gap-6"><div class="hidden sm:block"><h2 class="text-xl font-semibold">General</h2> <p class="text-muted-foreground text-sm">Manage your organization settings and preferences.</p></div> `);
    if (data.activeOrganization) {
      $$renderer2.push("<!--[-->");
      OrganizationsSettings($$renderer2, {
        activeOrganization: data.activeOrganization,
        currentUserId: data.user.id
      });
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!---->`);
      Card($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->`);
          Card_content($$renderer3, {
            class: "py-12 text-center",
            children: ($$renderer4) => {
              $$renderer4.push(`<p class="text-muted-foreground text-lg">No active organization</p> <p class="text-muted-foreground mt-2 text-sm">You need to be added to an organization</p>`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-313G7J54.js.map
