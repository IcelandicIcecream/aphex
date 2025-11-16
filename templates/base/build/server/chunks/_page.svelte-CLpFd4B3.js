import { h as head, V as attr_class, N as clsx, T as stringify, O as ensure_array_like, f as attr, z as sanitize_props, F as spread_props, G as slot, K as attributes, Q as bind_props } from './index2-PlYtOn9l.js';
import { B as Button, c as cn } from './button-BaYTBSEJ.js';
import { A as Alert, B as Badge, x as documents, y as ApiError } from './states.svelte-CFLau3Qg.js';
import { g as goto } from './client-DH_42K1x.js';
import { T as Tabs, a as Tabs_content } from './tabs-content-NbN11zT3.js';
import { p as page } from './index5-C8-UKNy8.js';
import { p as SvelteURLSearchParams } from './dialog-overlay-LaS6gPE6.js';
import { e as escape_html, s as setContext } from './context-DL4CYGHS.js';
import { I as Icon } from './Icon-DHGqHCBy.js';
import './create-id-mXGs1H6b.js';
import './exports-Honk4keX.js';
import './state.svelte-BCegLL_9.js';
import { s as schemaTypes } from './index6-BnUmswa-.js';
import { a as activeTabState } from './activeTab.svelte-Do2xF_HZ.js';
import './events-DlbR6UiW.js';
import './index-BKwQgGLQ.js';
import './list-todo-oKtgC1b1.js';

