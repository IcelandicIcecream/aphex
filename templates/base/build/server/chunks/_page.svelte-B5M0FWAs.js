import { h as head, f as attr, O as ensure_array_like, z as sanitize_props, F as spread_props, G as slot, K as attributes, N as clsx, Q as bind_props } from './index2-PlYtOn9l.js';
import './exports-Honk4keX.js';
import { r as resolve } from './server2-CSLWe2in.js';
import './state.svelte-BCegLL_9.js';
import { B as Button, c as cn } from './button-BaYTBSEJ.js';
import { C as Card, I as Input } from './card-B04Jp-nH.js';
import { C as Card_content, a as Card_header, b as Card_title } from './card-title-AldrExFL.js';
import { e as escape_html } from './context-DL4CYGHS.js';
import { P as Plus, T as Trash_2 } from './trash-2-CA04aO2V.js';
import { L as List_todo } from './list-todo-oKtgC1b1.js';
import { I as Icon } from './Icon-DHGqHCBy.js';
import './routing-lpprPii4.js';

function Textarea($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      value = void 0,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<textarea${attributes({
      "data-slot": "textarea",
      class: clsx(cn("border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 field-sizing-content shadow-xs flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className)),
      ...restProps
    })}>`);
    const $$body = escape_html(value);
    if ($$body) {
      $$renderer2.push(`${$$body}`);
    }
    $$renderer2.push(`</textarea>`);
    bind_props($$props, { ref, value });
  });
}
function Circle_check($$renderer, $$props) {
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
    ["circle", { "cx": "12", "cy": "12", "r": "10" }],
    ["path", { "d": "m9 12 2 2 4-4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "circle-check" },
    $$sanitized_props,
    {
      /**
       * @component @name CircleCheck
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8cGF0aCBkPSJtOSAxMiAyIDIgNC00IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/circle-check
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
function Circle($$renderer, $$props) {
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
  const iconNode = [["circle", { "cx": "12", "cy": "12", "r": "10" }]];
  Icon($$renderer, spread_props([
    { name: "circle" },
    $$sanitized_props,
    {
      /**
       * @component @name Circle
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/circle
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
function Pencil($$renderer, $$props) {
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
    [
      "path",
      {
        "d": "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
      }
    ],
    ["path", { "d": "m15 5 4 4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "pencil" },
    $$sanitized_props,
    {
      /**
       * @component @name Pencil
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEuMTc0IDYuODEyYTEgMSAwIDAgMC0zLjk4Ni0zLjk4N0wzLjg0MiAxNi4xNzRhMiAyIDAgMCAwLS41LjgzbC0xLjMyMSA0LjM1MmEuNS41IDAgMCAwIC42MjMuNjIybDQuMzUzLTEuMzJhMiAyIDAgMCAwIC44My0uNDk3eiIgLz4KICA8cGF0aCBkPSJtMTUgNSA0IDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/pencil
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
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let todos = data.todos || [];
    let showCreateForm = false;
    let editingTodoId = null;
    let editTitle = "";
    let editDescription = "";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head($$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>Todo App - Aphex Base Template</title>`);
        });
        $$renderer4.push(`<meta name="description" content="A simple todo app built with Aphex CMS"/>`);
      });
      $$renderer3.push(`<div class="from-primary/10 via-primary/5 to-primary/10 border-b bg-gradient-to-r"><div class="container mx-auto max-w-4xl px-6 py-3"><div class="flex items-center justify-between text-sm"><div class="flex items-center gap-2"><span class="font-semibold">⚡ Powered by Aphex Local API</span> <span class="text-muted-foreground">• Full CRUD operations • Multi-tenant • Type-safe</span></div> <a${attr("href", resolve("/admin"))} class="text-primary font-medium hover:underline">Admin Panel →</a></div></div></div> <div class="container mx-auto max-w-4xl p-6"><div class="mb-8"><div class="flex items-center justify-between"><div><h1 class="text-4xl font-bold">Todo App</h1> <p class="text-muted-foreground mt-2">Manage your tasks with Aphex CMS `);
      if (data.isLoggedIn) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<span class="ml-2 text-sm text-green-600">• Logged in as ${escape_html(data.userName)}</span>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></p></div> <div class="flex gap-2">`);
      if (data.isLoggedIn) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<button type="button" class="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">`);
        Plus($$renderer3, { class: "h-4 w-4" });
        $$renderer3.push(`<!----> ${escape_html("Add Todo")}</button>`);
      } else {
        $$renderer3.push("<!--[!-->");
        Button($$renderer3, {
          href: "/login",
          variant: "outline",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->Login`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer3.push(`<!--]--></div></div></div> `);
      if (data.isLoggedIn && showCreateForm) ;
      else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (todos.length === 0) {
        $$renderer3.push("<!--[-->");
        Card($$renderer3, {
          children: ($$renderer4) => {
            Card_content($$renderer4, {
              class: "flex flex-col items-center justify-center py-12",
              children: ($$renderer5) => {
                List_todo($$renderer5, { class: "text-muted-foreground mb-4 h-12 w-12" });
                $$renderer5.push(`<!----> <h3 class="mb-2 text-lg font-semibold">No todos yet</h3> `);
                if (data.isLoggedIn) {
                  $$renderer5.push("<!--[-->");
                  $$renderer5.push(`<p class="text-muted-foreground mb-4 text-sm">Get started by adding your first todo item</p> <button type="button" class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">`);
                  Plus($$renderer5, { class: "mr-2 h-4 w-4" });
                  $$renderer5.push(`<!----> Create Todo</button>`);
                } else {
                  $$renderer5.push("<!--[!-->");
                  $$renderer5.push(`<p class="text-muted-foreground mb-4 text-sm">Please log in to create and manage your todos</p> `);
                  Button($$renderer5, {
                    href: "/login",
                    variant: "outline",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Login to Get Started`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!---->`);
                }
                $$renderer5.push(`<!--]-->`);
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div class="space-y-4"><!--[-->`);
        const each_array = ensure_array_like(todos);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let todo = each_array[$$index];
          Card($$renderer3, {
            children: ($$renderer4) => {
              Card_header($$renderer4, {
                children: ($$renderer5) => {
                  $$renderer5.push(`<div class="flex items-start gap-4"><form method="POST" action="?/toggleComplete"><input type="hidden" name="id"${attr("value", todo.id)}/> <input type="hidden" name="completed"${attr("value", todo.completed)}/> <button type="submit" class="cursor-pointer">`);
                  if (todo.completed) {
                    $$renderer5.push("<!--[-->");
                    Circle_check($$renderer5, {
                      class: "mt-1 h-5 w-5 text-green-500 transition-colors hover:text-green-600"
                    });
                  } else {
                    $$renderer5.push("<!--[!-->");
                    Circle($$renderer5, {
                      class: "text-muted-foreground hover:text-primary mt-1 h-5 w-5 transition-colors"
                    });
                  }
                  $$renderer5.push(`<!--]--></button></form> <div class="flex-1">`);
                  if (editingTodoId === todo.id) {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<form method="POST" action="?/updateTodo" class="space-y-3"><input type="hidden" name="id"${attr("value", todo.id)}/> `);
                    Input($$renderer5, {
                      type: "text",
                      name: "title",
                      placeholder: "Title",
                      required: true,
                      get value() {
                        return editTitle;
                      },
                      set value($$value) {
                        editTitle = $$value;
                        $$settled = false;
                      }
                    });
                    $$renderer5.push(`<!----> `);
                    Textarea($$renderer5, {
                      name: "description",
                      placeholder: "Description (optional)",
                      rows: 2,
                      get value() {
                        return editDescription;
                      },
                      set value($$value) {
                        editDescription = $$value;
                        $$settled = false;
                      }
                    });
                    $$renderer5.push(`<!----> <div class="flex gap-2">`);
                    Button($$renderer5, {
                      type: "submit",
                      size: "sm",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->Save`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> <button type="button" class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">Cancel</button></div></form>`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    Card_title($$renderer5, {
                      class: todo.completed ? "line-through opacity-60" : "",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->${escape_html(todo.title)}`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> `);
                    if (todo.description) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<p class="text-muted-foreground mt-2 text-sm">${escape_html(todo.description)}</p>`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                  $$renderer5.push(`<!--]--></div> `);
                  if (data.isLoggedIn && editingTodoId !== todo.id) {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<div class="flex gap-2"><button type="button" class="text-muted-foreground hover:text-primary cursor-pointer transition-colors" title="Edit todo">`);
                    Pencil($$renderer5, { class: "h-4 w-4" });
                    $$renderer5.push(`<!----></button> <form method="POST" action="?/deleteTodo"><input type="hidden" name="id"${attr("value", todo.id)}/> <button type="submit" class="text-muted-foreground hover:text-destructive cursor-pointer transition-colors" title="Delete todo">`);
                    Trash_2($$renderer5, { class: "h-4 w-4" });
                    $$renderer5.push(`<!----></button></form></div>`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]--></div>`);
                },
                $$slots: { default: true }
              });
            },
            $$slots: { default: true }
          });
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--> <div class="text-muted-foreground mt-8 text-center text-sm"><p>You can also manage your todos in the <a${attr("href", resolve("/admin"))} class="font-medium underline">admin panel</a></p></div></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B5M0FWAs.js.map
