import './date-utils-xyIWAIQq.js';
import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { B as Button } from './button-1bYQaKO-.js';
import { B as Badge } from './badge-DEuvdmY7.js';
import { n as noop, C as Context, R as RovingFocusGroup, B as watch, H as Alert, J as documents, K as ApiError, L as assets, E as ENTER, A as SPACE, I as Icon$1, N as isHTMLElement$1 } from './sheet-content-CfdNXqIw.js';
import { g as goto } from './client-BGGljB7r.js';
import './exports-Ci9YzwMm.js';
import { i as head, b as bind_props, s as spread_props, p as props_id, a as attributes, d as derived, k as attr_class, c as clsx, j as stringify, f as ensure_array_like, g as attr } from './index5-DltsKoco.js';
import { c as cn } from './utils2-CVx6kO_W.js';
import { S as SvelteMap, f as SvelteSet, g as SvelteURLSearchParams } from './states.svelte-CxCkWsnb.js';
import { g as createId, b as boxWith, m as mergeProps, h as attachRef, c as createBitsAttrs, v as boolToTrueOrUndef, n as boolToEmptyStrOrUndef, l as boolToStr, w as getAriaChecked } from './create-id-BLMzD-FL.js';
import { p as page } from './index6-DBfMzOzG.js';
import { e as escape_html, s as setContext, i as is_array, b as get_prototype_of, o as object_prototype } from './context-CAhUmS6w.js';
import { h as hasUnpublishedChanges } from './content-hash-AOe_NOqf.js';
import { a as toast } from './toast-state.svelte-Mh0AHws7.js';
import { I as Input } from './input-BofgIw5Q.js';
import { L as Label } from './label-5D2TW-nG.js';
import { S as Separator } from './separator-ixXNQJwr.js';
import { H as Hidden_input } from './hidden-input-DHMyjzNC.js';
import { C as Check } from './check-D1w3Hmpb.js';
import { R as Root, D as Dialog_content, a as Dialog_header, b as Dialog_title } from './index9-DT6mVqr6.js';
import { I as Icon } from './Icon-DO-BLZpI.js';
import { T as Trash_2 } from './trash-2-mTnOnpbg.js';
import { s as schemaTypes, F as File_text, L as Link } from './index12-ZuUw5hPA.js';
import { a as activeTabState, C as Chevron_right } from './activeTab.svelte-Bf8zhE4c.js';
import './index3-BFl01i1Z.js';
import './_commonjsHelpers-C1uiShF5.js';
import './events-C5y5VZ_W.js';
import './dialog-BO7xkDHk.js';
import './mail-BIlX5HQf.js';

