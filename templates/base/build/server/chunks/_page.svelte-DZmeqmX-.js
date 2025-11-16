import { h as head, z as sanitize_props, F as spread_props, Q as bind_props, G as slot, W as props_id, K as attributes, N as clsx, O as ensure_array_like } from './index2-PlYtOn9l.js';
import { p as page } from './index5-C8-UKNy8.js';
import { g as goto, i as invalidateAll } from './client-DH_42K1x.js';
import { B as Button, c as cn, b as buttonVariants } from './button-BaYTBSEJ.js';
import { e as escape_html } from './context-DL4CYGHS.js';
import { C as Card, I as Input } from './card-B04Jp-nH.js';
import { L as Label } from './label-Dq64pFyR.js';
import { a as Card_header, b as Card_title, C as Card_content } from './card-title-AldrExFL.js';
import { C as Card_description } from './card-description-CfO1LfBH.js';
import { n as noop, R as DialogRootState, b as Portal, u as DialogContentState, P as Presence_layer, x as Dialog_overlay, F as Focus_scope, y as shouldEnableFocusTrap, X as afterSleep, z as Escape_layer, B as Dismissible_layer, G as Text_selection_layer, I as Scroll_lock, Y as AlertDialogCancelState, Z as DialogActionState } from './dialog-overlay-LaS6gPE6.js';
import { b as boxWith, a as createId, m as mergeProps } from './create-id-mXGs1H6b.js';
import { D as Dialog_title, a as Dialog_description } from './dialog-description-Co-21MEj.js';
import { P as Plus, T as Trash_2 } from './trash-2-CA04aO2V.js';
import { I as Icon } from './Icon-DHGqHCBy.js';
import './state.svelte-BCegLL_9.js';
import './exports-Honk4keX.js';
import './index-BKwQgGLQ.js';
import './events-DlbR6UiW.js';

