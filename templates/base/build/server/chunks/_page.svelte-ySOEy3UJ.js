import { h as head, Q as bind_props, F as spread_props, O as ensure_array_like, W as props_id, K as attributes, z as sanitize_props, G as slot, N as clsx, X as derived } from './index2-PlYtOn9l.js';
import { C as Card, I as Input } from './card-B04Jp-nH.js';
import { T as Tabs, a as Tabs_content, b as TabsListState, c as TabsTriggerState } from './tabs-content-NbN11zT3.js';
import { c as cn, B as Button } from './button-BaYTBSEJ.js';
import { p as styleToString, c as createBitsAttrs, a as createId, b as boxWith, m as mergeProps, v as boolToTrueOrUndef, d as attachRef, f as boolToEmptyStrOrUndef, g as getDataOpenClosed, h as boolToStr, e as boolToStrTrueOrUndef } from './create-id-mXGs1H6b.js';
import { e as escape_html } from './context-DL4CYGHS.js';
import { L as Label } from './label-Dq64pFyR.js';
import { i as invalidateAll } from './client-DH_42K1x.js';
import { D as Dialog, a as DOMTypeahead, n as next, p as prev, f as forward, b as backward, g as getNextMatch } from './dialog-DAKr7YEk.js';
import { b as Portal$1, _ as DialogTriggerState, x as Dialog_overlay$1, n as noop, w as watch, C as Context, a as afterTick, D as DOMContext, O as OpenChangeComplete, e as ARROW_UP, A as ARROW_DOWN, E as ENTER, S as SPACE, T as TAB, d as PAGE_UP, H as HOME, f as PAGE_DOWN, g as END, X as afterSleep, $ as Previous, a0 as isIOS } from './dialog-overlay-LaS6gPE6.js';
import { B as Badge, v as organizations, D as Dialog_content$1, z as Dialog_close, X, F as Floating_layer, o as Floating_layer_anchor, I as Icon$1, p as Popper_layer_force_mount, q as Popper_layer, r as getFloatingContentCSSVars, w as boxAutoReset } from './states.svelte-CFLau3Qg.js';
import { N as on } from './events-DlbR6UiW.js';
import { D as Dialog_title$1, a as Dialog_description$1 } from './dialog-description-Co-21MEj.js';
import { I as Icon } from './Icon-DHGqHCBy.js';
import './state.svelte-BCegLL_9.js';
import './exports-Honk4keX.js';
import './index-BKwQgGLQ.js';

