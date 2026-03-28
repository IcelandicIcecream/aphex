import { i as head, s as spread_props, f as ensure_array_like, k as attr_class, j as stringify, b as bind_props, p as props_id, a as attributes } from './index5-DltsKoco.js';
import { B as Button } from './button-1bYQaKO-.js';
import { I as Input } from './input-BofgIw5Q.js';
import { L as Label } from './label-5D2TW-nG.js';
import { B as Badge } from './badge-DEuvdmY7.js';
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title } from './index9-DT6mVqr6.js';
import { R as Root$1, S as Select_trigger, a as Select_content, b as SelectGroupState, c as Select_item } from './index10-zWMfY-YB.js';
import { C as Card, a as Card_header, b as Card_content, c as Card_title } from './card-title-DpOlyEWh.js';
import { C as Card_description } from './card-description-B4j6Vmwc.js';
import { Z as Root$2, _ as Tooltip_trigger, $ as Tooltip_content, a0 as apiKeys } from './sheet-content-CfdNXqIw.js';
import { C as Collapsible, a as Collapsible_trigger, b as Collapsible_content } from './collapsible-content-BvoOoCZf.js';
import './date-utils-xyIWAIQq.js';
import './logger-C1WBmfZZ.js';
import { i as invalidateAll } from './client-BGGljB7r.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import { D as Dialog_trigger, b as Dialog_footer, a as Dialog_description } from './dialog-trigger-CprxzeZo.js';
import { g as createId, b as boxWith, m as mergeProps } from './create-id-BLMzD-FL.js';
import { I as Icon } from './Icon-DO-BLZpI.js';
import { T as Trash_2 } from './trash-2-mTnOnpbg.js';
import { C as Copy } from './copy-CXjBEQlY.js';
import { a as toast } from './toast-state.svelte-Mh0AHws7.js';
import { e as escape_html } from './context-CAhUmS6w.js';
import './utils2-CVx6kO_W.js';
import './dialog-BO7xkDHk.js';
import './check-D1w3Hmpb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './hidden-input-DHMyjzNC.js';
import './_commonjsHelpers-C1uiShF5.js';
import './dialog-description-BCqoT53F.js';

