import { f as ensure_array_like, g as attr, s as spread_props } from './index5-DltsKoco.js';
import './exports-Ci9YzwMm.js';
import './client-BGGljB7r.js';
import './button-1bYQaKO-.js';
import { B as Badge } from './badge-DEuvdmY7.js';
import './date-utils-xyIWAIQq.js';
import './logger-C1WBmfZZ.js';
import './sheet-content-CfdNXqIw.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import { I as Icon } from './Icon-DO-BLZpI.js';
import { e as escape_html } from './context-CAhUmS6w.js';

function External_link($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M15 3h6v6" }],
      ["path", { "d": "M10 14 21 3" }],
      [
        "path",
        {
          "d": "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
        }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "external-link" },
      /**
       * @component @name ExternalLink
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgM2g2djYiIC8+CiAgPHBhdGggZD0iTTEwIDE0IDIxIDMiIC8+CiAgPHBhdGggZD0iTTE4IDEzdjZhMiAyIDAgMCAxLTIgMkg1YTIgMiAwIDAgMS0yLTJWOGEyIDIgMCAwIDEgMi0yaDYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/external-link
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      props,
      {
        iconNode,
        children: ($$renderer3) => {
          props.children?.($$renderer3);
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function OrganizationsList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { orgs = [] } = $$props;
    let switchingOrgId = null;
    function getInitials(name) {
      return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
    }
    if (orgs.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-muted-foreground text-sm">No organizations yet</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="divide-y rounded-lg border"><!--[-->`);
      const each_array = ensure_array_like(orgs);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let org = each_array[$$index];
        $$renderer2.push(`<div class="hover:bg-muted/50 flex items-center gap-4 p-4 transition-colors"><div class="bg-sidebar-primary text-sidebar-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">${escape_html(getInitials(org.name))}</div> <div class="min-w-0 flex-1"><div class="flex items-baseline gap-2"><span class="font-medium">${escape_html(org.name)}</span> <span class="text-muted-foreground">/</span> <span class="text-muted-foreground text-sm">[${escape_html(org.slug)}]</span> `);
        if (org.isActive) {
          $$renderer2.push("<!--[-->");
          Badge($$renderer2, {
            variant: "default",
            class: "text-xs",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Active`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="text-muted-foreground text-sm">`);
        if (org.ownerEmail) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`Owned by: ${escape_html(org.ownerEmail)}`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="text-muted-foreground text-sm">Total members: ${escape_html(org.memberCount)}</div></div> <button class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md p-2 transition-colors"${attr("disabled", switchingOrgId !== null, true)}${attr("title", org.isActive ? "Go to dashboard" : "Switch to this organization")}>`);
        External_link($$renderer2, { class: "size-4" });
        $$renderer2.push(`<!----></button></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}

export { OrganizationsList as O };
//# sourceMappingURL=OrganizationsList-kKYs_FEC.js.map