function Alert_dialog($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      open = false,
      onOpenChange = noop,
      onOpenChangeComplete = noop,
      children
    } = $$props;
    DialogRootState.create({
      variant: boxWith(() => "alert-dialog"),
      open: boxWith(() => open, (v) => {
        open = v;
        onOpenChange(v);
      }),
      onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
    });
    children?.($$renderer2);
    $$renderer2.push(`<!---->`);
    bind_props($$props, { open });
  });
}
function Alert_dialog_action$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const actionState = DialogActionState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, actionState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_cancel$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      children,
      child,
      disabled = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const cancelState = AlertDialogCancelState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      disabled: boxWith(() => Boolean(disabled))
    });
    const mergedProps = mergeProps(restProps, cancelState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      children,
      child,
      ref = null,
      forceMount = false,
      interactOutsideBehavior = "ignore",
      onCloseAutoFocus = noop,
      onEscapeKeydown = noop,
      onOpenAutoFocus = noop,
      onInteractOutside = noop,
      preventScroll = true,
      trapFocus = true,
      restoreScrollDelay = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = DialogContentState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, contentState.props);
    {
      let presence = function($$renderer3) {
        {
          let focusScope = function($$renderer4, { props: focusScopeProps }) {
            Escape_layer($$renderer4, spread_props([
              mergedProps,
              {
                enabled: contentState.root.opts.open.current,
                ref: contentState.opts.ref,
                onEscapeKeydown: (e) => {
                  onEscapeKeydown(e);
                  if (e.defaultPrevented) return;
                  contentState.root.handleClose();
                },
                children: ($$renderer5) => {
                  Dismissible_layer($$renderer5, spread_props([
                    mergedProps,
                    {
                      ref: contentState.opts.ref,
                      enabled: contentState.root.opts.open.current,
                      interactOutsideBehavior,
                      onInteractOutside: (e) => {
                        onInteractOutside(e);
                        if (e.defaultPrevented) return;
                        contentState.root.handleClose();
                      },
                      children: ($$renderer6) => {
                        Text_selection_layer($$renderer6, spread_props([
                          mergedProps,
                          {
                            ref: contentState.opts.ref,
                            enabled: contentState.root.opts.open.current,
                            children: ($$renderer7) => {
                              if (child) {
                                $$renderer7.push("<!--[-->");
                                if (contentState.root.opts.open.current) {
                                  $$renderer7.push("<!--[-->");
                                  Scroll_lock($$renderer7, { preventScroll, restoreScrollDelay });
                                } else {
                                  $$renderer7.push("<!--[!-->");
                                }
                                $$renderer7.push(`<!--]--> `);
                                child($$renderer7, {
                                  props: mergeProps(mergedProps, focusScopeProps),
                                  ...contentState.snippetProps
                                });
                                $$renderer7.push(`<!---->`);
                              } else {
                                $$renderer7.push("<!--[!-->");
                                Scroll_lock($$renderer7, { preventScroll });
                                $$renderer7.push(`<!----> <div${attributes({ ...mergeProps(mergedProps, focusScopeProps) })}>`);
                                children?.($$renderer7);
                                $$renderer7.push(`<!----></div>`);
                              }
                              $$renderer7.push(`<!--]-->`);
                            },
                            $$slots: { default: true }
                          }
                        ]));
                      },
                      $$slots: { default: true }
                    }
                  ]));
                },
                $$slots: { default: true }
              }
            ]));
          };
          Focus_scope($$renderer3, {
            ref: contentState.opts.ref,
            loop: true,
            trapFocus,
            enabled: shouldEnableFocusTrap({
              forceMount,
              present: contentState.root.opts.open.current,
              open: contentState.root.opts.open.current
            }),
            onCloseAutoFocus,
            onOpenAutoFocus: (e) => {
              onOpenAutoFocus(e);
              if (e.defaultPrevented) return;
              e.preventDefault();
              afterSleep(0, () => contentState.opts.ref.current?.focus());
            },
            focusScope
          });
        }
      };
      Presence_layer($$renderer2, {
        forceMount,
        open: contentState.root.opts.open.current || forceMount,
        ref: contentState.opts.ref,
        presence
      });
    }
    bind_props($$props, { ref });
  });
}
function Arrow_left($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.544.0 - ISC
   *
   * ISC License
   *
   * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
   *
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   *
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * ---
   *
   * The MIT License (MIT) (for portions derived from Feather)
   *
   * Copyright (c) 2013-2023 Cole Bemis
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   *
   */
  const iconNode = [
    ["path", { "d": "m12 19-7-7 7-7" }],
    ["path", { "d": "M19 12H5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "arrow-left" },
    $$sanitized_props,
    {
      /**
       * @component @name ArrowLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTIgMTktNy03IDctNyIgLz4KICA8cGF0aCBkPSJNMTkgMTJINSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-left
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function Building_2($$renderer, $$props) {
  const $$sanitized_props = sanitize_props($$props);
  /**
   * @license lucide-svelte v0.544.0 - ISC
   *
   * ISC License
   *
   * Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025.
   *
   * Permission to use, copy, modify, and/or distribute this software for any
   * purpose with or without fee is hereby granted, provided that the above
   * copyright notice and this permission notice appear in all copies.
   *
   * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
   * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
   * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
   * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
   * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
   * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
   * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
   *
   * ---
   *
   * The MIT License (MIT) (for portions derived from Feather)
   *
   * Copyright (c) 2013-2023 Cole Bemis
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   *
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   *
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   *
   */
  const iconNode = [
    ["path", { "d": "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" }],
    ["path", { "d": "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" }],
    ["path", { "d": "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" }],
    ["path", { "d": "M10 6h4" }],
    ["path", { "d": "M10 10h4" }],
    ["path", { "d": "M10 14h4" }],
    ["path", { "d": "M10 18h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "building-2" },
    $$sanitized_props,
    {
      /**
       * @component @name Building2
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMlY0YTIgMiAwIDAgMSAyLTJoOGEyIDIgMCAwIDEgMiAydjE4WiIgLz4KICA8cGF0aCBkPSJNNiAxMkg0YTIgMiAwIDAgMC0yIDJ2NmEyIDIgMCAwIDAgMiAyaDIiIC8+CiAgPHBhdGggZD0iTTE4IDloMmEyIDIgMCAwIDEgMiAydjlhMiAyIDAgMCAxLTIgMmgtMiIgLz4KICA8cGF0aCBkPSJNMTAgNmg0IiAvPgogIDxwYXRoIGQ9Ik0xMCAxMGg0IiAvPgogIDxwYXRoIGQ9Ik0xMCAxNGg0IiAvPgogIDxwYXRoIGQ9Ik0xMCAxOGg0IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/building-2
       * @see https://lucide.dev/guide/packages/lucide-svelte - Documentation
       *
       * @param {Object} props - Lucide icons props and any valid SVG attribute
       * @returns {FunctionalComponent} Svelte component
       *
       */
      iconNode,
      children: ($$renderer2) => {
        $$renderer2.push(`<!--[-->`);
        slot($$renderer2, $$props, "default", {});
        $$renderer2.push(`<!--]-->`);
      },
      $$slots: { default: true }
    }
  ]));
}
function CreateOrganization($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let name = "";
    let slug = "";
    let isSubmitting = false;
    function generateSlug(text) {
      return text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
    }
    function handleNameChange(event) {
      const target = event.target;
      name = target.value;
      if (!slug || slug === generateSlug(name.slice(0, -1))) {
        slug = generateSlug(name);
      }
    }
    function handleSlugChange(event) {
      const target = event.target;
      slug = generateSlug(target.value);
    }
    function handleCancel() {
      goto();
    }
    $$renderer2.push(`<!---->`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Card_header($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Card_title($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Organization Details`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Card_description($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Enter the basic information for your new organization`);
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
            $$renderer4.push(`<form class="space-y-6"><div class="space-y-2">`);
            Label($$renderer4, {
              for: "name",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Organization Name <span class="text-destructive">*</span>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Input($$renderer4, {
              id: "name",
              type: "text",
              placeholder: "Acme Corporation",
              value: name,
              oninput: handleNameChange,
              disabled: isSubmitting,
              required: true
            });
            $$renderer4.push(`<!----> <p class="text-muted-foreground text-sm">The display name for your organization</p></div> <div class="space-y-2">`);
            Label($$renderer4, {
              for: "slug",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Slug <span class="text-destructive">*</span>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Input($$renderer4, {
              id: "slug",
              type: "text",
              placeholder: "acme-corporation",
              value: slug,
              oninput: handleSlugChange,
              disabled: isSubmitting,
              required: true,
              pattern: "[a-z0-9-]+"
            });
            $$renderer4.push(`<!----> <p class="text-muted-foreground text-sm">A unique identifier for your organization (lowercase letters, numbers, and hyphens only)</p> `);
            if (slug) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<p class="text-muted-foreground text-sm">Preview: <code class="bg-muted rounded px-1.5 py-0.5">${escape_html(slug)}</code></p>`);
            } else {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]--></div> `);
            {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]--> <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">`);
            Button($$renderer4, {
              type: "button",
              variant: "outline",
              onclick: handleCancel,
              disabled: isSubmitting,
              class: "w-full sm:w-auto",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Cancel`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> `);
            Button($$renderer4, {
              type: "submit",
              disabled: !name.trim() || !slug.trim(),
              class: "w-full sm:w-auto",
              children: ($$renderer5) => {
                {
                  $$renderer5.push("<!--[!-->");
                  $$renderer5.push(`Create Organization`);
                }
                $$renderer5.push(`<!--]-->`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></form>`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!---->`);
  });
}
function Alert_dialog_title($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_title($$renderer3, spread_props([
        {
          "data-slot": "alert-dialog-title",
          class: cn("text-lg font-semibold", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_action($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Alert_dialog_action$1($$renderer3, spread_props([
        {
          "data-slot": "alert-dialog-action",
          class: cn(buttonVariants(), className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_cancel($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Alert_dialog_cancel$1($$renderer3, spread_props([
        {
          "data-slot": "alert-dialog-cancel",
          class: cn(buttonVariants({ variant: "outline" }), className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_footer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "alert-dialog-footer",
      class: clsx(cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "alert-dialog-header",
      class: clsx(cn("flex flex-col gap-2 text-center sm:text-left", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_overlay($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_overlay($$renderer3, spread_props([
        {
          "data-slot": "alert-dialog-overlay",
          class: cn("data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      portalProps,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Portal($$renderer3, spread_props([
        portalProps,
        {
          children: ($$renderer4) => {
            Alert_dialog_overlay($$renderer4, {});
            $$renderer4.push(`<!----> <!---->`);
            Alert_dialog_content$1($$renderer4, spread_props([
              {
                "data-slot": "alert-dialog-content",
                class: cn("bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg", className)
              },
              restProps,
              {
                get ref() {
                  return ref;
                },
                set ref($$value) {
                  ref = $$value;
                  $$settled = false;
                }
              }
            ]));
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
function Alert_dialog_description($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_description($$renderer3, spread_props([
        {
          "data-slot": "alert-dialog-description",
          class: cn("text-muted-foreground text-sm", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          }
        }
      ]));
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref });
  });
}
const Root = Alert_dialog;
function OrganizationsList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let organizations = [];
    let error = null;
    let isLoading = true;
    let deletingOrgId = null;
    let orgToDelete = null;
    async function loadOrganizations() {
      try {
        isLoading = true;
        const response = await fetch("/api/organizations");
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch organizations");
        }
        organizations = result.data;
      } catch (err) {
        error = err instanceof Error ? err.message : "An unknown error occurred";
      } finally {
        isLoading = false;
      }
    }
    async function handleDeleteOrganization(org) {
      if (deletingOrgId) return;
      deletingOrgId = org.id;
      try {
        const response = await fetch(`/api/organizations/${org.id}`, { method: "DELETE" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to delete organization");
        }
        await loadOrganizations();
        await invalidateAll();
      } catch (err) {
        error = err instanceof Error ? err.message : "Failed to delete organization";
        console.error("Delete organization error:", err);
      } finally {
        deletingOrgId = null;
        orgToDelete = null;
      }
    }
    function openDeleteDialog(org) {
      orgToDelete = org;
    }
    function closeDeleteDialog() {
      orgToDelete = null;
    }
    $$renderer2.push(`<!---->`);
    Card($$renderer2, {
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Card_header($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Card_title($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Your Organizations`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Card_description($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->A list of all the organizations you are a member of.`);
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
            if (isLoading) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<p class="text-muted-foreground py-8 text-center">Loading organizations...</p>`);
            } else {
              $$renderer4.push("<!--[!-->");
              if (error) {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<div class="bg-destructive/10 text-destructive border-destructive/20 rounded-lg border p-4"><p class="font-medium">Error</p> <p class="text-sm">${escape_html(error)}</p></div>`);
              } else {
                $$renderer4.push("<!--[!-->");
                if (organizations.length === 0) {
                  $$renderer4.push("<!--[-->");
                  $$renderer4.push(`<p class="text-muted-foreground py-8 text-center">You are not a member of any organizations yet.</p>`);
                } else {
                  $$renderer4.push("<!--[!-->");
                  $$renderer4.push(`<ul class="divide-border divide-y"><!--[-->`);
                  const each_array = ensure_array_like(organizations);
                  for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                    let org = each_array[index];
                    $$renderer4.push(`<li class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex grow items-center justify-between"><div class="flex flex-col"><span class="font-medium">${escape_html(org.name)}</span> <span class="text-muted-foreground text-sm">${escape_html(org.slug)}</span></div> <div class="flex items-center gap-2 sm:hidden">`);
                    if (org.role === "owner") {
                      $$renderer4.push("<!--[-->");
                      Button($$renderer4, {
                        variant: "ghost",
                        size: "icon",
                        onclick: () => openDeleteDialog(org),
                        disabled: deletingOrgId === org.id,
                        class: "text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8",
                        children: ($$renderer5) => {
                          Trash_2($$renderer5, { class: "h-4 w-4" });
                        },
                        $$slots: { default: true }
                      });
                    } else {
                      $$renderer4.push("<!--[!-->");
                    }
                    $$renderer4.push(`<!--]--></div></div> <div class="flex items-center justify-between"><div class="flex items-center gap-2"><span class="text-muted-foreground text-sm capitalize">${escape_html(org.role)}</span> `);
                    if (org.isActive) {
                      $$renderer4.push("<!--[-->");
                      $$renderer4.push(`<span class="bg-primary/10 text-primary inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">Active</span>`);
                    } else {
                      $$renderer4.push("<!--[!-->");
                    }
                    $$renderer4.push(`<!--]--></div> <div class="hidden items-center gap-2 sm:flex">`);
                    if (org.role === "owner") {
                      $$renderer4.push("<!--[-->");
                      Button($$renderer4, {
                        variant: "ghost",
                        size: "icon",
                        onclick: () => openDeleteDialog(org),
                        disabled: deletingOrgId === org.id,
                        class: "text-destructive hover:text-destructive hover:bg-destructive/10",
                        children: ($$renderer5) => {
                          Trash_2($$renderer5, { class: "h-4 w-4" });
                        },
                        $$slots: { default: true }
                      });
                    } else {
                      $$renderer4.push("<!--[!-->");
                    }
                    $$renderer4.push(`<!--]--></div></div></li>`);
                  }
                  $$renderer4.push(`<!--]--></ul>`);
                }
                $$renderer4.push(`<!--]-->`);
              }
              $$renderer4.push(`<!--]-->`);
            }
            $$renderer4.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <!---->`);
    Root($$renderer2, {
      open: orgToDelete !== null,
      onOpenChange: (open) => !open && closeDeleteDialog(),
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Alert_dialog_content($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Alert_dialog_header($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->`);
                Alert_dialog_title($$renderer5, {
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Delete Organization`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----> <!---->`);
                Alert_dialog_description($$renderer5, {
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Are you sure you want to delete <strong>${escape_html(orgToDelete?.name)}</strong>? This action cannot be
				undone. All members will be removed and all pending invitations will be cancelled.`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!---->`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Alert_dialog_footer($$renderer4, {
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->`);
                Alert_dialog_cancel($$renderer5, {
                  onclick: closeDeleteDialog,
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Cancel`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----> <!---->`);
                Alert_dialog_action($$renderer5, {
                  onclick: () => orgToDelete && handleDeleteOrganization(orgToDelete),
                  class: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Delete Organization`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!---->`);
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
    $$renderer2.push(`<!---->`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const isCreateMode = page.url.searchParams.get("action") === "create";
    const userRole = page.data?.sidebarData?.user?.role;
    const isSuperAdmin = userRole === "super_admin";
    function handleCancel() {
      goto();
    }
    function goToCreate() {
      goto("/admin/organizations?action=create", {});
    }
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Organizations</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Manage your organizations, members, and team settings in Aphex CMS."/>`);
    });
    $$renderer2.push(`<div class="container mx-auto max-w-6xl p-4 sm:p-6"><div class="mb-6">`);
    Button($$renderer2, {
      variant: "ghost",
      onclick: handleCancel,
      class: "mb-4",
      children: ($$renderer3) => {
        Arrow_left($$renderer3, { class: "mr-2 h-4 w-4" });
        $$renderer3.push(`<!----> Back to Admin`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----> <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div class="flex items-center gap-3"><div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12">`);
    Building_2($$renderer2, { class: "text-primary h-5 w-5 sm:h-6 sm:w-6" });
    $$renderer2.push(`<!----></div> <div><h1 class="text-2xl font-bold sm:text-3xl">${escape_html(isCreateMode ? "Create Organization" : "Organizations")}</h1> <p class="text-muted-foreground text-sm sm:text-base">${escape_html(isCreateMode ? "Set up a new organization for your team" : "Manage your organizations")}</p></div></div> `);
    if (!isCreateMode && isSuperAdmin) {
      $$renderer2.push("<!--[-->");
      Button($$renderer2, {
        onclick: goToCreate,
        class: "w-full sm:w-auto",
        children: ($$renderer3) => {
          Plus($$renderer3, { class: "mr-2 h-4 w-4" });
          $$renderer3.push(`<!----> Create Organization`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (isCreateMode) {
      $$renderer2.push("<!--[-->");
      if (isSuperAdmin) {
        $$renderer2.push("<!--[-->");
        CreateOrganization($$renderer2);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="text-muted-foreground rounded-lg border p-8 text-center"><p class="text-lg font-medium">Access Denied</p> <p class="mt-2">Only super admins can create organizations.</p></div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      OrganizationsList($$renderer2);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DZmeqmX-.js.map
