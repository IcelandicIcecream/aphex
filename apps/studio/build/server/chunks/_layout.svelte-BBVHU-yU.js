import { f as ensure_array_like, g as attr, k as attr_class, j as stringify } from './index5-DltsKoco.js';
import { p as page } from './index6-DBfMzOzG.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './client-BGGljB7r.js';
import './exports-Ci9YzwMm.js';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    const basePath = "/admin/settings";
    const orgTabs = [
      { label: "General", href: basePath },
      { label: "Members", href: `${basePath}/members` }
    ];
    const accountTabs = [
      { label: "Profile", href: `${basePath}/account` },
      { label: "API Keys", href: `${basePath}/api-keys` }
    ];
    function isActive(href) {
      if (href === basePath) return page.url.pathname === basePath;
      return page.url.pathname.startsWith(href);
    }
    $$renderer2.push(`<div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:gap-8 md:p-8"><div class="mx-auto grid w-full max-w-6xl gap-2"><h1 class="text-3xl font-semibold">Settings</h1> <p class="text-muted-foreground">Manage your organization and account</p></div> <div class="mx-auto w-full max-w-6xl md:hidden"><div class="border-b"><div class="flex gap-4 overflow-x-auto"><!--[-->`);
    const each_array = ensure_array_like([...orgTabs, ...accountTabs]);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let tab = each_array[$$index];
      $$renderer2.push(`<a${attr("href", tab.href)}${attr_class(`border-b-2 px-1 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${stringify(isActive(tab.href) ? "border-primary text-primary" : "text-muted-foreground hover:text-foreground border-transparent")}`)}>${escape_html(tab.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> <div class="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]"><nav class="text-muted-foreground hidden gap-1 text-sm md:grid"><p class="text-muted-foreground/60 px-1 pt-2 pb-1 text-xs font-semibold tracking-wider uppercase">Organization</p> <!--[-->`);
    const each_array_1 = ensure_array_like(orgTabs);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let tab = each_array_1[$$index_1];
      $$renderer2.push(`<a${attr("href", tab.href)}${attr_class(`rounded-md px-2 py-1.5 ${stringify(isActive(tab.href) ? "text-primary bg-muted font-semibold" : "")}`)}>${escape_html(tab.label)}</a>`);
    }
    $$renderer2.push(`<!--]--> <p class="text-muted-foreground/60 px-1 pt-4 pb-1 text-xs font-semibold tracking-wider uppercase">Account</p> <!--[-->`);
    const each_array_2 = ensure_array_like(accountTabs);
    for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
      let tab = each_array_2[$$index_2];
      $$renderer2.push(`<a${attr("href", tab.href)}${attr_class(`rounded-md px-2 py-1.5 ${stringify(isActive(tab.href) ? "text-primary bg-muted font-semibold" : "")}`)}>${escape_html(tab.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></nav> `);
    children($$renderer2);
    $$renderer2.push(`<!----></div></div>`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-BBVHU-yU.js.map