const empty = [];
function snapshot(value, skip_warning = false, no_tojson = false) {
  return clone(value, /* @__PURE__ */ new Map(), "", empty, null, no_tojson);
}
function clone(value, cloned, path, paths, original = null, no_tojson = false) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element = value[i];
        if (i in value) {
          copy[i] = clone(element, cloned, path, paths, null, no_tojson);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key in value) {
        copy[key] = clone(
          // @ts-expect-error
          value[key],
          cloned,
          path,
          paths,
          null,
          no_tojson
        );
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function" && !no_tojson) {
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        path,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
const SCHEMA_CONTEXT_KEY = Symbol("aphex-schemas");
function setSchemaContext(schemas) {
  setContext(SCHEMA_CONTEXT_KEY, schemas);
}
const checkboxAttrs = createBitsAttrs({
  component: "checkbox",
  parts: ["root", "group", "group-label", "input"]
});
const CheckboxGroupContext = new Context("Checkbox.Group");
const CheckboxRootContext = new Context("Checkbox.Root");
class CheckboxRootState {
  static create(opts, group = null) {
    return CheckboxRootContext.set(new CheckboxRootState(opts, group));
  }
  opts;
  group;
  #trueName = derived(() => {
    if (this.group && this.group.opts.name.current) return this.group.opts.name.current;
    return this.opts.name.current;
  });
  get trueName() {
    return this.#trueName();
  }
  set trueName($$value) {
    return this.#trueName($$value);
  }
  #trueRequired = derived(() => {
    if (this.group && this.group.opts.required.current) return true;
    return this.opts.required.current;
  });
  get trueRequired() {
    return this.#trueRequired();
  }
  set trueRequired($$value) {
    return this.#trueRequired($$value);
  }
  #trueDisabled = derived(() => {
    if (this.group && this.group.opts.disabled.current) return true;
    return this.opts.disabled.current;
  });
  get trueDisabled() {
    return this.#trueDisabled();
  }
  set trueDisabled($$value) {
    return this.#trueDisabled($$value);
  }
  #trueReadonly = derived(() => {
    if (this.group && this.group.opts.readonly.current) return true;
    return this.opts.readonly.current;
  });
  get trueReadonly() {
    return this.#trueReadonly();
  }
  set trueReadonly($$value) {
    return this.#trueReadonly($$value);
  }
  attachment;
  constructor(opts, group) {
    this.opts = opts;
    this.group = group;
    this.attachment = attachRef(this.opts.ref);
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
    watch.pre(
      [
        () => snapshot(this.group?.opts.value.current),
        () => this.opts.value.current
      ],
      ([groupValue, value]) => {
        if (!groupValue || !value) return;
        this.opts.checked.current = groupValue.includes(value);
      }
    );
    watch.pre(() => this.opts.checked.current, (checked) => {
      if (!this.group) return;
      if (checked) {
        this.group?.addValue(this.opts.value.current);
      } else {
        this.group?.removeValue(this.opts.value.current);
      }
    });
  }
  onkeydown(e) {
    if (this.trueDisabled || this.trueReadonly) return;
    if (e.key === ENTER) e.preventDefault();
    if (e.key === SPACE) {
      e.preventDefault();
      this.#toggle();
    }
  }
  #toggle() {
    if (this.opts.indeterminate.current) {
      this.opts.indeterminate.current = false;
      this.opts.checked.current = true;
    } else {
      this.opts.checked.current = !this.opts.checked.current;
    }
  }
  onclick(e) {
    if (this.trueDisabled || this.trueReadonly) return;
    if (this.opts.type.current === "submit") {
      this.#toggle();
      return;
    }
    e.preventDefault();
    this.#toggle();
  }
  #snippetProps = derived(() => ({
    checked: this.opts.checked.current,
    indeterminate: this.opts.indeterminate.current
  }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "checkbox",
    type: this.opts.type.current,
    disabled: this.trueDisabled,
    "aria-checked": getAriaChecked(this.opts.checked.current, this.opts.indeterminate.current),
    "aria-required": boolToStr(this.trueRequired),
    "aria-readonly": boolToStr(this.trueReadonly),
    "data-disabled": boolToEmptyStrOrUndef(this.trueDisabled),
    "data-readonly": boolToEmptyStrOrUndef(this.trueReadonly),
    "data-state": getCheckboxDataState(this.opts.checked.current, this.opts.indeterminate.current),
    [checkboxAttrs.root]: "",
    onclick: this.onclick,
    onkeydown: this.onkeydown,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CheckboxInputState {
  static create() {
    return new CheckboxInputState(CheckboxRootContext.get());
  }
  root;
  #trueChecked = derived(() => {
    if (!this.root.group) return this.root.opts.checked.current;
    if (this.root.opts.value.current !== void 0 && this.root.group.opts.value.current.includes(this.root.opts.value.current)) {
      return true;
    }
    return false;
  });
  get trueChecked() {
    return this.#trueChecked();
  }
  set trueChecked($$value) {
    return this.#trueChecked($$value);
  }
  #shouldRender = derived(() => Boolean(this.root.trueName));
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(root) {
    this.root = root;
    this.onfocus = this.onfocus.bind(this);
  }
  onfocus(_) {
    if (!isHTMLElement$1(this.root.opts.ref.current)) return;
    this.root.opts.ref.current.focus();
  }
  #props = derived(() => ({
    type: "checkbox",
    checked: this.root.opts.checked.current === true,
    disabled: this.root.trueDisabled,
    required: this.root.trueRequired,
    name: this.root.trueName,
    value: this.root.opts.value.current,
    readonly: this.root.trueReadonly,
    onfocus: this.onfocus
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getCheckboxDataState(checked, indeterminate) {
  if (indeterminate) return "indeterminate";
  return checked ? "checked" : "unchecked";
}
function Checkbox_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const inputState = CheckboxInputState.create();
    if (inputState.shouldRender) {
      $$renderer2.push("<!--[-->");
      Hidden_input($$renderer2, spread_props([inputState.props]));
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function Checkbox$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      checked = false,
      ref = null,
      onCheckedChange,
      children,
      disabled = false,
      required = false,
      name = void 0,
      value = "on",
      id = createId(uid),
      indeterminate = false,
      onIndeterminateChange,
      child,
      type = "button",
      readonly,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const group = CheckboxGroupContext.getOr(null);
    if (group && value) {
      if (group.opts.value.current.includes(value)) {
        checked = true;
      } else {
        checked = false;
      }
    }
    watch.pre(() => value, () => {
      if (group && value) {
        if (group.opts.value.current.includes(value)) {
          checked = true;
        } else {
          checked = false;
        }
      }
    });
    const rootState = CheckboxRootState.create(
      {
        checked: boxWith(() => checked, (v) => {
          checked = v;
          onCheckedChange?.(v);
        }),
        disabled: boxWith(() => disabled ?? false),
        required: boxWith(() => required),
        name: boxWith(() => name),
        value: boxWith(() => value),
        id: boxWith(() => id),
        ref: boxWith(() => ref, (v) => ref = v),
        indeterminate: boxWith(() => indeterminate, (v) => {
          indeterminate = v;
          onIndeterminateChange?.(v);
        }),
        type: boxWith(() => type),
        readonly: boxWith(() => Boolean(readonly))
      },
      group
    );
    const mergedProps = mergeProps({ ...restProps }, rootState.props);
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps, ...rootState.snippetProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<button${attributes({ ...mergedProps })}>`);
      children?.($$renderer2, rootState.snippetProps);
      $$renderer2.push(`<!----></button>`);
    }
    $$renderer2.push(`<!--]--> `);
    Checkbox_input($$renderer2);
    $$renderer2.push(`<!---->`);
    bind_props($$props, { checked, ref, indeterminate });
  });
}
const tabsAttrs = createBitsAttrs({
  component: "tabs",
  parts: ["root", "list", "trigger", "content"]
});
const TabsRootContext = new Context("Tabs.Root");
class TabsRootState {
  static create(opts) {
    return TabsRootContext.set(new TabsRootState(opts));
  }
  opts;
  attachment;
  rovingFocusGroup;
  triggerIds = [];
  // holds the trigger ID for each value to associate it with the content
  valueToTriggerId = new SvelteMap();
  // holds the content ID for each value to associate it with the trigger
  valueToContentId = new SvelteMap();
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(opts.ref);
    this.rovingFocusGroup = new RovingFocusGroup({
      candidateAttr: tabsAttrs.trigger,
      rootNode: this.opts.ref,
      loop: this.opts.loop,
      orientation: this.opts.orientation
    });
  }
  registerTrigger(id, value) {
    this.triggerIds.push(id);
    this.valueToTriggerId.set(value, id);
    return () => {
      this.triggerIds = this.triggerIds.filter((triggerId) => triggerId !== id);
      this.valueToTriggerId.delete(value);
    };
  }
  registerContent(id, value) {
    this.valueToContentId.set(value, id);
    return () => {
      this.valueToContentId.delete(value);
    };
  }
  setValue(v) {
    this.opts.value.current = v;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-orientation": this.opts.orientation.current,
    [tabsAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TabsContentState {
  static create(opts) {
    return new TabsContentState(opts, TabsRootContext.get());
  }
  opts;
  root;
  attachment;
  #isActive = derived(() => this.root.opts.value.current === this.opts.value.current);
  #ariaLabelledBy = derived(() => this.root.valueToTriggerId.get(this.opts.value.current));
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(opts.ref);
    watch([() => this.opts.id.current, () => this.opts.value.current], ([id, value]) => {
      return this.root.registerContent(id, value);
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "tabpanel",
    hidden: boolToTrueOrUndef(!this.#isActive()),
    tabindex: 0,
    "data-value": this.opts.value.current,
    "data-state": getTabDataState(this.#isActive()),
    "aria-labelledby": this.#ariaLabelledBy(),
    "data-orientation": this.root.opts.orientation.current,
    [tabsAttrs.content]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function getTabDataState(condition) {
  return condition ? "active" : "inactive";
}
function Tabs$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      value = "",
      onValueChange = noop,
      orientation = "horizontal",
      loop = true,
      activationMode = "automatic",
      disabled = false,
      children,
      child,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = TabsRootState.create({
      id: boxWith(() => id),
      value: boxWith(() => value, (v) => {
        value = v;
        onValueChange(v);
      }),
      orientation: boxWith(() => orientation),
      loop: boxWith(() => loop),
      activationMode: boxWith(() => activationMode),
      disabled: boxWith(() => disabled),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, rootState.props);
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
    bind_props($$props, { ref, value });
  });
}
function Tabs_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      value,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = TabsContentState.create({
      value: boxWith(() => value),
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, contentState.props);
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
function Arrow_down_up($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "m3 16 4 4 4-4" }],
      ["path", { "d": "M7 20V4" }],
      ["path", { "d": "m21 8-4-4-4 4" }],
      ["path", { "d": "M17 4v16" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "arrow-down-up" },
      /**
       * @component @name ArrowDownUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMyAxNiA0IDQgNC00IiAvPgogIDxwYXRoIGQ9Ik03IDIwVjQiIC8+CiAgPHBhdGggZD0ibTIxIDgtNC00LTQgNCIgLz4KICA8cGF0aCBkPSJNMTcgNHYxNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/arrow-down-up
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
function Chevron_left($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "m15 18-6-6 6-6" }]];
    Icon($$renderer2, spread_props([
      { name: "chevron-left" },
      /**
       * @component @name ChevronLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTUgMTgtNi02IDYtNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevron-left
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
function Circle_alert($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["circle", { "cx": "12", "cy": "12", "r": "10" }],
      ["line", { "x1": "12", "x2": "12", "y1": "8", "y2": "12" }],
      [
        "line",
        { "x1": "12", "x2": "12.01", "y1": "16", "y2": "16" }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "circle-alert" },
      /**
       * @component @name CircleAlert
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMiIgeTE9IjgiIHkyPSIxMiIgLz4KICA8bGluZSB4MT0iMTIiIHgyPSIxMi4wMSIgeTE9IjE2IiB5Mj0iMTYiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/circle-alert
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
function Circle_check($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["circle", { "cx": "12", "cy": "12", "r": "10" }],
      ["path", { "d": "m9 12 2 2 4-4" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "circle-check" },
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
function Download($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M12 15V3" }],
      ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
      ["path", { "d": "m7 10 5 5 5-5" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "download" },
      /**
       * @component @name Download
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgMTVWMyIgLz4KICA8cGF0aCBkPSJNMjEgMTV2NGEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnYtNCIgLz4KICA8cGF0aCBkPSJtNyAxMCA1IDUgNS01IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/download
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
function File_image($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"
        }
      ],
      ["path", { "d": "M14 2v5a1 1 0 0 0 1 1h5" }],
      ["circle", { "cx": "10", "cy": "12", "r": "2" }],
      [
        "path",
        { "d": "m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22" }
      ]
    ];
    Icon($$renderer2, spread_props([
      { name: "file-image" },
      /**
       * @component @name FileImage
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNiAyMmEyIDIgMCAwIDEtMi0yVjRhMiAyIDAgMCAxIDItMmg4YTIuNCAyLjQgMCAwIDEgMS43MDQuNzA2bDMuNTg4IDMuNTg4QTIuNCAyLjQgMCAwIDEgMjAgOHYxMmEyIDIgMCAwIDEtMiAyeiIgLz4KICA8cGF0aCBkPSJNMTQgMnY1YTEgMSAwIDAgMCAxIDFoNSIgLz4KICA8Y2lyY2xlIGN4PSIxMCIgY3k9IjEyIiByPSIyIiAvPgogIDxwYXRoIGQ9Im0yMCAxNy0xLjI5Ni0xLjI5NmEyLjQxIDIuNDEgMCAwIDAtMy40MDggMEw5IDIyIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/file-image
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
function Grid_3x3($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "rect",
        { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }
      ],
      ["path", { "d": "M3 9h18" }],
      ["path", { "d": "M3 15h18" }],
      ["path", { "d": "M9 3v18" }],
      ["path", { "d": "M15 3v18" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "grid-3x3" },
      /**
       * @component @name Grid3x3
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiAvPgogIDxwYXRoIGQ9Ik0zIDloMTgiIC8+CiAgPHBhdGggZD0iTTMgMTVoMTgiIC8+CiAgPHBhdGggZD0iTTkgM3YxOCIgLz4KICA8cGF0aCBkPSJNMTUgM3YxOCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/grid-3x3
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
function Image($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "rect",
        {
          "width": "18",
          "height": "18",
          "x": "3",
          "y": "3",
          "rx": "2",
          "ry": "2"
        }
      ],
      ["circle", { "cx": "9", "cy": "9", "r": "2" }],
      ["path", { "d": "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "image" },
      /**
       * @component @name Image
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiByeT0iMiIgLz4KICA8Y2lyY2xlIGN4PSI5IiBjeT0iOSIgcj0iMiIgLz4KICA8cGF0aCBkPSJtMjEgMTUtMy4wODYtMy4wODZhMiAyIDAgMCAwLTIuODI4IDBMNiAyMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/image
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
function List($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M3 5h.01" }],
      ["path", { "d": "M3 12h.01" }],
      ["path", { "d": "M3 19h.01" }],
      ["path", { "d": "M8 5h13" }],
      ["path", { "d": "M8 12h13" }],
      ["path", { "d": "M8 19h13" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "list" },
      /**
       * @component @name List
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMyA1aC4wMSIgLz4KICA8cGF0aCBkPSJNMyAxMmguMDEiIC8+CiAgPHBhdGggZD0iTTMgMTloLjAxIiAvPgogIDxwYXRoIGQ9Ik04IDVoMTMiIC8+CiAgPHBhdGggZD0iTTggMTJoMTMiIC8+CiAgPHBhdGggZD0iTTggMTloMTMiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/list
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
function Search($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "m21 21-4.34-4.34" }],
      ["circle", { "cx": "11", "cy": "11", "r": "8" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "search" },
      /**
       * @component @name Search
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjEgMjEtNC4zNC00LjM0IiAvPgogIDxjaXJjbGUgY3g9IjExIiBjeT0iMTEiIHI9IjgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/search
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
function Square_check_big($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      [
        "path",
        {
          "d": "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"
        }
      ],
      ["path", { "d": "m9 11 3 3L22 4" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "square-check-big" },
      /**
       * @component @name SquareCheckBig
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjEgMTAuNjU2VjE5YTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0yVjVhMiAyIDAgMCAxIDItMmgxMi4zNDQiIC8+CiAgPHBhdGggZD0ibTkgMTEgMyAzTDIyIDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/square-check-big
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
function Upload($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M12 3v12" }],
      ["path", { "d": "m17 8-5-5-5 5" }],
      ["path", { "d": "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "upload" },
      /**
       * @component @name Upload
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgM3YxMiIgLz4KICA8cGF0aCBkPSJtMTcgOC01LTUtNSA1IiAvPgogIDxwYXRoIGQ9Ik0yMSAxNXY0YTIgMiAwIDAgMS0yIDJINWEyIDIgMCAwIDEtMi0ydi00IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/upload
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
function X($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [
      ["path", { "d": "M18 6 6 18" }],
      ["path", { "d": "m6 6 12 12" }]
    ];
    Icon($$renderer2, spread_props([
      { name: "x" },
      /**
       * @component @name X
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTggNiA2IDE4IiAvPgogIDxwYXRoIGQ9Im02IDYgMTIgMTIiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/x
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
function Minus($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "M5 12h14" }]];
    Icon$1($$renderer2, spread_props([
      { name: "minus" },
      /**
       * @component @name Minus
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNNSAxMmgxNCIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/minus
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
async function copyUrlToClipboard(url) {
  try {
    const shareableUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
    await navigator.clipboard.writeText(shareableUrl);
    toast.success("URL copied to clipboard");
    return true;
  } catch {
    toast.error("Failed to copy URL");
    return false;
  }
}
function downloadFile(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
function Checkbox($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      checked = false,
      indeterminate = false,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      {
        let children = function($$renderer4, { checked: checked2, indeterminate: indeterminate2 }) {
          $$renderer4.push(`<div data-slot="checkbox-indicator" class="text-current transition-none">`);
          if (checked2) {
            $$renderer4.push("<!--[-->");
            Check($$renderer4, { class: "size-3.5" });
          } else {
            $$renderer4.push("<!--[!-->");
            if (indeterminate2) {
              $$renderer4.push("<!--[-->");
              Minus($$renderer4, { class: "size-3.5" });
            } else {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]-->`);
          }
          $$renderer4.push(`<!--]--></div>`);
        };
        Checkbox$1($$renderer3, spread_props([
          {
            "data-slot": "checkbox",
            class: cn("border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50", className)
          },
          restProps,
          {
            get ref() {
              return ref;
            },
            set ref($$value) {
              ref = $$value;
              $$settled = false;
            },
            get checked() {
              return checked;
            },
            set checked($$value) {
              checked = $$value;
              $$settled = false;
            },
            get indeterminate() {
              return indeterminate;
            },
            set indeterminate($$value) {
              indeterminate = $$value;
              $$settled = false;
            },
            children,
            $$slots: { default: true }
          }
        ]));
      }
      $$renderer3.push(`<!---->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { ref, checked, indeterminate });
  });
}
function MediaBrowser($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      selectable = false,
      multiSelect = false,
      onSelectMultiple,
      assetTypeFilter,
      pageSize = 30,
      existingAssetIds
    } = $$props;
    let assetList = [];
    let loading = false;
    let searchQuery = "";
    let sortOrder = "newest";
    let selectedAsset = null;
    let lightboxOpen = false;
    let currentPage = 1;
    let totalPages = 1;
    let totalAssets = 0;
    let showUploadModal = false;
    let uploadQueue = [];
    let editTitle = "";
    let editDescription = "";
    let editAlt = "";
    let editCreditLine = "";
    let isSaving = false;
    let selectedIds = selectable && multiSelect && existingAssetIds ? new Set(existingAssetIds) : /* @__PURE__ */ new Set();
    let isBulkDeleting = false;
    const isSelectMode = selectable && multiSelect;
    let referenceCounts = {};
    let selectedRefCount = 0;
    let searchTimeout;
    function handleSearchInput(value) {
      searchQuery = value;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(
        () => {
          currentPage = 1;
          fetchAssets();
        },
        300
      );
    }
    async function fetchAssets(page2 = currentPage) {
      loading = true;
      try {
        const offset = (page2 - 1) * pageSize;
        const result = await assets.list({
          assetType: assetTypeFilter,
          search: searchQuery || void 0,
          limit: pageSize,
          offset
        });
        if (result.success && result.data) {
          assetList = result.data;
          currentPage = page2;
          if (result.pagination) {
            totalPages = result.pagination.totalPages;
            totalAssets = result.pagination.total;
          }
          if (!(selectable && multiSelect)) {
            selectedIds = /* @__PURE__ */ new Set();
          }
          fetchReferenceCounts(result.data.map((a) => a.id));
        }
      } catch (err) {
        toast.error("Failed to fetch assets");
      } finally {
        loading = false;
      }
    }
    async function fetchReferenceCounts(assetIds) {
      if (assetIds.length === 0) return;
      try {
        const result = await assets.getReferenceCounts(assetIds);
        if (result.success && result.data) {
          referenceCounts = { ...referenceCounts, ...result.data };
        }
      } catch (err) {
        toast.error("Failed to fetch reference counts");
      }
    }
    function sortAssets(list) {
      const sorted = [...list];
      switch (sortOrder) {
        case "newest":
          return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        case "oldest":
          return sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        case "name-asc":
          return sorted.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
        case "name-desc":
          return sorted.sort((a, b) => b.originalFilename.localeCompare(a.originalFilename));
        default:
          return sorted;
      }
    }
    const pinnedAssets = (() => {
      if (!(selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0)) return [];
      return assetList.filter((a) => existingAssetIds.has(a.id));
    })();
    const sortedAssets = (() => {
      if (selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0) {
        return sortAssets(assetList.filter((a) => !existingAssetIds.has(a.id)));
      }
      return sortAssets(assetList);
    })();
    sortedAssets.length > 0 && sortedAssets.every((a) => selectedIds.has(a.id));
    function toggleSelect(id) {
      const next = new SvelteSet(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      selectedIds = next;
    }
    function confirmMultiSelect() {
      if (onSelectMultiple) {
        const selected = assetList.filter((a) => selectedIds.has(a.id));
        onSelectMultiple(selected);
        selectedIds = /* @__PURE__ */ new Set();
      }
    }
    async function bulkDelete() {
      if (selectedIds.size === 0) return;
      const idsToCheck = [...selectedIds];
      try {
        const result = await assets.getReferenceCounts(idsToCheck);
        if (result.success && result.data) {
          referenceCounts = { ...referenceCounts, ...result.data };
        }
      } catch (err) {
        toast.error("Failed to check references");
      }
      const referencedAssets = idsToCheck.filter((id) => (referenceCounts[id] || 0) > 0);
      if (referencedAssets.length > 0) {
        toast.error(`Cannot delete ${referencedAssets.length} asset${referencedAssets.length > 1 ? "s" : ""} — still referenced by documents. Remove the references first.`);
        return;
      }
      const count = selectedIds.size;
      if (!confirm(`Delete ${count} asset${count > 1 ? "s" : ""}? This cannot be undone.`)) return;
      isBulkDeleting = true;
      try {
        const result = await assets.deleteBulk([...selectedIds]);
        if (result.success) {
          if (selectedAsset && selectedIds.has(selectedAsset.id)) {
            selectedAsset = null;
          }
          selectedIds = /* @__PURE__ */ new Set();
          await fetchAssets();
        }
      } catch (err) {
        toast.error("Failed to delete assets");
      } finally {
        isBulkDeleting = false;
      }
    }
    function closeAssetDetail() {
      selectedAsset = null;
    }
    async function saveMetadata() {
      if (!selectedAsset) return;
      isSaving = true;
      try {
        const result = await assets.update(selectedAsset.id, {
          title: editTitle || void 0,
          description: editDescription || void 0,
          alt: editAlt || void 0,
          creditLine: editCreditLine || void 0
        });
        if (result.success && result.data) {
          assetList = assetList.map((a) => a.id === selectedAsset.id ? result.data : a);
          selectedAsset = result.data;
        }
      } catch (err) {
        toast.error("Failed to save metadata");
      } finally {
        isSaving = false;
      }
    }
    async function deleteAsset(asset) {
      const refCount = referenceCounts[asset.id] || 0;
      if (refCount > 0) {
        toast.error(`Cannot delete "${asset.originalFilename}" — referenced by ${refCount} document${refCount > 1 ? "s" : ""}. Remove the references first.`);
        return;
      }
      if (!confirm(`Delete "${asset.originalFilename}"? This cannot be undone.`)) return;
      try {
        const result = await assets.delete(asset.id);
        if (result.success) {
          if (selectedAsset?.id === asset.id) {
            selectedAsset = null;
          }
          await fetchAssets();
        }
      } catch (err) {
        toast.error("Failed to delete asset");
      }
    }
    let copiedUrl = false;
    async function copyAssetUrl(asset) {
      const url = getThumbnailUrl(asset);
      const success = await copyUrlToClipboard(url);
      if (success) {
        copiedUrl = true;
        setTimeout(() => copiedUrl = false, 2e3);
      }
    }
    function downloadAsset(asset) {
      downloadFile(getThumbnailUrl(asset), asset.originalFilename);
    }
    function formatSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    function formatDate(date) {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
    }
    function getThumbnailUrl(asset) {
      return asset.url || `/media/${asset.id}/${asset.filename}`;
    }
    function isImage(asset) {
      return asset.assetType === "image" || asset.mimeType.startsWith("image/");
    }
    const visiblePages = (() => {
      const pages = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (currentPage > 3) pages.push("...");
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
      }
      return pages;
    })();
    const sortLabel = "Last created: Newest first";
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="flex h-full flex-col" role="region">`);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="border-border flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4"><h2 class="text-base font-semibold sm:text-lg">Browse Assets</h2> `);
      Button($$renderer3, {
        size: "sm",
        onclick: () => {
          showUploadModal = true;
          uploadQueue = [];
        },
        children: ($$renderer4) => {
          Upload($$renderer4, { size: 16, class: "sm:mr-2" });
          $$renderer4.push(`<!----> <span class="hidden sm:inline">Upload assets</span>`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div> <div class="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2 sm:gap-3 sm:px-6 sm:py-3"><div class="relative min-w-0 flex-1 sm:w-48 sm:flex-none">`);
      Search($$renderer3, {
        size: 14,
        class: "text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
      });
      $$renderer3.push(`<!----> `);
      Input($$renderer3, {
        placeholder: "Search",
        class: "h-8 pl-8 text-sm",
        value: searchQuery,
        oninput: (e) => handleSearchInput(e.target.value)
      });
      $$renderer3.push(`<!----></div> `);
      if (totalAssets > 0) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<span class="text-muted-foreground hidden text-xs sm:inline">${escape_html((currentPage - 1) * pageSize + 1)}–${escape_html(Math.min(currentPage * pageSize, totalAssets))} of ${escape_html(totalAssets)}</span>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="hidden flex-1 sm:block"></div> <div class="hidden items-center gap-1.5 sm:flex"><span class="text-muted-foreground text-xs">Show</span> `);
      $$renderer3.select(
        {
          value: pageSize,
          onchange: (e) => {
            pageSize = parseInt(e.target.value);
            currentPage = 1;
            fetchAssets(1);
          },
          class: "border-input bg-background text-foreground h-7 rounded-md border px-1.5 text-xs"
        },
        ($$renderer4) => {
          $$renderer4.option({ value: 10 }, ($$renderer5) => {
            $$renderer5.push(`10`);
          });
          $$renderer4.option({ value: 20 }, ($$renderer5) => {
            $$renderer5.push(`20`);
          });
          $$renderer4.option({ value: 30 }, ($$renderer5) => {
            $$renderer5.push(`30`);
          });
          $$renderer4.option({ value: 50 }, ($$renderer5) => {
            $$renderer5.push(`50`);
          });
          $$renderer4.option({ value: 100 }, ($$renderer5) => {
            $$renderer5.push(`100`);
          });
        }
      );
      $$renderer3.push(`</div> <div class="bg-muted flex items-center rounded-md p-0.5"><button${attr_class(`rounded p-1.5 ${stringify("bg-background shadow")}`)} title="Grid view">`);
      Grid_3x3($$renderer3, { size: 14 });
      $$renderer3.push(`<!----></button> <button${attr_class(`rounded p-1.5 ${stringify("text-muted-foreground")}`)} title="List view">`);
      List($$renderer3, { size: 14 });
      $$renderer3.push(`<!----></button></div> `);
      if (!selectable) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<button${attr_class(`rounded p-1.5 transition-colors ${stringify(isSelectMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}`)}${attr("title", isSelectMode ? "Exit select mode" : "Select multiple")}>`);
        Square_check_big($$renderer3, { size: 14 });
        $$renderer3.push(`<!----></button>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <button class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors sm:gap-1.5">`);
      Arrow_down_up($$renderer3, { size: 14 });
      $$renderer3.push(`<!----> <span class="hidden sm:inline">${escape_html(sortLabel)}</span></button></div> <div class="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden"><div${attr_class(`min-h-0 flex-1 md:overflow-y-auto ${stringify(selectedAsset ? "hidden md:block" : "")}`)}><!--[-->`);
      {
        if (loading && assetList.length === 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="flex h-full items-center justify-center"><p class="text-muted-foreground">Loading assets...</p></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
          if (sortedAssets.length === 0) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="flex h-full flex-col items-center justify-center gap-4"><div class="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">`);
            Image($$renderer3, { class: "text-muted-foreground h-8 w-8" });
            $$renderer3.push(`<!----></div> <div class="text-center"><h3 class="mb-1 font-medium">No assets found</h3> <p class="text-muted-foreground text-sm">${escape_html(searchQuery ? "Try a different search term" : "Upload your first asset to get started")}</p></div></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
            if (selectable && multiSelect) {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<div class="bg-muted border-border flex items-center gap-3 border-b px-4 py-2"><span class="text-sm font-medium">${escape_html(selectedIds.size)} selected</span> `);
              Button($$renderer3, {
                variant: "default",
                size: "sm",
                onclick: confirmMultiSelect,
                children: ($$renderer4) => {
                  $$renderer4.push(`<!---->Done`);
                },
                $$slots: { default: true }
              });
              $$renderer3.push(`<!----></div>`);
            } else {
              $$renderer3.push("<!--[!-->");
              if (selectedIds.size > 0) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<div class="bg-muted border-border flex items-center gap-3 border-b px-4 py-2"><span class="text-sm font-medium">${escape_html(selectedIds.size)} selected</span> `);
                Button($$renderer3, {
                  variant: "destructive",
                  size: "sm",
                  onclick: bulkDelete,
                  disabled: isBulkDeleting,
                  children: ($$renderer4) => {
                    Trash_2($$renderer4, { size: 14, class: "mr-1.5" });
                    $$renderer4.push(`<!----> ${escape_html(isBulkDeleting ? "Deleting..." : "Delete")}`);
                  },
                  $$slots: { default: true }
                });
                $$renderer3.push(`<!----> <button class="text-muted-foreground hover:text-foreground text-sm transition-colors">Clear selection</button></div>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]--> `);
            {
              $$renderer3.push("<!--[-->");
              $$renderer3.push(`<div class="grid grid-cols-2 gap-0.5 p-1 sm:grid-cols-5 xl:grid-cols-10"><!--[-->`);
              const each_array = ensure_array_like(pinnedAssets);
              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                let asset = each_array[$$index];
                $$renderer3.push(`<button${attr_class(`group relative flex flex-col overflow-hidden rounded-sm transition-colors ${stringify(selectedIds.has(asset.id) ? "ring-primary ring-2" : selectedAsset?.id === asset.id ? "ring-primary ring-2" : "hover:bg-muted/50")}`)}><div class="bg-muted/30 relative aspect-square overflow-hidden">`);
                if (isImage(asset)) {
                  $$renderer3.push("<!--[-->");
                  $$renderer3.push(`<img${attr("src", getThumbnailUrl(asset))}${attr("alt", asset.alt || asset.originalFilename)} class="h-full w-full object-contain" loading="lazy"/>`);
                } else {
                  $$renderer3.push("<!--[!-->");
                  $$renderer3.push(`<div class="flex h-full items-center justify-center">`);
                  File_text($$renderer3, { class: "text-muted-foreground h-10 w-10" });
                  $$renderer3.push(`<!----></div>`);
                }
                $$renderer3.push(`<!--]--> <div class="absolute top-1.5 left-1.5">`);
                Checkbox($$renderer3, {
                  checked: selectedIds.has(asset.id),
                  onCheckedChange: () => toggleSelect(asset.id),
                  onclick: (e) => e.stopPropagation()
                });
                $$renderer3.push(`<!----></div></div> <div class="p-1.5"><p class="text-muted-foreground truncate text-xs">${escape_html(asset.originalFilename)}</p></div></button>`);
              }
              $$renderer3.push(`<!--]--> <!--[-->`);
              const each_array_1 = ensure_array_like(sortedAssets);
              for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
                let asset = each_array_1[$$index_1];
                $$renderer3.push(`<button${attr_class(`group relative flex flex-col overflow-hidden rounded-sm transition-colors ${stringify(selectedIds.has(asset.id) ? "ring-primary ring-2" : selectedAsset?.id === asset.id ? "ring-primary ring-2" : "hover:bg-muted/50")}`)}><div class="bg-muted/30 relative aspect-square overflow-hidden">`);
                if (isImage(asset)) {
                  $$renderer3.push("<!--[-->");
                  $$renderer3.push(`<img${attr("src", getThumbnailUrl(asset))}${attr("alt", asset.alt || asset.originalFilename)} class="h-full w-full object-contain" loading="lazy"/>`);
                } else {
                  $$renderer3.push("<!--[!-->");
                  $$renderer3.push(`<div class="flex h-full items-center justify-center">`);
                  File_text($$renderer3, { class: "text-muted-foreground h-10 w-10" });
                  $$renderer3.push(`<!----></div>`);
                }
                $$renderer3.push(`<!--]--> `);
                if (isSelectMode) {
                  $$renderer3.push("<!--[-->");
                  $$renderer3.push(`<div class="absolute top-1.5 left-1.5">`);
                  Checkbox($$renderer3, {
                    checked: selectedIds.has(asset.id),
                    onCheckedChange: () => toggleSelect(asset.id),
                    onclick: (e) => e.stopPropagation()
                  });
                  $$renderer3.push(`<!----></div>`);
                } else {
                  $$renderer3.push("<!--[!-->");
                }
                $$renderer3.push(`<!--]--></div> <div class="p-1.5"><p class="text-muted-foreground truncate text-xs">${escape_html(asset.originalFilename)}</p></div></button>`);
              }
              $$renderer3.push(`<!--]--></div> `);
              if (totalPages > 1) {
                $$renderer3.push("<!--[-->");
                $$renderer3.push(`<div class="border-border flex items-center justify-center gap-1 border-t px-4 py-3"><button${attr("disabled", currentPage <= 1 || loading, true)} class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30">`);
                Chevron_left($$renderer3, { size: 16 });
                $$renderer3.push(`<!----></button> <!--[-->`);
                const each_array_2 = ensure_array_like(visiblePages);
                for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
                  let pg = each_array_2[$$index_2];
                  if (pg === "...") {
                    $$renderer3.push("<!--[-->");
                    $$renderer3.push(`<span class="text-muted-foreground px-1.5 text-sm">...</span>`);
                  } else {
                    $$renderer3.push("<!--[!-->");
                    $$renderer3.push(`<button${attr("disabled", loading, true)}${attr_class(`min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors ${stringify(pg === currentPage ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}`)}>${escape_html(pg)}</button>`);
                  }
                  $$renderer3.push(`<!--]-->`);
                }
                $$renderer3.push(`<!--]--> <button${attr("disabled", currentPage >= totalPages || loading, true)} class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30">`);
                Chevron_right($$renderer3, { size: 16 });
                $$renderer3.push(`<!----></button></div>`);
              } else {
                $$renderer3.push("<!--[!-->");
              }
              $$renderer3.push(`<!--]-->`);
            }
            $$renderer3.push(`<!--]-->`);
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      }
      $$renderer3.push(`<!--]--></div> `);
      if (selectedAsset) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="bg-background border-border flex flex-col border-t md:w-[350px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l"><div class="border-border flex items-center justify-between border-b px-4 py-3"><button class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors md:hidden">`);
        Chevron_left($$renderer3, { size: 16 });
        $$renderer3.push(`<!----> Back</button> <p class="min-w-0 flex-1 truncate pl-2 text-sm font-medium md:pl-0"${attr("title", selectedAsset.originalFilename)}>${escape_html(selectedAsset.originalFilename)}</p> <div class="flex items-center gap-1">`);
        if (!selectable) {
          $$renderer3.push("<!--[-->");
          Button($$renderer3, {
            variant: "ghost",
            size: "sm",
            class: "h-7 w-7 p-0",
            onclick: () => deleteAsset(selectedAsset),
            title: "Delete asset",
            children: ($$renderer4) => {
              Trash_2($$renderer4, { size: 14, class: "text-destructive" });
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> `);
        Button($$renderer3, {
          variant: "ghost",
          size: "sm",
          class: "hidden h-7 w-7 p-0 md:flex",
          onclick: closeAssetDetail,
          title: "Close",
          children: ($$renderer4) => {
            X($$renderer4, { size: 14 });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----></div></div> <div class="p-4 pb-0">`);
        if (isImage(selectedAsset)) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<button class="bg-muted/30 mb-3 w-full cursor-zoom-in overflow-hidden rounded-lg" title="Click to enlarge"><img${attr("src", getThumbnailUrl(selectedAsset))}${attr("alt", selectedAsset.alt || selectedAsset.originalFilename)} class="w-full object-contain" style="max-height: 200px;"/></button>`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="bg-muted/30 mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg">`);
          File_text($$renderer3, { class: "text-muted-foreground h-12 w-12" });
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]--></div> <div class="border-border flex border-b"><button${attr_class(`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${stringify(
          "border-foreground text-foreground border-b-2"
        )}`)}>Details</button> <button${attr_class(`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${stringify("text-muted-foreground hover:text-foreground")}`)}>References (${escape_html(selectedRefCount)})</button></div> <div class="flex-1 overflow-y-auto p-4">`);
        {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="mb-4 space-y-2 text-sm"><div class="flex justify-between"><span class="text-muted-foreground">Filename</span> <span class="max-w-[180px] truncate font-medium"${attr("title", selectedAsset.originalFilename)}>${escape_html(selectedAsset.originalFilename)}</span></div> <div class="flex justify-between"><span class="text-muted-foreground">Type</span> <span>${escape_html(selectedAsset.mimeType)}</span></div> <div class="flex justify-between"><span class="text-muted-foreground">Size</span> <span>${escape_html(formatSize(selectedAsset.size))}</span></div> `);
          if (selectedAsset.width && selectedAsset.height) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<div class="flex justify-between"><span class="text-muted-foreground">Dimensions</span> <span>${escape_html(selectedAsset.width)} x ${escape_html(selectedAsset.height)}</span></div>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--> <div class="flex justify-between"><span class="text-muted-foreground">Uploaded</span> <span>${escape_html(formatDate(selectedAsset.createdAt))}</span></div></div> <div class="mb-4 flex gap-2">`);
          Button($$renderer3, {
            variant: "outline",
            size: "sm",
            class: "flex-1",
            onclick: () => downloadAsset(selectedAsset),
            children: ($$renderer4) => {
              Download($$renderer4, { size: 14, class: "mr-1.5" });
              $$renderer4.push(`<!----> Download`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Button($$renderer3, {
            variant: "outline",
            size: "sm",
            class: "flex-1",
            onclick: () => copyAssetUrl(selectedAsset),
            children: ($$renderer4) => {
              Link($$renderer4, { size: 14, class: "mr-1.5" });
              $$renderer4.push(`<!----> ${escape_html(copiedUrl ? "Copied!" : "Copy URL")}`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></div> `);
          Separator($$renderer3, { class: "my-4" });
          $$renderer3.push(`<!----> <div class="space-y-3"><div>`);
          Label($$renderer3, {
            for: "asset-title",
            class: "text-xs",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Title`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Input($$renderer3, {
            id: "asset-title",
            class: "mt-1 h-8 text-sm",
            placeholder: "Asset title",
            get value() {
              return editTitle;
            },
            set value($$value) {
              editTitle = $$value;
              $$settled = false;
            }
          });
          $$renderer3.push(`<!----></div> <div>`);
          Label($$renderer3, {
            for: "asset-description",
            class: "text-xs",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Description`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> <textarea id="asset-description" class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none" rows="2" placeholder="Description">`);
          const $$body = escape_html(editDescription);
          if ($$body) {
            $$renderer3.push(`${$$body}`);
          }
          $$renderer3.push(`</textarea></div> <div>`);
          Label($$renderer3, {
            for: "asset-alt",
            class: "text-xs",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Alt text`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Input($$renderer3, {
            id: "asset-alt",
            class: "mt-1 h-8 text-sm",
            placeholder: "Alternative text",
            get value() {
              return editAlt;
            },
            set value($$value) {
              editAlt = $$value;
              $$settled = false;
            }
          });
          $$renderer3.push(`<!----></div> <div>`);
          Label($$renderer3, {
            for: "asset-credit",
            class: "text-xs",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Credit line`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Input($$renderer3, {
            id: "asset-credit",
            class: "mt-1 h-8 text-sm",
            placeholder: "Credit / attribution",
            get value() {
              return editCreditLine;
            },
            set value($$value) {
              editCreditLine = $$value;
              $$settled = false;
            }
          });
          $$renderer3.push(`<!----></div> `);
          Button($$renderer3, {
            onclick: saveMetadata,
            disabled: isSaving,
            size: "sm",
            class: "w-full",
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(isSaving ? "Saving..." : "Save changes")}`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]--></div></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div></div> `);
      if (selectedAsset && isImage(selectedAsset)) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<!---->`);
        Root($$renderer3, {
          get open() {
            return lightboxOpen;
          },
          set open($$value) {
            lightboxOpen = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Dialog_content($$renderer4, {
              showCloseButton: false,
              class: "flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden p-0 sm:max-w-[90vw]",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->`);
                Dialog_header($$renderer5, {
                  class: "border-border border-b px-4 py-3",
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->`);
                    Dialog_title($$renderer6, {
                      class: "truncate text-sm font-medium",
                      children: ($$renderer7) => {
                        $$renderer7.push(`<!---->${escape_html(selectedAsset.originalFilename)}`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer6.push(`<!---->`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----> <div class="flex flex-1 items-center justify-center overflow-hidden p-4"><img${attr("src", getThumbnailUrl(selectedAsset))}${attr("alt", selectedAsset.alt || selectedAsset.originalFilename)} class="max-h-[70vh] max-w-full object-contain"/></div> <div class="border-border flex items-center justify-between border-t px-4 py-3"><div class="flex items-center gap-2">`);
                Button($$renderer5, {
                  variant: "outline",
                  size: "sm",
                  onclick: () => downloadAsset(selectedAsset),
                  children: ($$renderer6) => {
                    Download($$renderer6, { size: 14, class: "mr-1.5" });
                    $$renderer6.push(`<!----> Download`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----> `);
                Button($$renderer5, {
                  variant: "outline",
                  size: "sm",
                  onclick: () => copyAssetUrl(selectedAsset),
                  children: ($$renderer6) => {
                    Link($$renderer6, { size: 14, class: "mr-1.5" });
                    $$renderer6.push(`<!----> ${escape_html(copiedUrl ? "Copied!" : "Copy URL")}`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----></div> `);
                Button($$renderer5, {
                  variant: "outline",
                  size: "sm",
                  onclick: () => lightboxOpen = false,
                  children: ($$renderer6) => {
                    $$renderer6.push(`<!---->Close`);
                  },
                  $$slots: { default: true }
                });
                $$renderer5.push(`<!----></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <!---->`);
      Root($$renderer3, {
        onOpenChange: (v) => {
          if (!v && true) {
            showUploadModal = false;
          }
        },
        get open() {
          return showUploadModal;
        },
        set open($$value) {
          showUploadModal = $$value;
          $$settled = false;
        },
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Dialog_content($$renderer4, {
            class: "max-w-lg",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->`);
              Dialog_header($$renderer5, {
                children: ($$renderer6) => {
                  $$renderer6.push(`<!---->`);
                  Dialog_title($$renderer6, {
                    children: ($$renderer7) => {
                      $$renderer7.push(`<!---->Upload Assets`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer6.push(`<!---->`);
                },
                $$slots: { default: true }
              });
              $$renderer5.push(`<!----> <div${attr_class(`border-border mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors ${stringify("hover:bg-muted/50")}`)} role="button" tabindex="0">`);
              File_image($$renderer5, { size: 32, class: "text-muted-foreground mb-3" });
              $$renderer5.push(`<!----> <p class="text-sm font-medium">${escape_html("Drag and drop files here")}</p> <p class="text-muted-foreground mt-1 text-xs">or click to browse</p></div> <input type="file" multiple accept="image/*,.pdf,.txt" class="hidden"/> `);
              if (uploadQueue.length > 0) {
                $$renderer5.push("<!--[-->");
                $$renderer5.push(`<div class="mt-4 max-h-48 space-y-2 overflow-y-auto"><!--[-->`);
                const each_array_6 = ensure_array_like(uploadQueue);
                for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
                  let item = each_array_6[$$index_6];
                  $$renderer5.push(`<div class="border-border flex items-center gap-3 rounded-md border px-3 py-2"><div class="min-w-0 flex-1"><p class="truncate text-sm">${escape_html(item.file.name)}</p> <p class="text-muted-foreground text-xs">${escape_html(formatSize(item.file.size))}</p></div> `);
                  if (item.status === "uploading") {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<div class="border-primary h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent"></div>`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    if (item.status === "done") {
                      $$renderer5.push("<!--[-->");
                      Circle_check($$renderer5, { size: 16, class: "shrink-0 text-green-500" });
                    } else {
                      $$renderer5.push("<!--[!-->");
                      if (item.status === "failed") {
                        $$renderer5.push("<!--[-->");
                        Circle_alert($$renderer5, { size: 16, class: "text-destructive shrink-0" });
                      } else {
                        $$renderer5.push("<!--[!-->");
                        $$renderer5.push(`<div class="bg-muted h-4 w-4 shrink-0 rounded-full"></div>`);
                      }
                      $$renderer5.push(`<!--]-->`);
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                  $$renderer5.push(`<!--]--></div>`);
                }
                $$renderer5.push(`<!--]--></div>`);
              } else {
                $$renderer5.push("<!--[!-->");
              }
              $$renderer5.push(`<!--]-->`);
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
function pluralize(word) {
  if (!word) return word;
  if (/[sxz]$/i.test(word) || /[sc]h$/i.test(word)) {
    return word + "es";
  }
  if (/[^aeiou]y$/i.test(word)) {
    return word.slice(0, -1) + "ies";
  }
  return word + "s";
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
    let now = Date.now();
    function timeAgo(date) {
      const seconds = Math.floor((now - date.getTime()) / 1e3);
      if (seconds < 5) return "just now";
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
    }
    const savedAgoText = lastSaved ? `Saved ${timeAgo(lastSaved)}` : null;
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
          cmsLogger.debug("[Document Editor]", "✅ Document published successfully");
          cmsLogger.debug("[Document Editor]", "📄 New published hash:", response.data.publishedHash);
          if (onPublished && documentId) {
            onPublished(documentId);
          }
        } else {
          throw new Error(response.error || "Failed to publish document");
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to publish document");
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
          cmsLogger.debug("[Document Editor]", "✅ Document deleted successfully");
          onDeleted?.();
        } else {
          throw new Error(response.error || "Failed to delete document");
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to delete document");
        saveError = err instanceof ApiError ? err.message : "Failed to delete document";
      } finally {
        saving = false;
      }
    }
    $$renderer2.push(`<div class="relative flex h-full flex-col overflow-hidden"><div class="border-border bg-background flex h-14 items-center justify-between border-b px-4"><div class="flex items-center gap-3 overflow-hidden"><div class="min-w-0 flex-1"><h3 class="truncate text-sm font-medium">${escape_html(getPreviewTitle())}</h3> <div class="flex items-center gap-2">`);
    if (saving) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="text-muted-foreground text-xs">Saving...</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (savedAgoText) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span class="text-muted-foreground text-xs">${escape_html(savedAgoText)}</span>`);
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
      if (publishSuccess && now - publishSuccess.getTime() < 3e3) {
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
        if (publishSuccess && now - publishSuccess.getTime() < 3e3) {
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
            if (savedAgoText) {
              $$renderer2.push("<!--[-->");
              Badge($$renderer2, {
                variant: "secondary",
                children: ($$renderer3) => {
                  $$renderer3.push(`<!---->${escape_html(savedAgoText)}`);
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
          $$renderer2.push(`<div class="bg-background border-border absolute right-0 bottom-full z-50 mb-2 min-w-[140px] rounded-md border py-1 shadow-lg">`);
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
function Tabs($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      value = "",
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Tabs$1($$renderer3, spread_props([
        {
          "data-slot": "tabs",
          class: cn("flex flex-col gap-2", className)
        },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get value() {
            return value;
          },
          set value($$value) {
            value = $$value;
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
    bind_props($$props, { ref, value });
  });
}
function Tabs_content($$renderer, $$props) {
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
      Tabs_content$1($$renderer3, spread_props([
        {
          "data-slot": "tabs-content",
          class: cn("flex-1 outline-none", className)
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
    page.url.searchParams.get("orgId");
    const documentTypes = documentTypesFromServer.map((docType) => {
      const schema = schemas.find((s) => s.name === docType.name);
      return { ...docType, icon: schema?.icon };
    });
    const hasDocumentTypes = documentTypes.length > 0;
    let selectedDocumentType = null;
    let windowWidth = 1024;
    let currentSortName = "updatedAtDesc";
    const availableOrderings = /* @__PURE__ */ (() => {
      return [];
    })();
    const currentOrdering = (() => {
      let ordering = availableOrderings.find((o) => o.name === currentSortName);
      if (!ordering && currentSortName) {
        const isAsc = currentSortName.endsWith("Asc");
        const baseName = currentSortName.replace("Desc", "").replace("Asc", "");
        const descVersion = availableOrderings.find((o) => o.name === `${baseName}Desc`);
        if (descVersion && isAsc) {
          ordering = {
            ...descVersion,
            name: currentSortName,
            by: descVersion.by.map((rule) => ({ ...rule, direction: "asc" }))
          };
        }
      }
      return ordering || availableOrderings[0];
    })();
    (() => {
      if (!currentOrdering) return void 0;
      const sortFields = currentOrdering.by.map((rule) => rule.direction === "desc" ? `-${rule.field}` : rule.field);
      return sortFields.length === 1 ? sortFields[0] : sortFields;
    })();
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
      cmsLogger.debug("Layout Calc", `${(end - start).toFixed(3)}ms | Editors: ${totalEditors} | Expanded: ${expandedCount} | Window: ${windowWidth}px | Active: ${validActiveIndex} | ExpandedIndices: [${expandedIndices.join(", ")}]`);
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
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      head("1dxny9e", $$renderer3, ($$renderer4) => {
        $$renderer4.title(($$renderer5) => {
          $$renderer5.push(`<title>${escape_html(activeTab.value === "structure" ? "Content" : activeTab.value === "media" ? "Media" : "Vision")} - ${escape_html(title)}</title>`);
        });
      });
      $$renderer3.push(`<div class="flex h-full flex-col overflow-hidden">`);
      {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <div class="flex-1 overflow-hidden"><!---->`);
      Tabs($$renderer3, {
        value: activeTab.value,
        onValueChange: handleTabChange,
        class: "h-full",
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Tabs_content($$renderer4, {
            value: "structure",
            class: "h-full overflow-hidden",
            children: ($$renderer5) => {
              $$renderer5.push(`<!---->`);
              {
                $$renderer5.push(`<div${attr_class(clsx("flex h-full w-full overflow-hidden"))}>`);
                if (schemaError) {
                  $$renderer5.push("<!--[-->");
                  $$renderer5.push(`<div class="bg-destructive/5 flex flex-1 items-center justify-center p-8"><div class="w-full max-w-2xl">`);
                  Alert($$renderer5, {
                    variant: "destructive",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.704-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"></path></svg>`);
                      Alert_title($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Schema Validation Error`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                      Alert_description($$renderer6, {
                        class: "whitespace-pre-line",
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(schemaError.message)}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----></div></div>`);
                } else {
                  $$renderer5.push("<!--[!-->");
                  $$renderer5.push(`<div${attr_class(`border-r transition-all duration-200 ${stringify(typesPanel)} ${stringify(typesPanel === "hidden" ? "hidden" : "block")} h-full overflow-hidden`)}>`);
                  if (typesPanel === "w-[60px]") {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<button class="hover:bg-muted/30 flex h-full w-full flex-col transition-colors" title="Click to expand content types"><div class="flex flex-1 items-start justify-center p-2 pt-8 text-left"><div class="text-foreground rotate-90 transform text-sm font-medium whitespace-nowrap">Content</div></div></button>`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                    $$renderer5.push(`<div class="h-full overflow-y-auto p-3">`);
                    if (hasDocumentTypes) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<h2 class="text-muted-foreground mb-2 hidden px-2 text-sm font-medium sm:block">Content</h2> <!--[-->`);
                      const each_array = ensure_array_like(documentTypes);
                      for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                        let docType = each_array[index];
                        $$renderer5.push(`<button${attr_class(`hover:bg-muted/50 group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2.5 text-left transition-colors ${stringify(selectedDocumentType === docType.name ? "bg-muted/50" : "")}`)}${attr("title", docType.description || "")}><div class="flex items-center gap-2"><div class="text-muted-foreground flex h-5 w-5 items-center justify-center">`);
                        if (docType.icon) {
                          $$renderer5.push("<!--[-->");
                          const Icon2 = docType.icon;
                          $$renderer5.push(`<!---->`);
                          Icon2($$renderer5, { class: "h-4 w-4" });
                          $$renderer5.push(`<!---->`);
                        } else {
                          $$renderer5.push("<!--[!-->");
                          File_text($$renderer5, { class: "h-4 w-4" });
                        }
                        $$renderer5.push(`<!--]--></div> <span class="text-sm">${escape_html(pluralize(docType.title))}</span></div> <svg class="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>`);
                      }
                      $$renderer5.push(`<!--]-->`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                      $$renderer5.push(`<div class="p-6 text-center"><div class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">`);
                      File_text($$renderer5, { class: "text-muted-foreground h-8 w-8" });
                      $$renderer5.push(`<!----></div> <h3 class="mb-2 font-medium">No content types found</h3> <p class="text-muted-foreground mb-4 text-sm">Get started by defining your first schema type</p> <p class="text-muted-foreground text-xs">Add schemas in <code class="bg-muted rounded px-1.5 py-0.5 text-xs">src/lib/schemaTypes/</code></p></div>`);
                    }
                    $$renderer5.push(`<!--]--></div>`);
                  }
                  $$renderer5.push(`<!--]--></div> `);
                  {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]--> `);
                  {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]--> <!--[-->`);
                  const each_array_4 = ensure_array_like(editorStack);
                  for (let index = 0, $$length = each_array_4.length; index < $$length; index++) {
                    let stackedEditor = each_array_4[index];
                    const editorIndex = index + 1;
                    const isExpanded = layoutConfig.expandedIndices.includes(editorIndex);
                    if (isExpanded) {
                      $$renderer5.push("<!--[-->");
                      $$renderer5.push(`<div class="h-full flex-1 overflow-y-auto border-l transition-all duration-200" style="min-width: 0;">`);
                      DocumentEditor($$renderer5, {
                        schemas,
                        documentType: stackedEditor.documentType,
                        documentId: stackedEditor.documentId,
                        isCreating: stackedEditor.isCreating,
                        onBack: () => handleCloseStackedEditor(index),
                        onPublished: async (_) => {
                        },
                        onDeleted: async () => {
                          handleCloseStackedEditor(index);
                        },
                        isReadOnly
                      });
                      $$renderer5.push(`<!----></div>`);
                    } else {
                      $$renderer5.push("<!--[!-->");
                      $$renderer5.push(`<button class="hover:bg-muted/50 flex h-full w-[60px] flex-col border-l transition-colors"${attr("title", `Click to expand ${stringify(stackedEditor.documentType)}`)}><div class="-mt-2 flex h-full flex-1 items-start justify-center p-2 pt-8 text-left"><div class="text-foreground rotate-90 transform text-sm font-medium whitespace-nowrap">${escape_html(stackedEditor.documentType.charAt(0).toUpperCase() + stackedEditor.documentType.slice(1))}</div></div></button>`);
                    }
                    $$renderer5.push(`<!--]-->`);
                  }
                  $$renderer5.push(`<!--]-->`);
                }
                $$renderer5.push(`<!--]--></div>`);
              }
              $$renderer5.push(`<!---->`);
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!----> `);
          if (graphqlSettings?.enableGraphiQL) {
            $$renderer4.push("<!--[-->");
            $$renderer4.push(`<!---->`);
            Tabs_content($$renderer4, {
              value: "vision",
              class: "m-0 h-full p-0",
              children: ($$renderer5) => {
                $$renderer5.push(`<div class="bg-muted/10 flex h-full items-center justify-center"><div class="space-y-4 text-center"><div class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"><svg class="text-primary h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg></div> <div><h3 class="mb-2 text-lg font-semibold">GraphQL Playground</h3> <p class="text-muted-foreground mb-4">Query your CMS data with the GraphQL API</p> <a${attr("href", graphqlSettings.endpoint)} target="_blank" class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors">Open Playground <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg></a></div></div></div>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          } else {
            $$renderer4.push("<!--[!-->");
          }
          $$renderer4.push(`<!--]--> <!---->`);
          Tabs_content($$renderer4, {
            value: "media",
            class: "m-0 h-full p-0",
            children: ($$renderer5) => {
              MediaBrowser($$renderer5, { active: activeTab.value === "media" });
            },
            $$slots: { default: true }
          });
          $$renderer4.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div>`);
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
    function handleTabChange(value) {
      if (activeTabState) activeTabState.value = value;
    }
    AdminApp($$renderer2, {
      schemas: schemaTypes,
      documentTypes: data.documentTypes,
      schemaError: data.schemaError,
      graphqlSettings: data.graphqlSettings,
      isReadOnly: data.isReadOnly,
      userPreferences: data.userPreferences,
      activeTab: activeTabState,
      handleTabChange,
      title: "Aphex CMS"
    });
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-yG2AZu2z.js.map