const srOnlyStyles = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  borderWidth: "0",
  transform: "translateX(-100%)"
};
const srOnlyStylesString = styleToString(srOnlyStyles);
function Dialog_trigger$1($$renderer, $$props) {
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
    const triggerState = DialogTriggerState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      disabled: boxWith(() => Boolean(disabled))
    });
    const mergedProps = mergeProps(restProps, triggerState.props);
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
function Hidden_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = void 0, $$slots, $$events, ...restProps } = $$props;
    const mergedProps = mergeProps(restProps, {
      "aria-hidden": "true",
      tabindex: -1,
      style: srOnlyStylesString
    });
    if (mergedProps.type === "checkbox") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<input${attributes({ ...mergedProps, value }, void 0, void 0, void 0, 4)}/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<input${attributes({ value, ...mergedProps }, void 0, void 0, void 0, 4)}/>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { value });
  });
}
class DataTypeahead {
  #opts;
  #candidateValues = derived(() => this.#opts.candidateValues());
  #search;
  constructor(opts) {
    this.#opts = opts;
    this.#search = boxAutoReset("", { afterMs: 1e3, getWindow: this.#opts.getWindow });
    this.handleTypeaheadSearch = this.handleTypeaheadSearch.bind(this);
    this.resetTypeahead = this.resetTypeahead.bind(this);
  }
  handleTypeaheadSearch(key) {
    if (!this.#opts.enabled() || !this.#candidateValues().length) return;
    this.#search.current = this.#search.current + key;
    const currentItem = this.#opts.getCurrentItem();
    const currentMatch = this.#candidateValues().find((item) => item === currentItem) ?? "";
    const values = this.#candidateValues().map((item) => item ?? "");
    const nextMatch = getNextMatch(values, this.#search.current, currentMatch);
    const newItem = this.#candidateValues().find((item) => item === nextMatch);
    if (newItem) {
      this.#opts.onMatch(newItem);
    }
    return newItem;
  }
  resetTypeahead() {
    this.#search.current = "";
  }
}
const FIRST_KEYS = [ARROW_DOWN, PAGE_UP, HOME];
const LAST_KEYS = [ARROW_UP, PAGE_DOWN, END];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
const selectAttrs = createBitsAttrs({
  component: "select",
  parts: [
    "trigger",
    "content",
    "item",
    "viewport",
    "scroll-up-button",
    "scroll-down-button",
    "group",
    "group-label",
    "separator",
    "arrow",
    "input",
    "content-wrapper",
    "item-text",
    "value"
  ]
});
const SelectRootContext = new Context("Select.Root | Combobox.Root");
const SelectGroupContext = new Context("Select.Group | Combobox.Group");
const SelectContentContext = new Context("Select.Content | Combobox.Content");
class SelectBaseRootState {
  opts;
  touchedInput = false;
  inputNode = null;
  contentNode = null;
  triggerNode = null;
  valueId = "";
  highlightedNode = null;
  #highlightedValue = derived(() => {
    if (!this.highlightedNode) return null;
    return this.highlightedNode.getAttribute("data-value");
  });
  get highlightedValue() {
    return this.#highlightedValue();
  }
  set highlightedValue($$value) {
    return this.#highlightedValue($$value);
  }
  #highlightedId = derived(() => {
    if (!this.highlightedNode) return void 0;
    return this.highlightedNode.id;
  });
  get highlightedId() {
    return this.#highlightedId();
  }
  set highlightedId($$value) {
    return this.#highlightedId($$value);
  }
  #highlightedLabel = derived(() => {
    if (!this.highlightedNode) return null;
    return this.highlightedNode.getAttribute("data-label");
  });
  get highlightedLabel() {
    return this.#highlightedLabel();
  }
  set highlightedLabel($$value) {
    return this.#highlightedLabel($$value);
  }
  isUsingKeyboard = false;
  isCombobox = false;
  domContext = new DOMContext(() => null);
  constructor(opts) {
    this.opts = opts;
    this.isCombobox = opts.isCombobox;
    new OpenChangeComplete({
      ref: boxWith(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
  }
  setHighlightedNode(node, initial = false) {
    this.highlightedNode = node;
    if (node && (this.isUsingKeyboard || initial)) {
      node.scrollIntoView({ block: this.opts.scrollAlignment.current });
    }
  }
  getCandidateNodes() {
    const node = this.contentNode;
    if (!node) return [];
    return Array.from(node.querySelectorAll(`[${this.getBitsAttr("item")}]:not([data-disabled])`));
  }
  setHighlightedToFirstCandidate() {
    this.setHighlightedNode(null);
    const candidateNodes = this.getCandidateNodes();
    if (!candidateNodes.length) return;
    this.setHighlightedNode(candidateNodes[0]);
  }
  getNodeByValue(value) {
    const candidateNodes = this.getCandidateNodes();
    return candidateNodes.find((node) => node.dataset.value === value) ?? null;
  }
  setOpen(open) {
    this.opts.open.current = open;
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  handleOpen() {
    this.setOpen(true);
  }
  handleClose() {
    this.setHighlightedNode(null);
    this.setOpen(false);
  }
  toggleMenu() {
    this.toggleOpen();
  }
  getBitsAttr = (part) => {
    return selectAttrs.getAttr(part, this.isCombobox ? "combobox" : void 0);
  };
}
class SelectSingleRootState extends SelectBaseRootState {
  opts;
  isMulti = false;
  #hasValue = derived(() => this.opts.value.current !== "");
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  #currentLabel = derived(() => {
    if (!this.opts.items.current.length) return "";
    const match = this.opts.items.current.find((item) => item.value === this.opts.value.current)?.label;
    return match ?? "";
  });
  get currentLabel() {
    return this.#currentLabel();
  }
  set currentLabel($$value) {
    return this.#currentLabel($$value);
  }
  #candidateLabels = derived(() => {
    if (!this.opts.items.current.length) return [];
    const filteredItems = this.opts.items.current.filter((item) => !item.disabled);
    return filteredItems.map((item) => item.label);
  });
  get candidateLabels() {
    return this.#candidateLabels();
  }
  set candidateLabels($$value) {
    return this.#candidateLabels($$value);
  }
  #dataTypeaheadEnabled = derived(() => {
    if (this.isMulti) return false;
    if (this.opts.items.current.length === 0) return false;
    return true;
  });
  get dataTypeaheadEnabled() {
    return this.#dataTypeaheadEnabled();
  }
  set dataTypeaheadEnabled($$value) {
    return this.#dataTypeaheadEnabled($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
    watch(() => this.opts.open.current, () => {
      if (!this.opts.open.current) return;
      this.setInitialHighlightedNode();
    });
  }
  includesItem(itemValue) {
    return this.opts.value.current === itemValue;
  }
  toggleItem(itemValue, itemLabel = itemValue) {
    this.opts.value.current = this.includesItem(itemValue) ? "" : itemValue;
    this.opts.inputValue.current = itemLabel;
  }
  setInitialHighlightedNode() {
    afterTick(() => {
      if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
      if (this.opts.value.current !== "") {
        const node = this.getNodeByValue(this.opts.value.current);
        if (node) {
          this.setHighlightedNode(node, true);
          return;
        }
      }
      const firstCandidate = this.getCandidateNodes()[0];
      if (!firstCandidate) return;
      this.setHighlightedNode(firstCandidate, true);
    });
  }
}
class SelectMultipleRootState extends SelectBaseRootState {
  opts;
  isMulti = true;
  #hasValue = derived(() => this.opts.value.current.length > 0);
  get hasValue() {
    return this.#hasValue();
  }
  set hasValue($$value) {
    return this.#hasValue($$value);
  }
  constructor(opts) {
    super(opts);
    this.opts = opts;
    watch(() => this.opts.open.current, () => {
      if (!this.opts.open.current) return;
      this.setInitialHighlightedNode();
    });
  }
  includesItem(itemValue) {
    return this.opts.value.current.includes(itemValue);
  }
  toggleItem(itemValue, itemLabel = itemValue) {
    if (this.includesItem(itemValue)) {
      this.opts.value.current = this.opts.value.current.filter((v) => v !== itemValue);
    } else {
      this.opts.value.current = [...this.opts.value.current, itemValue];
    }
    this.opts.inputValue.current = itemLabel;
  }
  setInitialHighlightedNode() {
    afterTick(() => {
      if (!this.domContext) return;
      if (this.highlightedNode && this.domContext.getDocument().contains(this.highlightedNode)) return;
      if (this.opts.value.current.length && this.opts.value.current[0] !== "") {
        const node = this.getNodeByValue(this.opts.value.current[0]);
        if (node) {
          this.setHighlightedNode(node, true);
          return;
        }
      }
      const firstCandidate = this.getCandidateNodes()[0];
      if (!firstCandidate) return;
      this.setHighlightedNode(firstCandidate, true);
    });
  }
}
class SelectRootState {
  static create(props) {
    const { type, ...rest } = props;
    const rootState = type === "single" ? new SelectSingleRootState(rest) : new SelectMultipleRootState(rest);
    return SelectRootContext.set(rootState);
  }
}
class SelectTriggerState {
  static create(opts) {
    return new SelectTriggerState(opts, SelectRootContext.get());
  }
  opts;
  root;
  attachment;
  #domTypeahead;
  #dataTypeahead;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(opts.ref, (v) => this.root.triggerNode = v);
    this.root.domContext = new DOMContext(opts.ref);
    this.#domTypeahead = new DOMTypeahead({
      getCurrentItem: () => this.root.highlightedNode,
      onMatch: (node) => {
        this.root.setHighlightedNode(node);
      },
      getActiveElement: () => this.root.domContext.getActiveElement(),
      getWindow: () => this.root.domContext.getWindow()
    });
    this.#dataTypeahead = new DataTypeahead({
      getCurrentItem: () => {
        if (this.root.isMulti) return "";
        return this.root.currentLabel;
      },
      onMatch: (label) => {
        if (this.root.isMulti) return;
        if (!this.root.opts.items.current) return;
        const matchedItem = this.root.opts.items.current.find((item) => item.label === label);
        if (!matchedItem) return;
        this.root.opts.value.current = matchedItem.value;
      },
      enabled: () => !this.root.isMulti && this.root.dataTypeaheadEnabled,
      candidateValues: () => this.root.isMulti ? [] : this.root.candidateLabels,
      getWindow: () => this.root.domContext.getWindow()
    });
    this.onkeydown = this.onkeydown.bind(this);
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
    this.onclick = this.onclick.bind(this);
  }
  #handleOpen() {
    this.root.opts.open.current = true;
    this.#dataTypeahead.resetTypeahead();
    this.#domTypeahead.resetTypeahead();
  }
  #handlePointerOpen(_) {
    this.#handleOpen();
  }
  /**
   * Logic used to handle keyboard selection/deselection.
   *
   * If it returns true, it means the item was selected and whatever is calling
   * this function should return early
   *
   */
  #handleKeyboardSelection() {
    const isCurrentSelectedValue = this.root.highlightedValue === this.root.opts.value.current;
    if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
      this.root.handleClose();
      return true;
    }
    if (this.root.highlightedValue !== null) {
      this.root.toggleItem(this.root.highlightedValue, this.root.highlightedLabel ?? void 0);
    }
    if (!this.root.isMulti && !isCurrentSelectedValue) {
      this.root.handleClose();
      return true;
    }
    return false;
  }
  onkeydown(e) {
    this.root.isUsingKeyboard = true;
    if (e.key === ARROW_UP || e.key === ARROW_DOWN) e.preventDefault();
    if (!this.root.opts.open.current) {
      if (e.key === ENTER || e.key === SPACE || e.key === ARROW_DOWN || e.key === ARROW_UP) {
        e.preventDefault();
        this.root.handleOpen();
      } else if (!this.root.isMulti && this.root.dataTypeaheadEnabled) {
        this.#dataTypeahead.handleTypeaheadSearch(e.key);
        return;
      }
      if (this.root.hasValue) return;
      const candidateNodes2 = this.root.getCandidateNodes();
      if (!candidateNodes2.length) return;
      if (e.key === ARROW_DOWN) {
        const firstCandidate = candidateNodes2[0];
        this.root.setHighlightedNode(firstCandidate);
      } else if (e.key === ARROW_UP) {
        const lastCandidate = candidateNodes2[candidateNodes2.length - 1];
        this.root.setHighlightedNode(lastCandidate);
      }
      return;
    }
    if (e.key === TAB) {
      this.root.handleClose();
      return;
    }
    if ((e.key === ENTER || // if we're currently "typing ahead", we don't want to select the item
    // just yet as the item the user is trying to get to may have a space in it,
    // so we defer handling the close for this case until further down
    e.key === SPACE && this.#domTypeahead.search === "") && !e.isComposing) {
      e.preventDefault();
      const shouldReturn = this.#handleKeyboardSelection();
      if (shouldReturn) return;
    }
    if (e.key === ARROW_UP && e.altKey) {
      this.root.handleClose();
    }
    if (FIRST_LAST_KEYS.includes(e.key)) {
      e.preventDefault();
      const candidateNodes2 = this.root.getCandidateNodes();
      const currHighlightedNode = this.root.highlightedNode;
      const currIndex = currHighlightedNode ? candidateNodes2.indexOf(currHighlightedNode) : -1;
      const loop = this.root.opts.loop.current;
      let nextItem;
      if (e.key === ARROW_DOWN) {
        nextItem = next(candidateNodes2, currIndex, loop);
      } else if (e.key === ARROW_UP) {
        nextItem = prev(candidateNodes2, currIndex, loop);
      } else if (e.key === PAGE_DOWN) {
        nextItem = forward(candidateNodes2, currIndex, 10, loop);
      } else if (e.key === PAGE_UP) {
        nextItem = backward(candidateNodes2, currIndex, 10, loop);
      } else if (e.key === HOME) {
        nextItem = candidateNodes2[0];
      } else if (e.key === END) {
        nextItem = candidateNodes2[candidateNodes2.length - 1];
      }
      if (!nextItem) return;
      this.root.setHighlightedNode(nextItem);
      return;
    }
    const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
    const isCharacterKey = e.key.length === 1;
    const isSpaceKey = e.key === SPACE;
    const candidateNodes = this.root.getCandidateNodes();
    if (e.key === TAB) return;
    if (!isModifierKey && (isCharacterKey || isSpaceKey)) {
      const matchedNode = this.#domTypeahead.handleTypeaheadSearch(e.key, candidateNodes);
      if (!matchedNode && isSpaceKey) {
        e.preventDefault();
        this.#handleKeyboardSelection();
      }
      return;
    }
    if (!this.root.highlightedNode) {
      this.root.setHighlightedToFirstCandidate();
    }
  }
  onclick(e) {
    const currTarget = e.currentTarget;
    currTarget.focus();
  }
  onpointerdown(e) {
    if (this.root.opts.disabled.current) return;
    if (e.pointerType === "touch") return e.preventDefault();
    const target = e.target;
    if (target?.hasPointerCapture(e.pointerId)) {
      target?.releasePointerCapture(e.pointerId);
    }
    if (e.button === 0 && e.ctrlKey === false) {
      if (this.root.opts.open.current === false) {
        this.#handlePointerOpen(e);
      } else {
        this.root.handleClose();
      }
    }
  }
  onpointerup(e) {
    if (this.root.opts.disabled.current) return;
    e.preventDefault();
    if (e.pointerType === "touch") {
      if (this.root.opts.open.current === false) {
        this.#handlePointerOpen(e);
      } else {
        this.root.handleClose();
      }
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.root.opts.disabled.current ? true : void 0,
    "aria-haspopup": "listbox",
    "aria-expanded": boolToStr(this.root.opts.open.current),
    "aria-activedescendant": this.root.highlightedId,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": boolToEmptyStrOrUndef(this.root.opts.disabled.current),
    "data-placeholder": this.root.hasValue ? void 0 : "",
    [this.root.getBitsAttr("trigger")]: "",
    onpointerdown: this.onpointerdown,
    onkeydown: this.onkeydown,
    onclick: this.onclick,
    onpointerup: this.onpointerup,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectContentState {
  static create(opts) {
    return SelectContentContext.set(new SelectContentState(opts, SelectRootContext.get()));
  }
  opts;
  root;
  attachment;
  viewportNode = null;
  isPositioned = false;
  domContext;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(opts.ref, (v) => this.root.contentNode = v);
    this.domContext = new DOMContext(this.opts.ref);
    if (this.root.domContext === null) {
      this.root.domContext = this.domContext;
    }
    watch(() => this.root.opts.open.current, () => {
      if (this.root.opts.open.current) return;
      this.isPositioned = false;
    });
    this.onpointermove = this.onpointermove.bind(this);
  }
  onpointermove(_) {
    this.root.isUsingKeyboard = false;
  }
  #styles = derived(() => {
    return getFloatingContentCSSVars(this.root.isCombobox ? "combobox" : "select");
  });
  onInteractOutside = (e) => {
    if (e.target === this.root.triggerNode || e.target === this.root.inputNode) {
      e.preventDefault();
      return;
    }
    this.opts.onInteractOutside.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onEscapeKeydown = (e) => {
    this.opts.onEscapeKeydown.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onOpenAutoFocus = (e) => {
    e.preventDefault();
  };
  onCloseAutoFocus = (e) => {
    e.preventDefault();
  };
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "listbox",
    "aria-multiselectable": this.root.isMulti ? "true" : void 0,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    [this.root.getBitsAttr("content")]: "",
    style: {
      display: "flex",
      flexDirection: "column",
      outline: "none",
      boxSizing: "border-box",
      pointerEvents: "auto",
      ...this.#styles()
    },
    onpointermove: this.onpointermove,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = {
    onInteractOutside: this.onInteractOutside,
    onEscapeKeydown: this.onEscapeKeydown,
    onOpenAutoFocus: this.onOpenAutoFocus,
    onCloseAutoFocus: this.onCloseAutoFocus,
    trapFocus: false,
    loop: false,
    onPlaced: () => {
      if (this.root.opts.open.current) {
        this.isPositioned = true;
      }
    }
  };
}
class SelectItemState {
  static create(opts) {
    return new SelectItemState(opts, SelectRootContext.get());
  }
  opts;
  root;
  attachment;
  #isSelected = derived(() => this.root.includesItem(this.opts.value.current));
  get isSelected() {
    return this.#isSelected();
  }
  set isSelected($$value) {
    return this.#isSelected($$value);
  }
  #isHighlighted = derived(() => this.root.highlightedValue === this.opts.value.current);
  get isHighlighted() {
    return this.#isHighlighted();
  }
  set isHighlighted($$value) {
    return this.#isHighlighted($$value);
  }
  prevHighlighted = new Previous(() => this.isHighlighted);
  mounted = false;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(opts.ref);
    watch([() => this.isHighlighted, () => this.prevHighlighted.current], () => {
      if (this.isHighlighted) {
        this.opts.onHighlight.current();
      } else if (this.prevHighlighted.current) {
        this.opts.onUnhighlight.current();
      }
    });
    watch(() => this.mounted, () => {
      if (!this.mounted) return;
      this.root.setInitialHighlightedNode();
    });
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
  }
  handleSelect() {
    if (this.opts.disabled.current) return;
    const isCurrentSelectedValue = this.opts.value.current === this.root.opts.value.current;
    if (!this.root.opts.allowDeselect.current && isCurrentSelectedValue && !this.root.isMulti) {
      this.root.handleClose();
      return;
    }
    this.root.toggleItem(this.opts.value.current, this.opts.label.current);
    if (!this.root.isMulti && !isCurrentSelectedValue) {
      this.root.handleClose();
    }
  }
  #snippetProps = derived(() => ({ selected: this.isSelected, highlighted: this.isHighlighted }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  onpointerdown(e) {
    e.preventDefault();
  }
  /**
   * Using `pointerup` instead of `click` allows power users to pointerdown
   * the trigger, then release pointerup on an item to select it vs having to do
   * multiple clicks.
   */
  onpointerup(e) {
    if (e.defaultPrevented || !this.opts.ref.current) return;
    if (e.pointerType === "touch" && !isIOS) {
      on(
        this.opts.ref.current,
        "click",
        () => {
          this.handleSelect();
          this.root.setHighlightedNode(this.opts.ref.current);
        },
        { once: true }
      );
      return;
    }
    e.preventDefault();
    this.handleSelect();
    if (e.pointerType === "touch") {
      this.root.setHighlightedNode(this.opts.ref.current);
    }
  }
  onpointermove(e) {
    if (e.pointerType === "touch") return;
    if (this.root.highlightedNode !== this.opts.ref.current) {
      this.root.setHighlightedNode(this.opts.ref.current);
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "option",
    "aria-selected": this.root.includesItem(this.opts.value.current) ? "true" : void 0,
    "data-value": this.opts.value.current,
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    "data-highlighted": this.root.highlightedValue === this.opts.value.current && !this.opts.disabled.current ? "" : void 0,
    "data-selected": this.root.includesItem(this.opts.value.current) ? "" : void 0,
    "data-label": this.opts.label.current,
    [this.root.getBitsAttr("item")]: "",
    onpointermove: this.onpointermove,
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectGroupState {
  static create(opts) {
    return SelectGroupContext.set(new SelectGroupState(opts, SelectRootContext.get()));
  }
  opts;
  root;
  labelNode = null;
  attachment;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    [this.root.getBitsAttr("group")]: "",
    "aria-labelledby": this.labelNode?.id ?? void 0,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectHiddenInputState {
  static create(opts) {
    return new SelectHiddenInputState(opts, SelectRootContext.get());
  }
  opts;
  root;
  #shouldRender = derived(() => this.root.opts.name.current !== "");
  get shouldRender() {
    return this.#shouldRender();
  }
  set shouldRender($$value) {
    return this.#shouldRender($$value);
  }
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.onfocus = this.onfocus.bind(this);
  }
  onfocus(e) {
    e.preventDefault();
    if (!this.root.isCombobox) {
      this.root.triggerNode?.focus();
    } else {
      this.root.inputNode?.focus();
    }
  }
  #props = derived(() => ({
    disabled: boolToTrueOrUndef(this.root.opts.disabled.current),
    required: boolToTrueOrUndef(this.root.opts.required.current),
    name: this.root.opts.name.current,
    value: this.opts.value.current,
    onfocus: this.onfocus
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectViewportState {
  static create(opts) {
    return new SelectViewportState(opts, SelectContentContext.get());
  }
  opts;
  content;
  root;
  attachment;
  prevScrollTop = 0;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.root = content.root;
    this.attachment = attachRef(opts.ref, (v) => this.content.viewportNode = v);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "presentation",
    [this.root.getBitsAttr("viewport")]: "",
    style: {
      // we use position: 'relative' here on the `viewport` so that when we call
      // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
      // (independent of the scrollUpButton).
      position: "relative",
      flex: 1,
      overflow: "auto"
    },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollButtonImplState {
  opts;
  content;
  root;
  attachment;
  autoScrollTimer = null;
  userScrollTimer = -1;
  isUserScrolling = false;
  onAutoScroll = noop;
  mounted = false;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.root = content.root;
    this.attachment = attachRef(opts.ref);
    watch([() => this.mounted], () => {
      if (!this.mounted) {
        this.isUserScrolling = false;
        return;
      }
      if (this.isUserScrolling) return;
    });
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointermove = this.onpointermove.bind(this);
    this.onpointerleave = this.onpointerleave.bind(this);
  }
  handleUserScroll() {
    this.content.domContext.clearTimeout(this.userScrollTimer);
    this.isUserScrolling = true;
    this.userScrollTimer = this.content.domContext.setTimeout(
      () => {
        this.isUserScrolling = false;
      },
      200
    );
  }
  clearAutoScrollInterval() {
    if (this.autoScrollTimer === null) return;
    this.content.domContext.clearTimeout(this.autoScrollTimer);
    this.autoScrollTimer = null;
  }
  onpointerdown(_) {
    if (this.autoScrollTimer !== null) return;
    const autoScroll = (tick) => {
      this.onAutoScroll();
      this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(tick + 1), this.opts.delay.current(tick));
    };
    this.autoScrollTimer = this.content.domContext.setTimeout(() => autoScroll(1), this.opts.delay.current(0));
  }
  onpointermove(e) {
    this.onpointerdown(e);
  }
  onpointerleave(_) {
    this.clearAutoScrollInterval();
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-hidden": boolToStrTrueOrUndef(true),
    style: { flexShrink: 0 },
    onpointerdown: this.onpointerdown,
    onpointermove: this.onpointermove,
    onpointerleave: this.onpointerleave,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollDownButtonState {
  static create(opts) {
    return new SelectScrollDownButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
  }
  scrollButtonState;
  content;
  root;
  canScrollDown = false;
  scrollIntoViewTimer = null;
  constructor(scrollButtonState) {
    this.scrollButtonState = scrollButtonState;
    this.content = scrollButtonState.content;
    this.root = scrollButtonState.root;
    this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
    watch(
      [
        () => this.content.viewportNode,
        () => this.content.isPositioned
      ],
      () => {
        if (!this.content.viewportNode || !this.content.isPositioned) return;
        this.handleScroll(true);
        return on(this.content.viewportNode, "scroll", () => this.handleScroll());
      }
    );
    watch(() => this.scrollButtonState.mounted, () => {
      if (!this.scrollButtonState.mounted) return;
      if (this.scrollIntoViewTimer) {
        clearTimeout(this.scrollIntoViewTimer);
      }
      this.scrollIntoViewTimer = afterSleep(5, () => {
        const activeItem = this.root.highlightedNode;
        activeItem?.scrollIntoView({ block: this.root.opts.scrollAlignment.current });
      });
    });
  }
  /**
   * @param manual - if true, it means the function was invoked manually outside of an event
   * listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
   */
  handleScroll = (manual = false) => {
    if (!manual) {
      this.scrollButtonState.handleUserScroll();
    }
    if (!this.content.viewportNode) return;
    const maxScroll = this.content.viewportNode.scrollHeight - this.content.viewportNode.clientHeight;
    const paddingTop = Number.parseInt(getComputedStyle(this.content.viewportNode).paddingTop, 10);
    this.canScrollDown = Math.ceil(this.content.viewportNode.scrollTop) < maxScroll - paddingTop;
  };
  handleAutoScroll = () => {
    const viewport = this.content.viewportNode;
    const selectedItem = this.root.highlightedNode;
    if (!viewport || !selectedItem) return;
    viewport.scrollTop = viewport.scrollTop + selectedItem.offsetHeight;
  };
  #props = derived(() => ({
    ...this.scrollButtonState.props,
    [this.root.getBitsAttr("scroll-down-button")]: ""
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class SelectScrollUpButtonState {
  static create(opts) {
    return new SelectScrollUpButtonState(new SelectScrollButtonImplState(opts, SelectContentContext.get()));
  }
  scrollButtonState;
  content;
  root;
  canScrollUp = false;
  constructor(scrollButtonState) {
    this.scrollButtonState = scrollButtonState;
    this.content = scrollButtonState.content;
    this.root = scrollButtonState.root;
    this.scrollButtonState.onAutoScroll = this.handleAutoScroll;
    watch(
      [
        () => this.content.viewportNode,
        () => this.content.isPositioned
      ],
      () => {
        if (!this.content.viewportNode || !this.content.isPositioned) return;
        this.handleScroll(true);
        return on(this.content.viewportNode, "scroll", () => this.handleScroll());
      }
    );
  }
  /**
   * @param manual - if true, it means the function was invoked manually outside of an event
   * listener, so we don't call `handleUserScroll` to prevent the auto scroll from kicking in.
   */
  handleScroll = (manual = false) => {
    if (!manual) {
      this.scrollButtonState.handleUserScroll();
    }
    if (!this.content.viewportNode) return;
    const paddingTop = Number.parseInt(getComputedStyle(this.content.viewportNode).paddingTop, 10);
    this.canScrollUp = this.content.viewportNode.scrollTop - paddingTop > 0.1;
  };
  handleAutoScroll = () => {
    if (!this.content.viewportNode || !this.root.highlightedNode) return;
    this.content.viewportNode.scrollTop = this.content.viewportNode.scrollTop - this.root.highlightedNode.offsetHeight;
  };
  #props = derived(() => ({
    ...this.scrollButtonState.props,
    [this.root.getBitsAttr("scroll-up-button")]: ""
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Select_hidden_input($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { value = "", autocomplete } = $$props;
    const hiddenInputState = SelectHiddenInputState.create({ value: boxWith(() => value) });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (hiddenInputState.shouldRender) {
        $$renderer3.push("<!--[-->");
        Hidden_input($$renderer3, spread_props([
          hiddenInputState.props,
          {
            autocomplete,
            get value() {
              return value;
            },
            set value($$value) {
              value = $$value;
              $$settled = false;
            }
          }
        ]));
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { value });
  });
}
function Select_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      forceMount = false,
      side = "bottom",
      onInteractOutside = noop,
      onEscapeKeydown = noop,
      children,
      child,
      preventScroll = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = SelectContentState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      onInteractOutside: boxWith(() => onInteractOutside),
      onEscapeKeydown: boxWith(() => onEscapeKeydown)
    });
    const mergedProps = mergeProps(restProps, contentState.props);
    if (forceMount) {
      $$renderer2.push("<!--[-->");
      {
        let popper = function($$renderer3, { props, wrapperProps }) {
          const finalProps = mergeProps(props, { style: contentState.props.style });
          if (child) {
            $$renderer3.push("<!--[-->");
            child($$renderer3, {
              props: finalProps,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
            children?.($$renderer3);
            $$renderer3.push(`<!----></div></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        };
        Popper_layer_force_mount($$renderer2, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            ref: contentState.opts.ref,
            side,
            enabled: contentState.root.opts.open.current,
            id,
            preventScroll,
            forceMount: true,
            popper,
            $$slots: { popper: true }
          }
        ]));
      }
    } else {
      $$renderer2.push("<!--[!-->");
      if (!forceMount) {
        $$renderer2.push("<!--[-->");
        {
          let popper = function($$renderer3, { props, wrapperProps }) {
            const finalProps = mergeProps(props, { style: contentState.props.style });
            if (child) {
              $$renderer3.push("<!--[-->");
              child($$renderer3, {
                props: finalProps,
                wrapperProps,
                ...contentState.snippetProps
              });
              $$renderer3.push(`<!---->`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...finalProps })}>`);
              children?.($$renderer3);
              $$renderer3.push(`<!----></div></div>`);
            }
            $$renderer3.push(`<!--]-->`);
          };
          Popper_layer($$renderer2, spread_props([
            mergedProps,
            contentState.popperProps,
            {
              ref: contentState.opts.ref,
              side,
              open: contentState.root.opts.open.current,
              id,
              preventScroll,
              forceMount: false,
              popper,
              $$slots: { popper: true }
            }
          ]));
        }
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Mounted($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { mounted = false, onMountedChange = noop } = $$props;
    bind_props($$props, { mounted });
  });
}
function Select_item$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      value,
      label = value,
      disabled = false,
      children,
      child,
      onHighlight = noop,
      onUnhighlight = noop,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const itemState = SelectItemState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      value: boxWith(() => value),
      disabled: boxWith(() => disabled),
      label: boxWith(() => label),
      onHighlight: boxWith(() => onHighlight),
      onUnhighlight: boxWith(() => onUnhighlight)
    });
    const mergedProps = mergeProps(restProps, itemState.props);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (child) {
        $$renderer3.push("<!--[-->");
        child($$renderer3, { props: mergedProps, ...itemState.snippetProps });
        $$renderer3.push(`<!---->`);
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div${attributes({ ...mergedProps })}>`);
        children?.($$renderer3, itemState.snippetProps);
        $$renderer3.push(`<!----></div>`);
      }
      $$renderer3.push(`<!--]--> `);
      Mounted($$renderer3, {
        get mounted() {
          return itemState.mounted;
        },
        set mounted($$value) {
          itemState.mounted = $$value;
          $$settled = false;
        }
      });
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
function Select_viewport($$renderer, $$props) {
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
    const viewportState = SelectViewportState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, viewportState.props);
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
function Select_scroll_down_button$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      delay = () => 50,
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const scrollButtonState = SelectScrollDownButtonState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      delay: boxWith(() => delay)
    });
    const mergedProps = mergeProps(restProps, scrollButtonState.props);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (scrollButtonState.canScrollDown) {
        $$renderer3.push("<!--[-->");
        Mounted($$renderer3, {
          get mounted() {
            return scrollButtonState.scrollButtonState.mounted;
          },
          set mounted($$value) {
            scrollButtonState.scrollButtonState.mounted = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----> `);
        if (child) {
          $$renderer3.push("<!--[-->");
          child($$renderer3, { props: restProps });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div${attributes({ ...mergedProps })}>`);
          children?.($$renderer3);
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
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
function Select_scroll_up_button$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      delay = () => 50,
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const scrollButtonState = SelectScrollUpButtonState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      delay: boxWith(() => delay)
    });
    const mergedProps = mergeProps(restProps, scrollButtonState.props);
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (scrollButtonState.canScrollUp) {
        $$renderer3.push("<!--[-->");
        Mounted($$renderer3, {
          get mounted() {
            return scrollButtonState.scrollButtonState.mounted;
          },
          set mounted($$value) {
            scrollButtonState.scrollButtonState.mounted = $$value;
            $$settled = false;
          }
        });
        $$renderer3.push(`<!----> `);
        if (child) {
          $$renderer3.push("<!--[-->");
          child($$renderer3, { props: restProps });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div${attributes({ ...mergedProps })}>`);
          children?.($$renderer3);
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
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
function Select($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      value = void 0,
      onValueChange = noop,
      name = "",
      disabled = false,
      type,
      open = false,
      onOpenChange = noop,
      onOpenChangeComplete = noop,
      loop = false,
      scrollAlignment = "nearest",
      required = false,
      items = [],
      allowDeselect = false,
      autocomplete,
      children
    } = $$props;
    function handleDefaultValue() {
      if (value !== void 0) return;
      value = type === "single" ? "" : [];
    }
    handleDefaultValue();
    watch.pre(() => value, () => {
      handleDefaultValue();
    });
    let inputValue = "";
    const rootState = SelectRootState.create({
      type,
      value: boxWith(() => value, (v) => {
        value = v;
        onValueChange(v);
      }),
      disabled: boxWith(() => disabled),
      required: boxWith(() => required),
      open: boxWith(() => open, (v) => {
        open = v;
        onOpenChange(v);
      }),
      loop: boxWith(() => loop),
      scrollAlignment: boxWith(() => scrollAlignment),
      name: boxWith(() => name),
      isCombobox: false,
      items: boxWith(() => items),
      allowDeselect: boxWith(() => allowDeselect),
      inputValue: boxWith(() => inputValue, (v) => inputValue = v),
      onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
    });
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Floating_layer($$renderer3, {
        children: ($$renderer4) => {
          children?.($$renderer4);
          $$renderer4.push(`<!---->`);
        }
      });
      $$renderer3.push(`<!----> `);
      if (Array.isArray(rootState.opts.value.current)) {
        $$renderer3.push("<!--[-->");
        if (rootState.opts.value.current.length === 0) {
          $$renderer3.push("<!--[-->");
          Select_hidden_input($$renderer3, { autocomplete });
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<!--[-->`);
          const each_array = ensure_array_like(rootState.opts.value.current);
          for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
            let item = each_array[$$index];
            Select_hidden_input($$renderer3, { value: item, autocomplete });
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]-->`);
      } else {
        $$renderer3.push("<!--[!-->");
        Select_hidden_input($$renderer3, {
          autocomplete,
          get value() {
            return rootState.opts.value.current;
          },
          set value($$value) {
            rootState.opts.value.current = $$value;
            $$settled = false;
          }
        });
      }
      $$renderer3.push(`<!--]-->`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
    bind_props($$props, { value, open });
  });
}
function Select_trigger$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      child,
      children,
      type = "button",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const triggerState = SelectTriggerState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, triggerState.props, { type });
    $$renderer2.push(`<!---->`);
    Floating_layer_anchor($$renderer2, {
      id,
      ref: triggerState.opts.ref,
      children: ($$renderer3) => {
        if (child) {
          $$renderer3.push("<!--[-->");
          child($$renderer3, { props: mergedProps });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<button${attributes({ ...mergedProps })}>`);
          children?.($$renderer3);
          $$renderer3.push(`<!----></button>`);
        }
        $$renderer3.push(`<!--]-->`);
      }
    });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref });
  });
}
function Tabs_list$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      children,
      id = createId(uid),
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const listState = TabsListState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, listState.props);
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
function Tabs_trigger$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      children,
      disabled = false,
      id = createId(uid),
      type = "button",
      value,
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const triggerState = TabsTriggerState.create({
      id: boxWith(() => id),
      disabled: boxWith(() => disabled ?? false),
      value: boxWith(() => value),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, triggerState.props, { type });
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
function Crown($$renderer, $$props) {
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
        "d": "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"
      }
    ],
    ["path", { "d": "M5 21h14" }]
  ];
  Icon($$renderer, spread_props([
    { name: "crown" },
    $$sanitized_props,
    {
      /**
       * @component @name Crown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTEuNTYyIDMuMjY2YS41LjUgMCAwIDEgLjg3NiAwTDE1LjM5IDguODdhMSAxIDAgMCAwIDEuNTE2LjI5NEwyMS4xODMgNS41YS41LjUgMCAwIDEgLjc5OC41MTlsLTIuODM0IDEwLjI0NmExIDEgMCAwIDEtLjk1Ni43MzRINS44MWExIDEgMCAwIDEtLjk1Ny0uNzM0TDIuMDIgNi4wMmEuNS41IDAgMCAxIC43OTgtLjUxOWw0LjI3NiAzLjY2NGExIDEgMCAwIDAgMS41MTYtLjI5NHoiIC8+CiAgPHBhdGggZD0iTTUgMjFoMTQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/crown
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
function Eye($$renderer, $$props) {
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
        "d": "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"
      }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "eye" },
    $$sanitized_props,
    {
      /**
       * @component @name Eye
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMi4wNjIgMTIuMzQ4YTEgMSAwIDAgMSAwLS42OTYgMTAuNzUgMTAuNzUgMCAwIDEgMTkuODc2IDAgMSAxIDAgMCAxIDAgLjY5NiAxMC43NSAxMC43NSAwIDAgMS0xOS44NzYgMCIgLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzIiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/eye
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
function Mail($$renderer, $$props) {
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
    ["path", { "d": "m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" }],
    [
      "rect",
      { "x": "2", "y": "4", "width": "20", "height": "16", "rx": "2" }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "mail" },
    $$sanitized_props,
    {
      /**
       * @component @name Mail
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMjIgNy04Ljk5MSA1LjcyN2EyIDIgMCAwIDEtMi4wMDkgMEwyIDciIC8+CiAgPHJlY3QgeD0iMiIgeT0iNCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE2IiByeD0iMiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/mail
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
function Shield($$renderer, $$props) {
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
        "d": "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "shield" },
    $$sanitized_props,
    {
      /**
       * @component @name Shield
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgMTNjMCA1LTMuNSA3LjUtNy42NiA4Ljk1YTEgMSAwIDAgMS0uNjctLjAxQzcuNSAyMC41IDQgMTggNCAxM1Y2YTEgMSAwIDAgMSAxLTFjMiAwIDQuNS0xLjIgNi4yNC0yLjcyYTEuMTcgMS4xNyAwIDAgMSAxLjUyIDBDMTQuNTEgMy44MSAxNyA1IDE5IDVhMSAxIDAgMCAxIDEgMXoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/shield
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
function Square_pen($$renderer, $$props) {
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
        "d": "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      }
    ],
    [
      "path",
      {
        "d": "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "square-pen" },
    $$sanitized_props,
    {
      /**
       * @component @name SquarePen
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTIgM0g1YTIgMiAwIDAgMC0yIDJ2MTRhMiAyIDAgMCAwIDIgMmgxNGEyIDIgMCAwIDAgMi0ydi03IiAvPgogIDxwYXRoIGQ9Ik0xOC4zNzUgMi42MjVhMSAxIDAgMCAxIDMgM2wtOS4wMTMgOS4wMTRhMiAyIDAgMCAxLS44NTMuNTA1bC0yLjg3My44NGEuNS41IDAgMCAxLS42Mi0uNjJsLjg0LTIuODczYTIgMiAwIDAgMSAuNTA2LS44NTJ6IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/square-pen
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
function Users($$renderer, $$props) {
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
    ["path", { "d": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
    ["path", { "d": "M16 3.128a4 4 0 0 1 0 7.744" }],
    ["path", { "d": "M22 21v-2a4 4 0 0 0-3-3.87" }],
    ["circle", { "cx": "9", "cy": "7", "r": "4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "users" },
    $$sanitized_props,
    {
      /**
       * @component @name Users
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTYgMjF2LTJhNCA0IDAgMCAwLTQtNEg2YTQgNCAwIDAgMC00IDR2MiIgLz4KICA8cGF0aCBkPSJNMTYgMy4xMjhhNCA0IDAgMCAxIDAgNy43NDQiIC8+CiAgPHBhdGggZD0iTTIyIDIxdi0yYTQgNCAwIDAgMC0zLTMuODciIC8+CiAgPGNpcmNsZSBjeD0iOSIgY3k9IjciIHI9IjQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/users
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
function Check($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    /**
     * @license @lucide/svelte v0.544.0 - ISC
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
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "M20 6 9 17l-5-5" }]];
    Icon$1($$renderer2, spread_props([
      { name: "check" },
      /**
       * @component @name Check
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAgNiA5IDE3bC01LTUiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/check
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
function Chevron_down($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    /**
     * @license @lucide/svelte v0.544.0 - ISC
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
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "m6 9 6 6 6-6" }]];
    Icon$1($$renderer2, spread_props([
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
function Chevron_up($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    /**
     * @license @lucide/svelte v0.544.0 - ISC
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
    let { $$slots, $$events, ...props } = $$props;
    const iconNode = [["path", { "d": "m18 15-6-6-6 6" }]];
    Icon$1($$renderer2, spread_props([
      { name: "chevron-up" },
      /**
       * @component @name ChevronUp
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTggMTUtNi02LTYgNiIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevron-up
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
function Dialog_title($$renderer, $$props) {
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
      Dialog_title$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-title",
          class: cn("text-lg font-semibold leading-none", className)
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
function Dialog_footer($$renderer, $$props) {
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
      "data-slot": "dialog-footer",
      class: clsx(cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dialog_header($$renderer, $$props) {
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
      "data-slot": "dialog-header",
      class: clsx(cn("flex flex-col gap-2 text-center sm:text-left", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dialog_overlay($$renderer, $$props) {
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
      Dialog_overlay$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-overlay",
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
function Dialog_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      portalProps,
      children,
      showCloseButton = true,
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
            $$renderer4.push(`<!---->`);
            Dialog_overlay($$renderer4, {});
            $$renderer4.push(`<!----> <!---->`);
            Dialog_content$1($$renderer4, spread_props([
              {
                "data-slot": "dialog-content",
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
                },
                children: ($$renderer5) => {
                  children?.($$renderer5);
                  $$renderer5.push(`<!----> `);
                  if (showCloseButton) {
                    $$renderer5.push("<!--[-->");
                    $$renderer5.push(`<!---->`);
                    Dialog_close($$renderer5, {
                      class: "ring-offset-background focus:ring-ring rounded-xs focus:outline-hidden absolute end-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
                      children: ($$renderer6) => {
                        X($$renderer6, {});
                        $$renderer6.push(`<!----> <span class="sr-only">Close</span>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!---->`);
                  } else {
                    $$renderer5.push("<!--[!-->");
                  }
                  $$renderer5.push(`<!--]-->`);
                },
                $$slots: { default: true }
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
function Dialog_description($$renderer, $$props) {
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
      Dialog_description$1($$renderer3, spread_props([
        {
          "data-slot": "dialog-description",
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
function Dialog_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Dialog_trigger$1($$renderer3, spread_props([
        { "data-slot": "dialog-trigger" },
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
const Root$1 = Dialog;
const Portal = Portal$1;
function Tabs_list($$renderer, $$props) {
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
      Tabs_list$1($$renderer3, spread_props([
        {
          "data-slot": "tabs-list",
          class: cn("bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]", className)
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
function Tabs_trigger($$renderer, $$props) {
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
      Tabs_trigger$1($$renderer3, spread_props([
        {
          "data-slot": "tabs-trigger",
          class: cn("data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-2 py-1 text-sm font-medium transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
function AccountSettings($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { user } = $$props;
    let userName = user.name || "";
    let isUpdating = false;
    async function updateProfile() {
      if (!userName.trim()) {
        alert("Please enter your name");
        return;
      }
      isUpdating = true;
      try {
        const response = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: userName.trim() })
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || data.message || "Failed to update profile");
        }
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to update profile");
      } finally {
        isUpdating = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="mb-6"><h2 class="text-xl font-semibold">Account Settings</h2> <p class="text-muted-foreground mt-1 text-sm">Manage your profile and preferences</p></div> <div class="space-y-6"><div class="rounded-lg border p-6"><h3 class="mb-4 text-lg font-semibold">Profile Information</h3> <div class="space-y-4"><div>`);
      Label($$renderer3, {
        for: "user-name",
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->Name`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Input($$renderer3, {
        id: "user-name",
        placeholder: "Your name",
        class: "mt-1",
        disabled: userName == "demo",
        get value() {
          return userName;
        },
        set value($$value) {
          userName = $$value;
          $$settled = false;
        }
      });
      $$renderer3.push(`<!----></div> <div>`);
      Label($$renderer3, {
        for: "user-email",
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->Email`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Input($$renderer3, {
        id: "user-email",
        type: "email",
        value: user.email,
        disabled: true,
        class: "mt-1"
      });
      $$renderer3.push(`<!----> <p class="text-muted-foreground mt-1 text-xs">Email cannot be changed</p></div> <div>`);
      Label($$renderer3, {
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->Role`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----> `);
      Input($$renderer3, {
        type: "text",
        value: user.role,
        disabled: true,
        class: "mt-1 capitalize"
      });
      $$renderer3.push(`<!----> <p class="text-muted-foreground mt-1 text-xs">Your system-wide role</p></div> <div class="flex justify-end">`);
      Button($$renderer3, {
        onclick: updateProfile,
        disabled: isUpdating,
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->${escape_html(isUpdating ? "Updating..." : "Save Changes")}`);
        },
        $$slots: { default: true }
      });
      $$renderer3.push(`<!----></div></div></div></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
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
function Select_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      value,
      label,
      children: childrenProp,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      {
        let children = function($$renderer4, { selected, highlighted }) {
          $$renderer4.push(`<span class="absolute right-2 flex size-3.5 items-center justify-center">`);
          if (selected) {
            $$renderer4.push("<!--[-->");
            Check($$renderer4, { class: "size-4" });
          } else {
            $$renderer4.push("<!--[!-->");
          }
          $$renderer4.push(`<!--]--></span> `);
          if (childrenProp) {
            $$renderer4.push("<!--[-->");
            childrenProp($$renderer4, { selected, highlighted });
            $$renderer4.push(`<!---->`);
          } else {
            $$renderer4.push("<!--[!-->");
            $$renderer4.push(`${escape_html(label || value)}`);
          }
          $$renderer4.push(`<!--]-->`);
        };
        Select_item$1($$renderer3, spread_props([
          {
            value,
            "data-slot": "select-item",
            class: cn("data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-2 pr-8 text-sm data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
    bind_props($$props, { ref });
  });
}
function Select_scroll_up_button($$renderer, $$props) {
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
      Select_scroll_up_button$1($$renderer3, spread_props([
        {
          "data-slot": "select-scroll-up-button",
          class: cn("flex cursor-default items-center justify-center py-1", className)
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
          children: ($$renderer4) => {
            Chevron_up($$renderer4, { class: "size-4" });
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
function Select_scroll_down_button($$renderer, $$props) {
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
      Select_scroll_down_button$1($$renderer3, spread_props([
        {
          "data-slot": "select-scroll-down-button",
          class: cn("flex cursor-default items-center justify-center py-1", className)
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
          children: ($$renderer4) => {
            Chevron_down($$renderer4, { class: "size-4" });
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
function Select_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      sideOffset = 4,
      portalProps,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Portal$1($$renderer3, spread_props([
        portalProps,
        {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Select_content$1($$renderer4, spread_props([
              {
                sideOffset,
                "data-slot": "select-content",
                class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--bits-select-content-available-height) origin-(--bits-select-content-transform-origin) relative z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border shadow-md data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className)
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
                children: ($$renderer5) => {
                  Select_scroll_up_button($$renderer5, {});
                  $$renderer5.push(`<!----> <!---->`);
                  Select_viewport($$renderer5, {
                    class: cn("h-(--bits-select-anchor-height) min-w-(--bits-select-anchor-width) w-full scroll-my-1 p-1"),
                    children: ($$renderer6) => {
                      children?.($$renderer6);
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Select_scroll_down_button($$renderer5, {});
                  $$renderer5.push(`<!---->`);
                },
                $$slots: { default: true }
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
function Select_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      size = "default",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Select_trigger$1($$renderer3, spread_props([
        {
          "data-slot": "select-trigger",
          "data-size": size,
          class: cn("border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 shadow-xs flex w-fit select-none items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
          children: ($$renderer4) => {
            children?.($$renderer4);
            $$renderer4.push(`<!----> `);
            Chevron_down($$renderer4, { class: "size-4 opacity-50" });
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
const Root = Select;
function ApiKeysSettings($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { apiKeys, organizationRole } = $$props;
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
        alert("Please enter a key name");
        return;
      }
      isCreating = true;
      try {
        const response = await fetch("/api/settings/api-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newKeyName.trim(),
            permissions: newKeyPermissions,
            expiresInDays: newKeyExpiresInDays
          })
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create API key");
        }
        const result = await response.json();
        createdKey = { key: result.apiKey.key, name: result.apiKey.name };
        newKeyName = "";
        newKeyPermissions = ["read"];
        newKeyExpiresValue = "365";
        newKeyExpiresInDays = 365;
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to create API key");
      } finally {
        isCreating = false;
      }
    }
    async function deleteApiKey(id, name) {
      if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
      }
      try {
        const response = await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to delete API key");
        }
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to delete API key");
      }
    }
    function copyToClipboard(text) {
      navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
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
      $$renderer3.push(`<div class="mb-6 flex items-center justify-between"><div><h2 class="text-xl font-semibold">API Keys</h2> <p class="text-muted-foreground mt-1 text-sm">API keys allow programmatic access to your CMS content</p></div> `);
      if (canManageApiKeys) {
        $$renderer3.push("<!--[-->");
        Root$1($$renderer3, {
          get open() {
            return createDialogOpen;
          },
          set open($$value) {
            createDialogOpen = $$value;
            $$settled = false;
          },
          children: ($$renderer4) => {
            {
              let child = function($$renderer5, { props }) {
                Button($$renderer5, spread_props([
                  props,
                  {
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Create API Key`);
                    },
                    $$slots: { default: true }
                  }
                ]));
              };
              Dialog_trigger($$renderer4, { child, $$slots: { child: true } });
            }
            $$renderer4.push(`<!----> `);
            Dialog_content($$renderer4, {
              class: "sm:max-w-[500px]",
              children: ($$renderer5) => {
                if (createdKey) {
                  $$renderer5.push("<!--[-->");
                  Dialog_header($$renderer5, {
                    children: ($$renderer6) => {
                      Dialog_title($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->API Key Created`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Dialog_description($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Save this key securely - you won't be able to see it again`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="space-y-4 py-4"><div>`);
                  Label($$renderer5, {
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Key Name`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <p class="mt-1 text-sm font-medium">${escape_html(createdKey.name)}</p></div> <div>`);
                  Label($$renderer5, {
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->API Key`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="mt-1 flex gap-2">`);
                  Input($$renderer5, {
                    value: createdKey.key,
                    readonly: true,
                    class: "font-mono text-xs"
                  });
                  $$renderer5.push(`<!----> `);
                  Button($$renderer5, {
                    size: "sm",
                    variant: "outline",
                    onclick: () => copyToClipboard(createdKey.key),
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Copy`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----></div></div></div> `);
                  Dialog_footer($$renderer5, {
                    children: ($$renderer6) => {
                      Button($$renderer6, {
                        onclick: () => {
                          createdKey = null;
                          createDialogOpen = false;
                        },
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Done`);
                        },
                        $$slots: { default: true }
                      });
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!---->`);
                } else {
                  $$renderer5.push("<!--[!-->");
                  Dialog_header($$renderer5, {
                    children: ($$renderer6) => {
                      Dialog_title($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Create API Key`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Dialog_description($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Generate a new API key for programmatic access`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="space-y-4 py-4"><div>`);
                  Label($$renderer5, {
                    for: "key-name",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Key Name`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Input($$renderer5, {
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
                  $$renderer5.push(`<!----> <p class="text-muted-foreground mt-1 text-xs">A descriptive name to identify this key</p></div> <div>`);
                  Label($$renderer5, {
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Permissions`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="mt-2 flex gap-2">`);
                  Button($$renderer5, {
                    variant: newKeyPermissions.includes("read") ? "default" : "outline",
                    size: "sm",
                    onclick: () => togglePermission("read"),
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Read`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Button($$renderer5, {
                    variant: newKeyPermissions.includes("write") ? "default" : "outline",
                    size: "sm",
                    onclick: () => togglePermission("write"),
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Write`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----></div> <p class="text-muted-foreground mt-1 text-xs">Read: GET requests | Write: POST, PUT, DELETE requests</p></div> <div>`);
                  Label($$renderer5, {
                    for: "expires",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Expires In`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <!---->`);
                  Root($$renderer5, {
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
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->`);
                      Select_trigger($$renderer6, {
                        class: "mt-1 w-[180px]",
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(expirationTriggerContent)}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> <!---->`);
                      Select_content($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->`);
                          Select_group($$renderer7, {
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!--[-->`);
                              const each_array = ensure_array_like(expirationOptions);
                              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                                let option = each_array[$$index];
                                $$renderer8.push(`<!---->`);
                                Select_item($$renderer8, {
                                  value: option.value,
                                  label: option.label,
                                  children: ($$renderer9) => {
                                    $$renderer9.push(`<!---->${escape_html(option.label)}`);
                                  },
                                  $$slots: { default: true }
                                });
                                $$renderer8.push(`<!---->`);
                              }
                              $$renderer8.push(`<!--]-->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!---->`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----></div></div> `);
                  Dialog_footer($$renderer5, {
                    children: ($$renderer6) => {
                      Button($$renderer6, {
                        variant: "outline",
                        onclick: () => createDialogOpen = false,
                        disabled: isCreating,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Cancel`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Button($$renderer6, {
                        onclick: createApiKey,
                        disabled: isCreating,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(isCreating ? "Creating..." : "Create Key")}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!---->`);
                }
                $$renderer5.push(`<!--]-->`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--></div> `);
      if (apiKeys.length === 0) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="text-muted-foreground py-12 text-center"><p class="text-lg">No API keys yet</p> <p class="mt-2 text-sm">Create your first API key to access the CMS programmatically</p></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div class="space-y-3"><!--[-->`);
        const each_array_1 = ensure_array_like(apiKeys);
        for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
          let apiKey = each_array_1[$$index_2];
          $$renderer3.push(`<div class="flex items-center justify-between rounded-lg border p-4"><div class="flex-1"><div class="flex items-center gap-3"><h3 class="font-medium">${escape_html(apiKey.name)}</h3> <div class="flex gap-1"><!--[-->`);
          const each_array_2 = ensure_array_like(apiKey.permissions);
          for (let $$index_1 = 0, $$length2 = each_array_2.length; $$index_1 < $$length2; $$index_1++) {
            let permission = each_array_2[$$index_1];
            $$renderer3.push(`<span class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">${escape_html(permission)}</span>`);
          }
          $$renderer3.push(`<!--]--></div></div> <div class="text-muted-foreground mt-2 flex gap-4 text-xs"><span>Created: ${escape_html(formatDate(apiKey.createdAt))}</span> <span>Last used: ${escape_html(formatDate(apiKey.lastRequest))}</span> <span>Expires: ${escape_html(apiKey.expiresAt ? formatDate(apiKey.expiresAt) : "Never")}</span></div></div> `);
          if (canManageApiKeys) {
            $$renderer3.push("<!--[-->");
            Button($$renderer3, {
              variant: "ghost",
              size: "sm",
              onclick: () => deleteApiKey(apiKey.id, apiKey.name),
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->Delete`);
              },
              $$slots: { default: true }
            });
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div>`);
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]--> <div class="bg-muted/50 mt-6 rounded-lg border p-4"><h3 class="mb-2 text-sm font-medium">Usage</h3> <p class="text-muted-foreground mb-2 text-xs">Include your API key in the <code class="bg-background rounded px-1 py-0.5">x-api-key</code> header</p></div>`);
    }
    do {
      $$settled = true;
      $$inner_renderer = $$renderer2.copy();
      $$render_inner($$inner_renderer);
    } while (!$$settled);
    $$renderer2.subsume($$inner_renderer);
  });
}
function OrganizationsSettings($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { activeOrganization, currentUserId, pendingInvitations = [] } = $$props;
    let editOrgDialogOpen = false;
    let inviteMemberDialogOpen = false;
    let editOrgName = "";
    let editOrgSlug = "";
    let isUpdatingOrg = false;
    let inviteEmail = "";
    let inviteRole = "editor";
    let isInviting = false;
    const roleOptions = [
      {
        value: "admin",
        label: "Admin",
        description: "Can manage members and settings"
      },
      {
        value: "editor",
        label: "Editor",
        description: "Can create and edit content"
      },
      {
        value: "viewer",
        label: "Viewer",
        description: "Can only view content"
      }
    ];
    const currentUserRole = activeOrganization?.members.find((m) => m.userId === currentUserId)?.role;
    const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";
    function getRoleIcon(role) {
      switch (role) {
        case "owner":
          return Crown;
        case "admin":
          return Shield;
        case "editor":
          return Square_pen;
        case "viewer":
          return Eye;
        default:
          return Users;
      }
    }
    function getRoleBadgeVariant(role) {
      switch (role) {
        case "owner":
          return "default";
        case "admin":
          return "secondary";
        default:
          return "outline";
      }
    }
    async function inviteMember() {
      if (!inviteEmail.trim()) {
        alert("Please enter an email address");
        return;
      }
      isInviting = true;
      try {
        const result = await organizations.inviteMember({ email: inviteEmail.trim(), role: inviteRole });
        if (!result.success) {
          throw new Error(result.error || result.message || "Failed to invite member");
        }
        inviteEmail = "";
        inviteRole = "editor";
        inviteMemberDialogOpen = false;
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to invite member");
      } finally {
        isInviting = false;
      }
    }
    async function cancelInvitation(invitationId, email) {
      if (!confirm(`Cancel invitation for ${email}?`)) {
        return;
      }
      try {
        const result = await organizations.cancelInvitation({ invitationId });
        if (!result.success) {
          throw new Error(result.error || "Failed to cancel invitation");
        }
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to cancel invitation");
      }
    }
    async function removeMember(userId, userName) {
      if (!confirm(`Are you sure you want to remove ${userName} from the organization?`)) {
        return;
      }
      try {
        const result = await organizations.removeMember({ userId });
        if (!result.success) {
          throw new Error(result.error || "Failed to remove member");
        }
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to remove member");
      }
    }
    function openEditDialog() {
      if (!activeOrganization) return;
      editOrgName = activeOrganization.name;
      editOrgSlug = activeOrganization.slug;
      editOrgDialogOpen = true;
    }
    async function updateOrganization() {
      if (!activeOrganization) return;
      if (!editOrgName.trim() || !editOrgSlug.trim()) {
        alert("Please enter both organization name and slug");
        return;
      }
      isUpdatingOrg = true;
      try {
        const result = await organizations.update(activeOrganization.id, { name: editOrgName.trim(), slug: editOrgSlug.trim() });
        if (!result.success) {
          throw new Error(result.error || "Failed to update organization");
        }
        editOrgDialogOpen = false;
        await invalidateAll();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Failed to update organization");
      } finally {
        isUpdatingOrg = false;
      }
    }
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<div class="mb-6"><h2 class="text-xl font-semibold">Organization</h2> <p class="text-muted-foreground mt-1 text-sm">Manage your organization and members</p></div> `);
      if (!activeOrganization) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div class="text-muted-foreground py-12 text-center">`);
        Users($$renderer3, { class: "mx-auto mb-4 h-12 w-12 opacity-50" });
        $$renderer3.push(`<!----> <p class="text-lg">No active organization</p> <p class="mt-2 text-sm">You need to be added to an organization</p></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        $$renderer3.push(`<div class="space-y-6"><div class="rounded-lg border p-6"><div class="mb-4 flex items-center justify-between"><div><h3 class="text-lg font-semibold">${escape_html(activeOrganization.name)}</h3> <p class="text-muted-foreground text-sm">@${escape_html(activeOrganization.slug)}</p></div> <div class="grid items-center gap-2 sm:flex">`);
        Badge($$renderer3, {
          variant: getRoleBadgeVariant(currentUserRole || ""),
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(currentUserRole)}`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        if (canManageMembers) {
          $$renderer3.push("<!--[-->");
          Button($$renderer3, {
            variant: "outline",
            size: "sm",
            onclick: openEditDialog,
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->Edit`);
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div></div></div> `);
        if (canManageMembers) {
          $$renderer3.push("<!--[-->");
          Root$1($$renderer3, {
            get open() {
              return editOrgDialogOpen;
            },
            set open($$value) {
              editOrgDialogOpen = $$value;
              $$settled = false;
            },
            children: ($$renderer4) => {
              Dialog_content($$renderer4, {
                class: "sm:max-w-[500px]",
                children: ($$renderer5) => {
                  Dialog_header($$renderer5, {
                    children: ($$renderer6) => {
                      Dialog_title($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Edit Organization`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Dialog_description($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Update your organization name and slug`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="space-y-4 py-4"><div>`);
                  Label($$renderer5, {
                    for: "edit-org-name",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Organization Name`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Input($$renderer5, {
                    id: "edit-org-name",
                    placeholder: "Acme Inc",
                    class: "mt-1",
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
                    for: "edit-org-slug",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Slug`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Input($$renderer5, {
                    id: "edit-org-slug",
                    placeholder: "acme-inc",
                    class: "mt-1",
                    get value() {
                      return editOrgSlug;
                    },
                    set value($$value) {
                      editOrgSlug = $$value;
                      $$settled = false;
                    }
                  });
                  $$renderer5.push(`<!----> <p class="text-muted-foreground mt-1 text-xs">Used in URLs. Letters, numbers, and hyphens only.</p></div></div> `);
                  Dialog_footer($$renderer5, {
                    children: ($$renderer6) => {
                      Button($$renderer6, {
                        variant: "outline",
                        onclick: () => editOrgDialogOpen = false,
                        disabled: isUpdatingOrg,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Cancel`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Button($$renderer6, {
                        onclick: updateOrganization,
                        disabled: isUpdatingOrg,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(isUpdatingOrg ? "Updating..." : "Update")}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!---->`);
                },
                $$slots: { default: true }
              });
            },
            $$slots: { default: true }
          });
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--> <div class="rounded-lg border"><div class="flex items-center justify-between border-b p-4"><div><h3 class="font-semibold">Members</h3> <p class="text-muted-foreground text-sm">${escape_html(activeOrganization.members.length)} member${escape_html(activeOrganization.members.length !== 1 ? "s" : "")}</p></div> `);
        if (canManageMembers) {
          $$renderer3.push("<!--[-->");
          Root$1($$renderer3, {
            get open() {
              return inviteMemberDialogOpen;
            },
            set open($$value) {
              inviteMemberDialogOpen = $$value;
              $$settled = false;
            },
            children: ($$renderer4) => {
              Dialog_trigger($$renderer4, {
                children: ($$renderer5) => {
                  Button($$renderer5, {
                    variant: "outline",
                    size: "sm",
                    children: ($$renderer6) => {
                      Mail($$renderer6, { size: 16, class: "mr-2" });
                      $$renderer6.push(`<!----> Invite Member`);
                    },
                    $$slots: { default: true }
                  });
                },
                $$slots: { default: true }
              });
              $$renderer4.push(`<!----> `);
              Dialog_content($$renderer4, {
                class: "sm:max-w-[500px]",
                children: ($$renderer5) => {
                  Dialog_header($$renderer5, {
                    children: ($$renderer6) => {
                      Dialog_title($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Invite Member`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Dialog_description($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Invite a new member to ${escape_html(activeOrganization.name)}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <div class="space-y-4 py-4"><div>`);
                  Label($$renderer5, {
                    for: "invite-email",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Email Address`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> `);
                  Input($$renderer5, {
                    id: "invite-email",
                    type: "email",
                    placeholder: "user@example.com",
                    class: "mt-1",
                    get value() {
                      return inviteEmail;
                    },
                    set value($$value) {
                      inviteEmail = $$value;
                      $$settled = false;
                    }
                  });
                  $$renderer5.push(`<!----></div> <div>`);
                  Label($$renderer5, {
                    for: "invite-role",
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->Role`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----> <!---->`);
                  Root($$renderer5, {
                    type: "single",
                    name: "role",
                    get value() {
                      return inviteRole;
                    },
                    set value($$value) {
                      inviteRole = $$value;
                      $$settled = false;
                    },
                    children: ($$renderer6) => {
                      $$renderer6.push(`<!---->`);
                      Select_trigger($$renderer6, {
                        class: "mt-1 w-full",
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(roleOptions.find((opt) => opt.value === inviteRole)?.label || "Select role")}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> <!---->`);
                      Select_content($$renderer6, {
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->`);
                          Select_group($$renderer7, {
                            children: ($$renderer8) => {
                              $$renderer8.push(`<!--[-->`);
                              const each_array = ensure_array_like(roleOptions);
                              for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
                                let option = each_array[$$index];
                                $$renderer8.push(`<!---->`);
                                Select_item($$renderer8, {
                                  value: option.value,
                                  label: option.label,
                                  children: ($$renderer9) => {
                                    $$renderer9.push(`<div><div class="font-medium">${escape_html(option.label)}</div> <div class="text-muted-foreground text-xs">${escape_html(option.description)}</div></div>`);
                                  },
                                  $$slots: { default: true }
                                });
                                $$renderer8.push(`<!---->`);
                              }
                              $$renderer8.push(`<!--]-->`);
                            },
                            $$slots: { default: true }
                          });
                          $$renderer7.push(`<!---->`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    },
                    $$slots: { default: true }
                  });
                  $$renderer5.push(`<!----></div></div> `);
                  Dialog_footer($$renderer5, {
                    children: ($$renderer6) => {
                      Button($$renderer6, {
                        variant: "outline",
                        onclick: () => inviteMemberDialogOpen = false,
                        disabled: isInviting,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->Cancel`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!----> `);
                      Button($$renderer6, {
                        onclick: inviteMember,
                        disabled: isInviting,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<!---->${escape_html(isInviting ? "Inviting..." : "Send Invite")}`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
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
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div> <div class="divide-y"><!--[-->`);
        const each_array_1 = ensure_array_like(activeOrganization.members);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let member = each_array_1[$$index_1];
          const RoleIcon = getRoleIcon(member.role);
          const isCurrentUser = member.userId === currentUserId;
          const canRemove = canManageMembers && !isCurrentUser && member.role !== "owner";
          $$renderer3.push(`<div class="grid items-center justify-between p-4 sm:flex"><div class="flex items-center gap-3"><div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full"><!---->`);
          RoleIcon($$renderer3, { size: 20, class: "text-primary" });
          $$renderer3.push(`<!----></div> <div><p class="font-medium">${escape_html(member.user.name || member.user.email)} `);
          if (isCurrentUser) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<span class="text-muted-foreground text-sm">(You)</span>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></p> <p class="text-muted-foreground text-sm">${escape_html(member.user.email)} `);
          if (member.invitedEmail && member.invitedEmail !== member.user.email) {
            $$renderer3.push("<!--[-->");
            $$renderer3.push(`<span class="text-muted-foreground/70 ml-1">• Invited as ${escape_html(member.invitedEmail)}</span>`);
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></p></div></div> <div class="flex items-center">`);
          Badge($$renderer3, {
            class: "mt-2 sm:mt-0",
            variant: getRoleBadgeVariant(member.role),
            children: ($$renderer4) => {
              $$renderer4.push(`<!---->${escape_html(member.role)}`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          if (canRemove) {
            $$renderer3.push("<!--[-->");
            Button($$renderer3, {
              variant: "ghost",
              size: "sm",
              onclick: () => removeMember(member.userId, member.user.name || member.user.email),
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->Remove`);
              },
              $$slots: { default: true }
            });
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]--></div></div>`);
        }
        $$renderer3.push(`<!--]--></div></div> `);
        if (pendingInvitations.length > 0) {
          $$renderer3.push("<!--[-->");
          $$renderer3.push(`<div class="rounded-lg border"><div class="border-b p-4"><h3 class="font-semibold">Pending Invitations</h3> <p class="text-muted-foreground text-sm">${escape_html(pendingInvitations.length)} pending invitation${escape_html(pendingInvitations.length !== 1 ? "s" : "")}</p></div> <div class="divide-y"><!--[-->`);
          const each_array_2 = ensure_array_like(pendingInvitations);
          for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
            let invitation = each_array_2[$$index_2];
            const daysUntilExpiry = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
            $$renderer3.push(`<div class="flex items-center justify-between p-4"><div class="flex items-center gap-3"><div class="bg-muted flex h-10 w-10 items-center justify-center rounded-full">`);
            Mail($$renderer3, { size: 20, class: "text-muted-foreground" });
            $$renderer3.push(`<!----></div> <div><p class="font-medium">${escape_html(invitation.email)}</p> <p class="text-muted-foreground text-sm">Invited ${escape_html(new Date(invitation.createdAt).toLocaleDateString())} • Expires in ${escape_html(daysUntilExpiry)}
										day${escape_html(daysUntilExpiry !== 1 ? "s" : "")}</p></div></div> <div class="flex items-center gap-2">`);
            Badge($$renderer3, {
              variant: "outline",
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->${escape_html(invitation.role)}`);
              },
              $$slots: { default: true }
            });
            $$renderer3.push(`<!----> `);
            if (canManageMembers) {
              $$renderer3.push("<!--[-->");
              Button($$renderer3, {
                variant: "ghost",
                size: "sm",
                onclick: () => cancelInvitation(invitation.id, invitation.email),
                children: ($$renderer4) => {
                  $$renderer4.push(`<!---->Cancel`);
                },
                $$slots: { default: true }
              });
            } else {
              $$renderer3.push("<!--[!-->");
            }
            $$renderer3.push(`<!--]--></div></div>`);
          }
          $$renderer3.push(`<!--]--></div></div>`);
        } else {
          $$renderer3.push("<!--[!-->");
        }
        $$renderer3.push(`<!--]--></div>`);
      }
      $$renderer3.push(`<!--]-->`);
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
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Aphex CMS - Settings</title>`);
      });
      $$renderer3.push(`<meta name="description" content="Manage your account settings, API keys, and organization preferences in Aphex CMS."/>`);
    });
    $$renderer2.push(`<div class="container mx-auto max-w-6xl p-6"><div class="mb-6"><h1 class="text-3xl font-bold">Settings</h1> <p class="text-muted-foreground mt-1">Manage your account, API keys, and organizations</p></div> <!---->`);
    Tabs($$renderer2, {
      value: "api-keys",
      class: "w-full",
      children: ($$renderer3) => {
        $$renderer3.push(`<!---->`);
        Tabs_list($$renderer3, {
          class: "grid w-full grid-cols-3",
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->`);
            Tabs_trigger($$renderer4, {
              value: "account",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Account`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Tabs_trigger($$renderer4, {
              value: "api-keys",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->API Keys`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----> <!---->`);
            Tabs_trigger($$renderer4, {
              value: "organization",
              children: ($$renderer5) => {
                $$renderer5.push(`<!---->Organization`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!---->`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <!---->`);
        Tabs_content($$renderer3, {
          value: "account",
          children: ($$renderer4) => {
            Card($$renderer4, {
              class: "p-6",
              children: ($$renderer5) => {
                AccountSettings($$renderer5, { user: data.user });
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <!---->`);
        Tabs_content($$renderer3, {
          value: "api-keys",
          children: ($$renderer4) => {
            Card($$renderer4, {
              class: "p-6",
              children: ($$renderer5) => {
                ApiKeysSettings($$renderer5, {
                  apiKeys: data.apiKeys,
                  organizationRole: data.user.organizationRole
                });
              },
              $$slots: { default: true }
            });
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> <!---->`);
        Tabs_content($$renderer3, {
          value: "organization",
          children: ($$renderer4) => {
            Card($$renderer4, {
              class: "p-6",
              children: ($$renderer5) => {
                OrganizationsSettings($$renderer5, {
                  activeOrganization: data.activeOrganization,
                  currentUserId: data.user.id,
                  pendingInvitations: data.pendingInvitations
                });
              },
              $$slots: { default: true }
            });
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
//# sourceMappingURL=_page.svelte-ySOEy3UJ.js.map