function sortObject(item) {
  if (item === null || typeof item !== "object")
    return item;
  if (Array.isArray(item)) {
    return item.map(sortObject);
  }
  const sortedKeys = Object.keys(item).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = sortObject(item[key]);
  }
  return sortedObj;
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function createContentHash(data, includeTimestamp = true) {
  const hashData = includeTimestamp ? {
    ...data,
    _lastModified: (/* @__PURE__ */ new Date()).toISOString()
  } : data;
  const stableJson = JSON.stringify(sortObject(hashData));
  return simpleHash(stableJson);
}
function createPublishedHash(data) {
  return createContentHash(data, false);
}
function hasUnpublishedChanges(draftData, publishedHash) {
  if (!publishedHash)
    return true;
  const publishedDataHash = createPublishedHash(draftData);
  return publishedDataHash !== publishedHash;
}
const SCHEMA_CONTEXT_KEY = Symbol("aphex-schemas");
function setSchemaContext(schemas) {
  setContext(SCHEMA_CONTEXT_KEY, schemas);
}
function Alert_description($$renderer, $$props) {
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
      "data-slot": "alert-description",
      class: clsx(cn("text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Alert_title($$renderer, $$props) {
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
      "data-slot": "alert-title",
      class: clsx(cn("col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function File_text($$renderer, $$props) {
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
        "d": "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
      }
    ],
    ["path", { "d": "M14 2v4a2 2 0 0 0 2 2h4" }],
    ["path", { "d": "M10 9H8" }],
    ["path", { "d": "M16 13H8" }],
    ["path", { "d": "M16 17H8" }]
  ];
  Icon($$renderer, spread_props([
    { name: "file-text" },
    $$sanitized_props,
    {
      /**
       * @component @name FileText
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMkg2YTIgMiAwIDAgMC0yIDJ2MTZhMiAyIDAgMCAwIDIgMmgxMmEyIDIgMCAwIDAgMi0yVjdaIiAvPgogIDxwYXRoIGQ9Ik0xNCAydjRhMiAyIDAgMCAwIDIgMmg0IiAvPgogIDxwYXRoIGQ9Ik0xMCA5SDgiIC8+CiAgPHBhdGggZD0iTTE2IDEzSDgiIC8+CiAgPHBhdGggZD0iTTE2IDE3SDgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/file-text
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
function DocumentEditor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      schemas,
      documentType,
      documentId,
      onBack,
      onDeleted,
      onPublished,
      isReadOnly = false
    } = $$props;
    setSchemaContext(schemas);
    let documentData = {};
    let fullDocument = null;
    let saving = false;
    let saveError = null;
    let lastSaved = null;
    let publishSuccess = null;
    let showDropdown = false;
    let hasValidationErrors = false;
    const hasUnpublishedContent = hasUnpublishedChanges(documentData, fullDocument?._meta?.publishedHash || null);
    const canPublish = hasUnpublishedContent && !saving && documentId && !hasValidationErrors;
    function getPreviewTitle() {
      {
        return documentData.title || `Untitled`;
      }
    }
    async function publishDocument() {
      if (!documentId || saving) return;
      await validateAllFields();
      if (hasValidationErrors) {
        saveError = "Cannot publish: Please fix validation errors first";
        return;
      }
      saving = true;
      saveError = null;
      try {
        const response = await documents.publish(documentId);
        if (response.success && response.data) {
          fullDocument = response.data;
          lastSaved = /* @__PURE__ */ new Date();
          publishSuccess = /* @__PURE__ */ new Date();
          console.log("✅ Document published successfully");
          console.log("📄 New published hash:", response.data.publishedHash);
          if (onPublished && documentId) {
            onPublished(documentId);
          }
        } else {
          throw new Error(response.error || "Failed to publish document");
        }
      } catch (err) {
        console.error("Failed to publish document:", err);
        if (err instanceof ApiError && err.response?.validationErrors) {
          const validationErrors = err.response.validationErrors;
          const errorMessages = validationErrors.map((ve) => `${ve.field}: ${ve.errors.join(", ")}`).join("; ");
          saveError = `Cannot publish - Validation failed: ${errorMessages}`;
        } else {
          saveError = err instanceof ApiError ? err.message : "Failed to publish document";
        }
      } finally {
        saving = false;
      }
    }
    async function validateAllFields() {
      {
        hasValidationErrors = false;
        return;
      }
    }
    async function deleteDocument() {
      if (!documentId || saving) return;
      const confirmDelete = confirm(`Are you sure you want to delete this document? This action cannot be undone.`);
      if (!confirmDelete) return;
      saving = true;
      saveError = null;
      try {
        const response = await documents.deleteById(documentId);
        if (response.success) {
          console.log("✅ Document deleted successfully");
          onDeleted?.();
        } else {
          throw new Error(response.error || "Failed to delete document");
        }
      } catch (err) {
        console.error("Failed to delete document:", err);
        saveError = err instanceof ApiError ? err.message : "Failed to delete document";
      } finally {
        saving = false;
      }
    }
    $$renderer2.push(`<div class="relative flex h-full flex-col"><div class="border-border bg-background flex h-14 items-center justify-between border-b px-4"><div class="flex items-center gap-3 overflow-hidden"><div class="min-w-0 flex-1"><h3 class="truncate text-sm font-medium">${escape_html(getPreviewTitle())}</h3> <div class="flex items-center gap-2">`);
    if (saving) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-muted-foreground text-xs">Saving...</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (lastSaved) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="text-muted-foreground text-xs">Saved ${escape_html(lastSaved.toLocaleTimeString())}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
        {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    if (fullDocument?.createdBy) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-muted-foreground hidden text-xs sm:inline">• Created by ${escape_html(typeof fullDocument.createdBy === "string" ? fullDocument.createdBy : fullDocument.createdBy.name || fullDocument.createdBy.email)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div> <div class="flex items-center gap-2">`);
    if (saving) {
      $$renderer2.push("<!--[-->");
      Badge($$renderer2, {
        variant: "secondary",
        class: "hidden sm:flex",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->Saving...`);
        },
        $$slots: { default: true }
      });
    } else {
      $$renderer2.push("<!--[!-->");
      if (publishSuccess && (/* @__PURE__ */ new Date()).getTime() - publishSuccess.getTime() < 3e3) {
        $$renderer2.push("<!--[-->");
        Badge($$renderer2, {
          variant: "default",
          class: "hidden sm:flex",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->Published!`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[!-->");
        if (hasUnpublishedContent) {
          $$renderer2.push("<!--[-->");
          Badge($$renderer2, {
            variant: "outline",
            class: "hidden sm:flex",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Unpublished`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[!-->");
          if (lastSaved) {
            $$renderer2.push("<!--[-->");
            Badge($$renderer2, {
              variant: "secondary",
              class: "hidden sm:flex",
              children: ($$renderer3) => {
                $$renderer3.push(`<!---->Saved`);
              },
              $$slots: { default: true }
            });
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--> `);
    Button($$renderer2, {
      variant: "ghost",
      size: "icon",
      onclick: onBack,
      class: "hidden h-8 w-8 hover:cursor-pointer lg:flex",
      title: "Close",
      children: ($$renderer3) => {
        $$renderer3.push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div> <div class="flex-1 space-y-4 overflow-auto p-4 lg:space-y-6 lg:p-6">`);
    if (saveError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-destructive/10 border-destructive/20 rounded-md border p-3"><p class="text-destructive text-sm">${escape_html(saveError)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
      {
        $$renderer2.push("<!--[!-->");
        {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="border-muted-foreground/30 rounded-md border border-dashed p-4"><p class="text-muted-foreground text-center text-sm">No schema found for document type: ${escape_html(documentType)}</p></div>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (documentId) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="border-border bg-background border-t p-4"><div class="flex items-center justify-between"><div class="flex items-center gap-2">`);
      if (saving) {
        $$renderer2.push("<!--[-->");
        Badge($$renderer2, {
          variant: "secondary",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->Saving...`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[!-->");
        if (publishSuccess && (/* @__PURE__ */ new Date()).getTime() - publishSuccess.getTime() < 3e3) {
          $$renderer2.push("<!--[-->");
          Badge($$renderer2, {
            variant: "default",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Published!`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer2.push("<!--[!-->");
          {
            $$renderer2.push("<!--[!-->");
            if (hasUnpublishedContent) {
              $$renderer2.push("<!--[-->");
              Badge($$renderer2, {
                variant: "outline",
                children: ($$renderer3) => {
                  $$renderer3.push(`<!---->Unpublished Changes`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer2.push("<!--[!-->");
              if (lastSaved) {
                $$renderer2.push("<!--[-->");
                Badge($$renderer2, {
                  variant: "secondary",
                  children: ($$renderer3) => {
                    $$renderer3.push(`<!---->Saved`);
                  },
                  $$slots: { default: true }
                });
              } else {
                $$renderer2.push("<!--[!-->");
              }
              $$renderer2.push(`<!--]-->`);
            }
            $$renderer2.push(`<!--]-->`);
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--></div> <div class="flex items-center gap-2">`);
      if (!isReadOnly) {
        $$renderer2.push("<!--[-->");
        Button($$renderer2, {
          onclick: publishDocument,
          disabled: !canPublish,
          size: "sm",
          variant: canPublish ? "default" : "secondary",
          class: "cursor-pointer",
          children: ($$renderer3) => {
            if (saving) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`Publishing...`);
            } else {
              $$renderer3.push("<!--[!-->");
              if (!hasUnpublishedContent) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`Published`);
              } else {
                $$renderer3.push("<!--[!-->");
                $$renderer3.push(`Publish Changes`);
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]-->`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer2.push("<!--[!-->");
        Badge($$renderer2, {
          variant: "secondary",
          class: "text-xs",
          children: ($$renderer3) => {
            $$renderer3.push(`<!---->Read Only`);
          },
          $$slots: { default: true }
        });
      }
      $$renderer2.push(`<!--]--> `);
      if (!isReadOnly) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="relative">`);
        Button($$renderer2, {
          onclick: () => showDropdown = !showDropdown,
          variant: "ghost",
          class: "hover:bg-muted flex h-8 w-8 items-center justify-center rounded transition-colors",
          children: ($$renderer3) => {
            $$renderer3.push(`<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01"></path></svg>`);
          },
          $$slots: { default: true }
        });
        $$renderer2.push(`<!----> `);
        if (showDropdown) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="bg-background border-border absolute bottom-full right-0 z-50 mb-2 min-w-[140px] rounded-md border py-1 shadow-lg">`);
          Button($$renderer2, {
            variant: "ghost",
            onclick: () => {
              showDropdown = false;
              deleteDocument();
            },
            class: "hover:bg-muted text-destructive flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
            children: ($$renderer3) => {
              $$renderer3.push(`<!---->Delete document`);
            },
            $$slots: { default: true }
          });
          $$renderer2.push(`<!----></div> <div class="fixed inset-0 z-40"></div>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
function AdminApp($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      schemas,
      documentTypes: documentTypesFromServer,
      schemaError = null,
      title = "Aphex CMS",
      graphqlSettings = null,
      isReadOnly = false,
      activeTab = { value: "structure" },
      handleTabChange = () => {
      }
    } = $$props;
    const documentTypes = documentTypesFromServer.map((docType) => {
      const schema = schemas.find((s) => s.name === docType.name);
      return { ...docType, icon: schema?.icon };
    });
    const hasDocumentTypes = documentTypes.length > 0;
    let selectedDocumentType = null;
    let windowWidth = 1024;
    let editorStack = [];
    let activeEditorIndex = 0;
    const MIN_EDITOR_WIDTH = 600;
    const COLLAPSED_WIDTH = 60;
    const TYPES_EXPANDED = 350;
    const DOCS_EXPANDED = 350;
    let layoutConfig = (() => {
      const start = performance.now();
      const totalEditors = 0 + editorStack.length;
      if (totalEditors === 0) {
        return {
          totalEditors: 0,
          expandedCount: 0,
          collapsedCount: 0,
          typesCollapsed: false,
          docsCollapsed: false,
          expandedIndices: [],
          activeIndex: activeEditorIndex,
          typesExpanded: true,
          docsExpanded: true
        };
      }
      const validActiveIndex = activeEditorIndex < 0 ? activeEditorIndex : Math.max(0, Math.min(activeEditorIndex, totalEditors - 1));
      const typesActive = activeEditorIndex === -1;
      const docsActive = activeEditorIndex === -2;
      let typesExpanded = typesActive || true;
      let docsExpanded = docsActive || true;
      let typesWidth = typesExpanded ? TYPES_EXPANDED : COLLAPSED_WIDTH;
      let docsWidth = 0;
      if (typesActive || docsActive) {
        typesExpanded = typesActive ? true : typesExpanded;
        docsExpanded = docsActive ? true : docsExpanded;
        typesWidth = typesActive ? TYPES_EXPANDED : COLLAPSED_WIDTH;
        docsWidth = docsActive ? DOCS_EXPANDED : 0;
        let remainingWidth2 = windowWidth - typesWidth - docsWidth;
        let maxExpandedEditors2 = Math.floor(remainingWidth2 / MIN_EDITOR_WIDTH);
        if (maxExpandedEditors2 < 1) maxExpandedEditors2 = 0;
        let expandedIndices2 = [];
        if (maxExpandedEditors2 > 0 && totalEditors > 0) {
          const lastEditorIndex = totalEditors - 1;
          expandedIndices2.push(lastEditorIndex);
          for (let i = lastEditorIndex - 1; i >= 0 && expandedIndices2.length < maxExpandedEditors2; i--) {
            expandedIndices2.push(i);
          }
        }
        const expandedCount2 = expandedIndices2.length;
        return {
          totalEditors,
          expandedCount: expandedCount2,
          collapsedCount: totalEditors - expandedCount2,
          typesCollapsed: !typesExpanded,
          docsCollapsed: !docsExpanded,
          expandedIndices: expandedIndices2,
          activeIndex: validActiveIndex,
          typesExpanded,
          docsExpanded
        };
      }
      let remainingWidth = windowWidth - typesWidth - docsWidth;
      let maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);
      if (maxExpandedEditors < totalEditors) {
        docsWidth = 0;
        docsExpanded = false;
        remainingWidth = windowWidth - typesWidth - docsWidth;
        maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);
      }
      if (maxExpandedEditors < totalEditors) {
        typesWidth = COLLAPSED_WIDTH;
        typesExpanded = false;
        remainingWidth = windowWidth - typesWidth - docsWidth;
        maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);
      }
      if (maxExpandedEditors < 1) {
        maxExpandedEditors = 1;
      }
      let expandedIndices = [validActiveIndex];
      if (maxExpandedEditors > 1) {
        const slotsToFill = Math.min(maxExpandedEditors - 1, totalEditors - 1);
        for (let offset = 1; offset <= slotsToFill; offset++) {
          const leftIndex = validActiveIndex - offset;
          const rightIndex = validActiveIndex + offset;
          if (offset % 2 === 1) {
            if (rightIndex < totalEditors && !expandedIndices.includes(rightIndex)) {
              expandedIndices.push(rightIndex);
              if (expandedIndices.length >= maxExpandedEditors) break;
            }
            if (leftIndex >= 0 && !expandedIndices.includes(leftIndex)) {
              expandedIndices.push(leftIndex);
              if (expandedIndices.length >= maxExpandedEditors) break;
            }
          } else {
            if (leftIndex >= 0 && !expandedIndices.includes(leftIndex)) {
              expandedIndices.push(leftIndex);
              if (expandedIndices.length >= maxExpandedEditors) break;
            }
            if (rightIndex < totalEditors && !expandedIndices.includes(rightIndex)) {
              expandedIndices.push(rightIndex);
              if (expandedIndices.length >= maxExpandedEditors) break;
            }
          }
        }
      }
      const expandedCount = expandedIndices.length;
      const end = performance.now();
      console.log(`[Layout Calc] ${(end - start).toFixed(3)}ms | Editors: ${totalEditors} | Expanded: ${expandedCount} | Window: ${windowWidth}px | Active: ${validActiveIndex} | ExpandedIndices: [${expandedIndices.join(", ")}]`);
      return {
        totalEditors,
        expandedCount,
        collapsedCount: totalEditors - expandedCount,
        typesCollapsed: !typesExpanded,
        docsCollapsed: !docsExpanded,
        expandedIndices,
        activeIndex: validActiveIndex,
        typesExpanded,
        docsExpanded
      };
    })();
    let typesPanel = (() => {
      return layoutConfig.typesExpanded ? "w-[350px]" : "w-[60px]";
    })();
    async function handleCloseStackedEditor(index) {
      const newStack = editorStack.slice(0, index);
      const params = new SvelteURLSearchParams(page.url.searchParams);
      if (newStack.length > 0) {
        const stackParam = newStack.map((item) => `${item.documentType}:${item.documentId}`).join(",");
        params.set("stack", stackParam);
      } else {
        params.delete("stack");
      }
      await goto(`/admin?${params.toString()}`, {});
      activeEditorIndex = Math.min(activeEditorIndex, newStack.length);
    }
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(activeTab.value === "structure" ? "Content" : "Vision")} - ${escape_html(title)}</title>`);
      });
    });
    $$renderer2.push(`<div class="flex h-full flex-col overflow-hidden">`);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex-1 overflow-hidden"><!---->`);
    Tabs($$renderer2, {
      value: activeTab.value,
      onValueChange: handleTabChange,
      class: "h-full",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Tabs_content($$renderer3, {
          value: "structure",
          class: "h-full overflow-hidden",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            {
              $$renderer4.push(`<div${attr_class(clsx("flex h-full w-full overflow-hidden"))}>`);
              if (schemaError) {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<div class="bg-destructive/5 flex flex-1 items-center justify-center p-8"><div class="w-full max-w-2xl">`);
                Alert($$renderer4, {
                  variant: "destructive",
                  children: ($$renderer5) => {
                    $$renderer5.push(`<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.704-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>`);
                    Alert_title($$renderer5, {
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->Schema Validation Error`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!---->`);
                    Alert_description($$renderer5, {
                      class: "whitespace-pre-line",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->${escape_html(schemaError.message)}`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!----></div></div>`);
              } else {
                $$renderer4.push("<!--[!-->");
                $$renderer4.push(`<div${attr_class(`border-r transition-all duration-200 ${stringify(typesPanel)} ${stringify(typesPanel === "hidden" ? "hidden" : "block")} h-full overflow-hidden`)}>`);
                if (typesPanel === "w-[60px]") {
                  $$renderer4.push("<!--[-->");
                  $$renderer4.push(`<button class="hover:bg-muted/30 flex h-full w-full flex-col transition-colors" title="Click to expand content types"><div class="flex flex-1 items-start justify-center p-2 pt-8 text-left"><div class="text-foreground rotate-90 transform whitespace-nowrap text-sm font-medium">Content</div></div></button>`);
                } else {
                  $$renderer4.push("<!--[!-->");
                  $$renderer4.push(`<div class="h-full overflow-y-auto">`);
                  if (hasDocumentTypes) {
                    $$renderer4.push("<!--[-->");
                    $$renderer4.push(`<!--[-->`);
                    const each_array = ensure_array_like(documentTypes);
                    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                      let docType = each_array[index];
                      $$renderer4.push(`<button${attr_class(`hover:bg-muted/50 border-border group flex w-full items-center justify-between border-b p-3 text-left transition-colors first:border-t ${stringify(selectedDocumentType === docType.name ? "bg-muted/50" : "")}`)}><div class="flex items-center gap-3"><div class="flex h-6 w-6 items-center justify-center">`);
                      if (docType.icon) {
                        $$renderer4.push("<!--[-->");
                        const Icon2 = docType.icon;
                        $$renderer4.push(`<!---->`);
                        Icon2($$renderer4, { class: "text-muted-foreground h-4 w-4" });
                        $$renderer4.push(`<!---->`);
                      } else {
                        $$renderer4.push("<!--[!-->");
                        File_text($$renderer4, { class: "text-muted-foreground h-4 w-4" });
                      }
                      $$renderer4.push(`<!--]--></div> <div><h3 class="text-sm font-medium">${escape_html(docType.title)}s</h3> `);
                      if (docType.description) {
                        $$renderer4.push("<!--[-->");
                        $$renderer4.push(`<p class="text-muted-foreground text-xs">${escape_html(docType.description)}</p>`);
                      } else {
                        $$renderer4.push("<!--[!-->");
                      }
                      $$renderer4.push(`<!--]--></div></div> <div class="text-muted-foreground group-hover:text-foreground transition-colors"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></button>`);
                    }
                    $$renderer4.push(`<!--]-->`);
                  } else {
                    $$renderer4.push("<!--[!-->");
                    $$renderer4.push(`<div class="p-6 text-center"><div class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">`);
                    File_text($$renderer4, { class: "text-muted-foreground h-8 w-8" });
                    $$renderer4.push(`<!----></div> <h3 class="mb-2 font-medium">No content types found</h3> <p class="text-muted-foreground mb-4 text-sm">Get started by defining your first schema type</p> <p class="text-muted-foreground text-xs">Add schemas in <code class="bg-muted rounded px-1.5 py-0.5 text-xs">src/lib/schemaTypes/</code></p></div>`);
                  }
                  $$renderer4.push(`<!--]--></div>`);
                }
                $$renderer4.push(`<!--]--></div> `);
                {
                  $$renderer4.push("<!--[!-->");
                }
                $$renderer4.push(`<!--]--> `);
                {
                  $$renderer4.push("<!--[!-->");
                }
                $$renderer4.push(`<!--]--> <!--[-->`);
                const each_array_2 = ensure_array_like(editorStack);
                for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
                  let stackedEditor = each_array_2[index];
                  const editorIndex = index + 1;
                  const isExpanded = layoutConfig.expandedIndices.includes(editorIndex);
                  if (isExpanded) {
                    $$renderer4.push("<!--[-->");
                    $$renderer4.push(`<div class="h-full flex-1 overflow-y-auto border-l transition-all duration-200" style="min-width: 0;">`);
                    DocumentEditor($$renderer4, {
                      schemas,
                      documentType: stackedEditor.documentType,
                      documentId: stackedEditor.documentId,
                      isCreating: stackedEditor.isCreating,
                      onBack: () => handleCloseStackedEditor(index),
                      onPublished: async (docId) => {
                      },
                      onDeleted: async () => {
                        handleCloseStackedEditor(index);
                      },
                      isReadOnly
                    });
                    $$renderer4.push(`<!----></div>`);
                  } else {
                    $$renderer4.push("<!--[!-->");
                    $$renderer4.push(`<button class="hover:bg-muted/50 flex h-full w-[60px] flex-col border-l transition-colors"${attr("title", `Click to expand ${stringify(stackedEditor.documentType)}`)}><div class="-mt-2 flex h-full flex-1 items-start justify-center p-2 pt-8 text-left"><div class="text-foreground rotate-90 transform whitespace-nowrap text-sm font-medium">${escape_html(stackedEditor.documentType.charAt(0).toUpperCase() + stackedEditor.documentType.slice(1))}</div></div></button>`);
                  }
                  $$renderer4.push(`<!--]-->`);
                }
                $$renderer4.push(`<!--]-->`);
              }
              $$renderer4.push(`<!--]--></div>`);
            }
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        if (graphqlSettings?.enableGraphiQL) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<!---->`);
          Tabs_content($$renderer3, {
            value: "vision",
            class: "m-0 h-full p-0",
            children: ($$renderer4) => {
              $$renderer4.push(`<div class="bg-muted/10 flex h-full items-center justify-center"><div class="space-y-4 text-center"><div class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"><svg class="text-primary h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg></div> <div><h3 class="mb-2 text-lg font-semibold">GraphQL Playground</h3> <p class="text-muted-foreground mb-4">Query your CMS data with the GraphQL API</p> <a${attr("href", graphqlSettings.endpoint)} target="_blank" class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors">Open Playground <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div></div></div>`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]-->`);
      },
      $$slots: { default: true }
    });
    $$renderer2.push(`<!----></div></div>`);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    function handleTabChange(value) {
      if (activeTabState) activeTabState.value = value;
    }
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Admin Dashboard</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Manage your content, schemas, and configurations in the Aphex CMS admin dashboard."/>`);
    });
    AdminApp($$renderer2, {
      schemas: schemaTypes,
      documentTypes: data.documentTypes,
      schemaError: data.schemaError,
      graphqlSettings: data.graphqlSettings,
      isReadOnly: data.isReadOnly,
      activeTab: activeTabState,
      handleTabChange,
      title: "Aphex CMS"
    });
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CLpFd4B3.js.map