function Select_group$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      children,
      child,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const groupState = SelectGroupState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, groupState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></div>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Select_group($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    $$renderer2.push(`<!---->`);
    Select_group$1($$renderer2, spread_props([{ "data-slot": "select-group" }, restProps]));
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref });
  });
}
function Chevron_down($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
    Icon($$renderer2, spread_props([
      { name: "chevron-down" },
      /**
       * @component @name ChevronDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNiA5IDYgNiA2LTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/chevron-down
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
function Key_round($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"
        }
      ],
      [
        "circle",
        { "cx": "16.5", "cy": "7.5", "r": ".5", "fill": "currentColor" }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "key-round" },
      /**
       * @component @name KeyRound
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi41ODYgMTcuNDE0QTIgMiAwIDAgMCAyIDE4LjgyOFYyMWExIDEgMCAwIDAgMSAxaDNhMSAxIDAgMCAwIDEtMXYtMWExIDEgMCAwIDEgMS0xaDFhMSAxIDAgMCAwIDEtMXYtMWExIDEgMCAwIDEgMS0xaC4xNzJhMiAyIDAgMCAwIDEuNDE0LS41ODZsLjgxNC0uODE0YTYuNSA2LjUgMCAxIDAtNC00eiIgLz4KICA8Y2lyY2xlIGN4PSIxNi41IiBjeT0iNy41IiByPSIuNSIgZmlsbD0iY3VycmVudENvbG9yIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/key-round
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
function Plus($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "M5 12h14" }], ["path", { "d": "M12 5v14" }]];
    Icon($$renderer2, spread_props([
      { name: "plus" },
      /**
       * @component @name Plus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KICA8cGF0aCBkPSJNMTIgNXYxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/plus
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
function ApiKeysSettings($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { apiKeys: apiKeys$1, organizationRole } = $$props;
    const canManageApiKeys = organizationRole === "owner" || organizationRole === "admin" || organizationRole === "editor";
    let createDialogOpen = false;
    let newKeyName = "";
    let newKeyPermissions = ["read"];
    let newKeyExpiresValue = "365";
    let newKeyExpiresInDays = 365;
    let createdKey = null;
    let isCreating = false;
    const expirationOptions = [
      { value: "30", label: "30 days" },
      { value: "90", label: "90 days" },
      { value: "365", label: "1 year" },
      { value: "never", label: "Never" }
    ];
    const expirationTriggerContent = expirationOptions.find((opt) => opt.value === newKeyExpiresValue)?.label ?? "1 year";
    async function createApiKey() {
      if (!newKeyName.trim()) {
        toast.error("Please enter a key name");
        return;
      }
      isCreating = true;
      try {
        const result = await apiKeys.create({
          name: newKeyName.trim(),
          permissions: newKeyPermissions,
          expiresInDays: newKeyExpiresInDays
        });
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to create API key");
        }
        createdKey = {
          key: result.data.apiKey.key,
          name: result.data.apiKey.name ?? newKeyName
        };
        newKeyName = "";
        newKeyPermissions = ["read"];
        newKeyExpiresValue = "365";
        newKeyExpiresInDays = 365;
        await invalidateAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create API key");
      } finally {
        isCreating = false;
      }
    }
    async function deleteApiKey(id, name) {
      if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
      }
      try {
        const result = await apiKeys.remove(id);
        if (!result.success) {
          throw new Error(result.error || "Failed to delete API key");
        }
        toast.success(`API key "${name}" deleted`);
        await invalidateAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete API key");
      }
    }
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    }
    function formatDate(date) {
      if (!date) return "Never";
      return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    function togglePermission(permission) {
      if (newKeyPermissions.includes(permission)) {
        newKeyPermissions = newKeyPermissions.filter((p) => p !== permission);
      } else {
        newKeyPermissions = [...newKeyPermissions, permission];
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
              $$renderer5.push(`<div class="flex items-center justify-between"><div><!---->`);
              Card_title($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->API Keys`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <!---->`);
              Card_description($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->API keys allow programmatic access to your CMS content`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> `);
              if (canManageApiKeys) {
                $$renderer5.push("<!--[-->");
                Root($$renderer5, {
                  get open() {
                    return createDialogOpen;
                  },
                  set open($$value) {
                    createDialogOpen = $$value;
                    $$settled = false;
                  },
                  children: ($$renderer6) => {
                    {
                      let child = function($$renderer7, { props }) {
                        Button($$renderer7, spread_props([
                          { size: "sm" },
                          props,
                          {
                            children: ($$renderer8) => {
                              Plus($$renderer8, { class: "mr-1.5 h-4 w-4" });
                              $$renderer8.push(`<!----> Create Key`);
                            },
                            $$slots: { default: true }
                          }
                        ]));
                      };
                      Dialog_trigger($$renderer6, { child, $$slots: { child: true } });
                    }
                    $$renderer6.push(`<!----> `);
                    Dialog_content($$renderer6, {
                      class: "sm:max-w-[500px]",
                      children: ($$renderer7) => {
                        if (createdKey) {
                          $$renderer7.push("<!--[-->");
                          Dialog_header($$renderer7, {
                            children: ($$renderer8) => {
                              Dialog_title($$renderer8, {
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->API Key Created`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!----> `);
                              Dialog_description($$renderer8, {
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->Save this key securely - you won't be able to see it again`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!---->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <div class="space-y-4 py-4"><div>`);
                          Label($$renderer7, {
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Key Name`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <p class="mt-1 text-sm font-medium">${escape_html(createdKey.name)}</p></div> <div>`);
                          Label($$renderer7, {
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->API Key`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <div class="mt-1 flex gap-2">`);
                          Input($$renderer7, {
                            value: createdKey.key,
                            readonly: true,
                            class: "font-mono text-xs"
                          });
                          $$renderer7.push(`<!----> `);
                          Button($$renderer7, {
                            size: "sm",
                            variant: "outline",
                            onclick: () => copyToClipboard(createdKey.key),
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Copy`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----></div></div></div> `);
                          Dialog_footer($$renderer7, {
                            children: ($$renderer8) => {
                              Button($$renderer8, {
                                onclick: () => {
                                  createdKey = null;
                                  createDialogOpen = false;
                                },
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->Done`);
                                },
                                $$slots: { default: true }
                              });
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!---->`);
                        } else {
                          $$renderer7.push("<!--[!-->");
                          Dialog_header($$renderer7, {
                            children: ($$renderer8) => {
                              Dialog_title($$renderer8, {
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->Create API Key`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!----> `);
                              Dialog_description($$renderer8, {
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->Generate a new API key for programmatic access`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!---->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <div class="space-y-4 py-4"><div>`);
                          Label($$renderer7, {
                            for: "key-name",
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Key Name`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> `);
                          Input($$renderer7, {
                            id: "key-name",
                            placeholder: "Production API Key",
                            class: "mt-1",
                            get value() {
                              return newKeyName;
                            },
                            set value($$value) {
                              newKeyName = $$value;
                              $$settled = false;
                            }
                          });
                          $$renderer7.push(`<!----> <p class="text-muted-foreground mt-1 text-xs">A descriptive name to identify this key</p></div> <div>`);
                          Label($$renderer7, {
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Permissions`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <div class="mt-2 flex gap-2">`);
                          Button($$renderer7, {
                            variant: newKeyPermissions.includes("read") ? "default" : "outline",
                            size: "sm",
                            onclick: () => togglePermission("read"),
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Read`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> `);
                          Button($$renderer7, {
                            variant: newKeyPermissions.includes("write") ? "default" : "outline",
                            size: "sm",
                            onclick: () => togglePermission("write"),
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Write`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----></div> <p class="text-muted-foreground mt-1 text-xs">Read: GET requests | Write: POST, PUT, DELETE requests</p></div> <div>`);
                          Label($$renderer7, {
                            for: "expires",
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->Expires In`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----> <!---->`);
                          Root$1($$renderer7, {
                            type: "single",
                            name: "expiration",
                            onValueChange: (value) => {
                              if (value) {
                                newKeyExpiresInDays = value === "never" ? void 0 : parseInt(value);
                              }
                            },
                            get value() {
                              return newKeyExpiresValue;
                            },
                            set value($$value) {
                              newKeyExpiresValue = $$value;
                              $$settled = false;
                            },
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!---->`);
                              Select_trigger($$renderer8, {
                                class: "mt-1 w-[180px]",
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->${escape_html(expirationTriggerContent)}`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!----> <!---->`);
                              Select_content($$renderer8, {
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->`);
                                  Select_group($$renderer9, {
                                    children: ($$renderer10) => {
                                      $$renderer10.push(`<!--[-->`);
                                      const each_array = ensure_array_like(expirationOptions);
                                      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                                        let option = each_array[$$index];
                                        $$renderer10.push(`<!---->`);
                                        Select_item($$renderer10, {
                                          value: option.value,
                                          label: option.label,
                                          children: ($$renderer11) => {
                                            $$renderer11.push(`<!---->${escape_html(option.label)}`);
                                          },
                                          $$slots: { default: true }
                                        });
                                        $$renderer10.push(`<!---->`);
                                      }
                                      $$renderer10.push(`<!--]-->`);
                                    },
                                    $$slots: { default: true }
                                  });
                                  $$renderer9.push(`<!---->`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!---->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!----></div></div> `);
                          Dialog_footer($$renderer7, {
                            children: ($$renderer8) => {
                              Button($$renderer8, {
                                variant: "outline",
                                onclick: () => createDialogOpen = false,
                                disabled: isCreating,
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->Cancel`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!----> `);
                              Button($$renderer8, {
                                onclick: createApiKey,
                                disabled: isCreating,
                                children: ($$renderer9) => {
                                  $$renderer9.push(`<!---->${escape_html(isCreating ? "Creating..." : "Create Key")}`);
                                },
                                $$slots: { default: true }
                              });
                              $$renderer8.push(`<!---->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!---->`);
                        }
                        $$renderer7.push(`<!--]-->`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer6.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
              } else {
                $$renderer5.push("<!--[!-->");
              }
              $$renderer5.push(`<!--]--></div>`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> <!---->`);
          Card_content($$renderer4, {
            children: ($$renderer5) => {
              if (apiKeys$1.length === 0) {
                $$renderer5.push("<!--[-->");
                $$renderer5.push(`<div class="flex flex-col items-center justify-center py-12 text-center"><div class="bg-muted mb-4 rounded-full p-3">`);
                Key_round($$renderer5, { class: "text-muted-foreground h-6 w-6" });
                $$renderer5.push(`<!----></div> <p class="text-base font-medium">No API keys yet</p> <p class="text-muted-foreground mt-1 text-sm">Create your first API key to access the CMS data programmatically</p> `);
                if (canManageApiKeys) {
                  $$renderer5.push("<!--[-->");
                  Button($$renderer5, {
                    size: "sm",
                    class: "mt-4",
                    onclick: () => createDialogOpen = true,
                    children: ($$renderer6) => {
                      Plus($$renderer6, { class: "mr-1.5 h-4 w-4" });
                      $$renderer6.push(`<!----> Create API Key`);
                    },
                    $$slots: { default: true }
                  });
                } else {
                  $$renderer5.push("<!--[!-->");
                }
                $$renderer5.push(`<!--]--></div>`);
              } else {
                $$renderer5.push("<!--[!-->");
                $$renderer5.push(`<div class="divide-y"><!--[-->`);
                const each_array_1 = ensure_array_like(apiKeys$1);
                for (let i = 0, $$length = each_array_1.length; i < $$length; i++) {
                  let apiKey = each_array_1[i];
                  $$renderer5.push(`<div${attr_class(`flex items-center justify-between gap-4 ${stringify(i > 0 ? "pt-4" : "")} ${stringify(i < apiKeys$1.length - 1 ? "pb-4" : "")}`)}><div class="min-w-0 flex-1"><div class="flex items-center gap-2">`);
                  Key_round($$renderer5, { class: "text-muted-foreground h-4 w-4 shrink-0" });
                  $$renderer5.push(`<!----> <span class="truncate font-medium">${escape_html(apiKey.name)}</span> <div class="flex gap-1"><!--[-->`);
                  const each_array_2 = ensure_array_like(apiKey.permissions);
                  for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
                    let permission = each_array_2[$$index_1];
                    Badge($$renderer5, {
                      variant: "secondary",
                      class: "text-xs capitalize",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->${escape_html(permission)}`);
                      },
                      $$slots: { default: true }
                    });
                  }
                  $$renderer5.push(`<!--]--></div></div> <div class="text-muted-foreground mt-1.5 ml-6 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span>Created ${escape_html(formatDate(apiKey.createdAt))}</span> <span>Last used ${escape_html(formatDate(apiKey.lastRequest))}</span> <span>Expires ${escape_html(apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "never")}</span></div></div> `);
                  if (canManageApiKeys) {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<!---->`);
                    Root$2($$renderer5, {
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->`);
                        {
                          let child = function($$renderer7, { props }) {
                            Button($$renderer7, spread_props([
                              {
                                variant: "ghost",
                                size: "icon",
                                class: "text-muted-foreground hover:text-destructive h-8 w-8 shrink-0"
                              },
                              props,
                              {
                                onclick: (e) => {
                                  props.onclick?.(e);
                                  deleteApiKey(apiKey.id, apiKey.name ?? "Unnamed");
                                },
                                children: ($$renderer8) => {
                                  Trash_2($$renderer8, { class: "h-4 w-4" });
                                },
                                $$slots: { default: true }
                              }
                            ]));
                          };
                          Tooltip_trigger($$renderer6, { child, $$slots: { child: true } });
                        }
                        $$renderer6.push(`<!----> <!---->`);
                        Tooltip_content($$renderer6, {
                          children: ($$renderer7) => {
                            $$renderer7.push(`<!---->Delete this API key`);
                          },
                          $$slots: { default: true }
                        });
                        $$renderer6.push(`<!---->`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!---->`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]--></div>`);
                }
                $$renderer5.push(`<!--]--></div>`);
              }
              $$renderer5.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> <!---->`);
      Card($$renderer3, {
        class: "mt-6",
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Card_header($$renderer4, {
            class: "pb-3",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->`);
              Card_title($$renderer5, {
                class: "text-sm font-medium",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Quick Reference`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <!---->`);
              Card_description($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->Pass your key via the <code class="bg-muted rounded px-1 py-0.5 text-xs">x-api-key</code> header`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!---->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> <!---->`);
          Card_content($$renderer4, {
            class: "space-y-4",
            children: ($$renderer5) => {
              $$renderer5.push(`<div class="bg-muted relative rounded-md p-3"><code class="block font-mono text-xs leading-relaxed break-all">curl -H "x-api-key: your_key_here" \\<br/>   https://your-app.com/api/documents?type={schemaType}</code> `);
              Button($$renderer5, {
                variant: "ghost",
                size: "icon",
                class: "absolute top-2 right-2 h-7 w-7",
                onclick: () => copyToClipboard('curl -H "x-api-key: your_key_here" \\\n  https://your-app.com/api/documents?type={schemaType}'),
                children: ($$renderer6) => {
                  Copy($$renderer6, { class: "h-3.5 w-3.5" });
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----></div> <!---->`);
              Collapsible($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Collapsible_trigger($$renderer6, {
                    class: "flex w-full items-center justify-between text-xs font-medium [&[data-state=open]>svg]:rotate-180",
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Endpoints `);
                      Chevron_down($$renderer7, {
                        class: "text-muted-foreground h-3.5 w-3.5 transition-transform duration-200"
                      });
                      $$renderer7.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!----> <!---->`);
                  Collapsible_content($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<div class="bg-muted mt-2 overflow-hidden rounded-md font-mono text-xs"><div class="divide-y divide-border"><div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "outline",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->GET`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents?type={type}</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "outline",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->GET`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents/{id}</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "secondary",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->POST`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "secondary",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->PUT`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents/{id}</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "secondary",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->DEL`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents/{id}</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "outline",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->POST`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/documents/query</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "outline",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->GET`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/assets</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "secondary",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->POST`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/assets</span> <span class="text-muted-foreground/60 ml-auto text-[10px]">multipart/form-data</span></div> <div class="flex gap-2 px-3 py-1.5">`);
                      Badge($$renderer7, {
                        variant: "outline",
                        class: "w-14 justify-center font-mono text-[10px]",
                        children: ($$renderer8) => {
                          $$renderer8.push(`<!---->GET`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer7.push(`<!----> <span class="text-muted-foreground">/api/schemas</span></div></div></div>`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div class="text-muted-foreground text-xs leading-relaxed"><p>`);
              Badge($$renderer5, {
                variant: "outline",
                class: "mr-1 font-mono text-[10px]",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->GET`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> endpoints need <strong class="text-foreground">read</strong> permission. `);
              Badge($$renderer5, {
                variant: "secondary",
                class: "mr-1 ml-1 font-mono text-[10px]",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->POST`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> `);
              Badge($$renderer5, {
                variant: "secondary",
                class: "mr-1 font-mono text-[10px]",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->PUT`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> `);
              Badge($$renderer5, {
                variant: "secondary",
                class: "mr-1 font-mono text-[10px]",
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->DEL`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> need <strong class="text-foreground">write</strong>. Read-only keys get <code class="bg-muted rounded px-1 py-0.5">403</code> on mutations.</p> <p class="mt-1"><code class="bg-muted rounded px-1 py-0.5">POST /api/documents/query</code> is the exception
				— it only needs <strong class="text-foreground">read</strong> permission.</p></div>`);
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
    head("jdanqk", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - API Keys</title>`);
      });
    });
    $$renderer2.push(`<div class="grid gap-6">`);
    ApiKeysSettings($$renderer2, {
      apiKeys: data.apiKeys,
      organizationRole: data.user.organizationRole
    });
    $$renderer2.push(`<!----></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DUsw9Fqu.js.map
