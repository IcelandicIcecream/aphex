import { B as Button, c as cn } from './button-BaYTBSEJ.js';
import { s as setSidebar, P as Provider, S as SIDEBAR_COOKIE_NAME, a as SIDEBAR_COOKIE_MAX_AGE, m as modeStorageKey, t as themeStorageKey, d as darkClassNames, l as lightClassNames, b as disableTransitions, c as themeColors, e as synchronousModeChanges, u as useSidebar, f as Sheet_content, g as SIDEBAR_WIDTH, h as SIDEBAR_WIDTH_ICON, i as SIDEBAR_WIDTH_MOBILE, j as userPrefersMode, k as derivedMode, I as Icon$1, n as Sidebar_menu_button, F as Floating_layer, o as Floating_layer_anchor, p as Popper_layer_force_mount, q as Popper_layer, G as GraceArea, R as RovingFocusGroup, r as getFloatingContentCSSVars, v as organizations } from './states.svelte-CFLau3Qg.js';
import { p as page } from './index5-C8-UKNy8.js';
import { g as goto, i as invalidateAll } from './client-DH_42K1x.js';
import { z as sanitize_props, F as spread_props, Q as bind_props, f as attr, h as head, G as slot, K as attributes, N as clsx, T as stringify, V as attr_class, W as props_id, X as derived, O as ensure_array_like } from './index2-PlYtOn9l.js';
import { c as createBitsAttrs, a as createId, b as boxWith, m as mergeProps, d as attachRef, e as boolToStrTrueOrUndef, f as boolToEmptyStrOrUndef, g as getDataOpenClosed, h as boolToStr } from './create-id-mXGs1H6b.js';
import { D as Dialog, a as DOMTypeahead } from './dialog-DAKr7YEk.js';
import { D as Dialog_title, a as Dialog_description } from './dialog-description-Co-21MEj.js';
import { n as noop, C as Context, O as OpenChangeComplete, w as watch, P as Presence_layer, S as SPACE, E as ENTER, a as afterTick, b as Portal, A as ARROW_DOWN, D as DOMContext, i as isTabbable, T as TAB, c as isHTMLElement, d as PAGE_UP, H as HOME, e as ARROW_UP, f as PAGE_DOWN, g as END, h as isElement, j as isElementOrSVGElement, k as getDocument, t as tabbable, l as isFocusable, m as focusable, o as isSelectableInput, p as SvelteURLSearchParams } from './dialog-overlay-LaS6gPE6.js';
import { N as on } from './events-DlbR6UiW.js';
import { e as escape_html } from './context-DL4CYGHS.js';
import { I as Icon } from './Icon-DHGqHCBy.js';
import { a as authClient } from './auth-client-lY7r4rzA.js';
import { a as activeTabState } from './activeTab.svelte-Do2xF_HZ.js';
import { r as resolve } from './server2-CSLWe2in.js';
import './state.svelte-BCegLL_9.js';
import './exports-Honk4keX.js';
import './index-BKwQgGLQ.js';
import 'better-auth/svelte';
import 'better-auth/client/plugins';
import './routing-lpprPii4.js';

function html(value) {
  var html2 = String(value ?? "");
  var open = "<!---->";
  return open + html2 + "<!---->";
}
class CustomEventDispatcher {
  eventName;
  options;
  constructor(eventName, options = { bubbles: true, cancelable: true }) {
    this.eventName = eventName;
    this.options = options;
  }
  createEvent(detail) {
    return new CustomEvent(this.eventName, {
      ...this.options,
      detail
    });
  }
  dispatch(element, detail) {
    const event = this.createEvent(detail);
    element.dispatchEvent(event);
    return event;
  }
  listen(element, callback, options) {
    const handler = (event) => {
      callback(event);
    };
    return on(element, this.eventName, handler, options);
  }
}
const collapsibleAttrs = createBitsAttrs({
  component: "collapsible",
  parts: ["root", "content", "trigger"]
});
const CollapsibleRootContext = new Context("Collapsible.Root");
class CollapsibleRootState {
  static create(opts) {
    return CollapsibleRootContext.set(new CollapsibleRootState(opts));
  }
  opts;
  attachment;
  contentNode = null;
  contentId = void 0;
  constructor(opts) {
    this.opts = opts;
    this.toggleOpen = this.toggleOpen.bind(this);
    this.attachment = attachRef(this.opts.ref);
    new OpenChangeComplete({
      ref: boxWith(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    "data-state": getDataOpenClosed(this.opts.open.current),
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    [collapsibleAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CollapsibleContentState {
  static create(opts) {
    return new CollapsibleContentState(opts, CollapsibleRootContext.get());
  }
  opts;
  root;
  attachment;
  #present = derived(() => {
    if (this.opts.hiddenUntilFound.current) return this.root.opts.open.current;
    return this.opts.forceMount.current || this.root.opts.open.current;
  });
  get present() {
    return this.#present();
  }
  set present($$value) {
    return this.#present($$value);
  }
  #originalStyles;
  #isMountAnimationPrevented = false;
  #width = 0;
  #height = 0;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.#isMountAnimationPrevented = root.opts.open.current;
    this.root.contentId = this.opts.id.current;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
    watch.pre(() => this.opts.id.current, (id) => {
      this.root.contentId = id;
    });
    watch.pre(
      [
        () => this.opts.ref.current,
        () => this.opts.hiddenUntilFound.current
      ],
      ([node, hiddenUntilFound]) => {
        if (!node || !hiddenUntilFound) return;
        const handleBeforeMatch = () => {
          if (this.root.opts.open.current) return;
          requestAnimationFrame(() => {
            this.root.opts.open.current = true;
          });
        };
        return on(node, "beforematch", handleBeforeMatch);
      }
    );
    watch([() => this.opts.ref.current, () => this.present], ([node]) => {
      if (!node) return;
      afterTick(() => {
        if (!this.opts.ref.current) return;
        this.#originalStyles = this.#originalStyles || {
          transitionDuration: node.style.transitionDuration,
          animationName: node.style.animationName
        };
        node.style.transitionDuration = "0s";
        node.style.animationName = "none";
        const rect = node.getBoundingClientRect();
        this.#height = rect.height;
        this.#width = rect.width;
        if (!this.#isMountAnimationPrevented) {
          const { animationName, transitionDuration } = this.#originalStyles;
          node.style.transitionDuration = transitionDuration;
          node.style.animationName = animationName;
        }
      });
    });
  }
  #snippetProps = derived(() => ({ open: this.root.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    style: {
      "--bits-collapsible-content-height": this.#height ? `${this.#height}px` : void 0,
      "--bits-collapsible-content-width": this.#width ? `${this.#width}px` : void 0
    },
    hidden: this.opts.hiddenUntilFound.current && !this.root.opts.open.current ? "until-found" : void 0,
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": boolToEmptyStrOrUndef(this.root.opts.disabled.current),
    [collapsibleAttrs.content]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class CollapsibleTriggerState {
  static create(opts) {
    return new CollapsibleTriggerState(opts, CollapsibleRootContext.get());
  }
  opts;
  root;
  attachment;
  #isDisabled = derived(() => this.opts.disabled.current || this.root.opts.disabled.current);
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(this.opts.ref);
    this.onclick = this.onclick.bind(this);
    this.onkeydown = this.onkeydown.bind(this);
  }
  onclick(e) {
    if (this.#isDisabled()) return;
    if (e.button !== 0) return e.preventDefault();
    this.root.toggleOpen();
  }
  onkeydown(e) {
    if (this.#isDisabled()) return;
    if (e.key === SPACE || e.key === ENTER) {
      e.preventDefault();
      this.root.toggleOpen();
    }
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    type: "button",
    disabled: this.#isDisabled(),
    "aria-controls": this.root.contentId,
    "aria-expanded": boolToStr(this.root.opts.open.current),
    "data-state": getDataOpenClosed(this.root.opts.open.current),
    "data-disabled": boolToEmptyStrOrUndef(this.#isDisabled()),
    [collapsibleAttrs.trigger]: "",
    //
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
function Collapsible$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      open = false,
      disabled = false,
      onOpenChange = noop,
      onOpenChangeComplete = noop,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = CollapsibleRootState.create({
      open: boxWith(() => open, (v) => {
        open = v;
        onOpenChange(v);
      }),
      disabled: boxWith(() => disabled),
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
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
    bind_props($$props, { ref, open });
  });
}
function Collapsible_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      ref = null,
      forceMount = false,
      hiddenUntilFound = false,
      children,
      id = createId(uid),
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = CollapsibleContentState.create({
      id: boxWith(() => id),
      forceMount: boxWith(() => forceMount),
      hiddenUntilFound: boxWith(() => hiddenUntilFound),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    {
      let presence = function($$renderer3, { present }) {
        const mergedProps = mergeProps(restProps, contentState.props, hiddenUntilFound && !present ? {} : {
          hidden: hiddenUntilFound ? !present : forceMount ? void 0 : !present
        });
        if (child) {
          $$renderer3.push("<!--[-->");
          child($$renderer3, { ...contentState.snippetProps, props: mergedProps });
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div${attributes({ ...mergedProps })}>`);
          children?.($$renderer3);
          $$renderer3.push(`<!----></div>`);
        }
        $$renderer3.push(`<!--]-->`);
      };
      Presence_layer($$renderer2, {
        forceMount: true,
        open: contentState.present,
        ref: contentState.opts.ref,
        presence
      });
    }
    bind_props($$props, { ref });
  });
}
function Collapsible_trigger$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      ref = null,
      id = createId(uid),
      disabled = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const triggerState = CollapsibleTriggerState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v),
      disabled: boxWith(() => disabled)
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
const separatorAttrs = createBitsAttrs({ component: "separator", parts: ["root"] });
class SeparatorRootState {
  static create(opts) {
    return new SeparatorRootState(opts);
  }
  opts;
  attachment;
  constructor(opts) {
    this.opts = opts;
    this.attachment = attachRef(opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: this.opts.decorative.current ? "none" : "separator",
    "aria-orientation": this.opts.orientation.current,
    "aria-hidden": boolToStrTrueOrUndef(this.opts.decorative.current),
    "data-orientation": this.opts.orientation.current,
    [separatorAttrs.root]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
function Separator$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      child,
      children,
      decorative = false,
      orientation = "horizontal",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const rootState = SeparatorRootState.create({
      ref: boxWith(() => ref, (v) => ref = v),
      id: boxWith(() => id),
      decorative: boxWith(() => decorative),
      orientation: boxWith(() => orientation)
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
    bind_props($$props, { ref });
  });
}
const SELECTION_KEYS = [ENTER, SPACE];
const FIRST_KEYS = [ARROW_DOWN, PAGE_UP, HOME];
const LAST_KEYS = [ARROW_UP, PAGE_DOWN, END];
const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS];
function isMouseEvent(event) {
  return event.pointerType === "mouse";
}
function focus(element, { select = false } = {}) {
  if (!element || !element.focus)
    return;
  const doc = getDocument(element);
  if (doc.activeElement === element)
    return;
  const previouslyFocusedElement = doc.activeElement;
  element.focus({ preventScroll: true });
  if (element !== previouslyFocusedElement && isSelectableInput(element) && select) {
    element.select();
  }
}
function focusFirst(candidates, { select = false } = {}, getActiveElement) {
  const previouslyFocusedElement = getActiveElement();
  for (const candidate of candidates) {
    focus(candidate, { select });
    if (getActiveElement() !== previouslyFocusedElement)
      return true;
  }
}
function getTabbableOptions() {
  return {
    getShadowRoot: true,
    displayCheck: (
      // JSDOM does not support the `tabbable` library. To solve this we can
      // check if `ResizeObserver` is a real function (not polyfilled), which
      // determines if the current environment is JSDOM-like.
      typeof ResizeObserver === "function" && ResizeObserver.toString().includes("[native code]") ? "full" : "none"
    )
  };
}
function getTabbableFrom(currentNode, direction) {
  if (!isTabbable(currentNode, getTabbableOptions())) {
    return getTabbableFromFocusable(currentNode, direction);
  }
  const doc = getDocument(currentNode);
  const allTabbable = tabbable(doc.body, getTabbableOptions());
  if (direction === "prev")
    allTabbable.reverse();
  const activeIndex = allTabbable.indexOf(currentNode);
  if (activeIndex === -1)
    return doc.body;
  const nextTabbableElements = allTabbable.slice(activeIndex + 1);
  return nextTabbableElements[0];
}
function getTabbableFromFocusable(currentNode, direction) {
  const doc = getDocument(currentNode);
  if (!isFocusable(currentNode, getTabbableOptions()))
    return doc.body;
  const allFocusable = focusable(doc.body, getTabbableOptions());
  if (direction === "prev")
    allFocusable.reverse();
  const activeIndex = allFocusable.indexOf(currentNode);
  if (activeIndex === -1)
    return doc.body;
  const nextFocusableElements = allFocusable.slice(activeIndex + 1);
  return nextFocusableElements.find((node) => isTabbable(node, getTabbableOptions())) ?? doc.body;
}
const MenuRootContext = new Context("Menu.Root");
const MenuMenuContext = new Context("Menu.Root | Menu.Sub");
const MenuContentContext = new Context("Menu.Content");
const MenuOpenEvent = new CustomEventDispatcher("bitsmenuopen", { bubbles: false, cancelable: true });
const menuAttrs = createBitsAttrs({
  component: "menu",
  parts: [
    "trigger",
    "content",
    "sub-trigger",
    "item",
    "group",
    "group-heading",
    "checkbox-group",
    "checkbox-item",
    "radio-group",
    "radio-item",
    "separator",
    "sub-content",
    "arrow"
  ]
});
class MenuRootState {
  static create(opts) {
    const root = new MenuRootState(opts);
    return MenuRootContext.set(root);
  }
  opts;
  isUsingKeyboard = new IsUsingKeyboard();
  ignoreCloseAutoFocus = false;
  isPointerInTransit = false;
  constructor(opts) {
    this.opts = opts;
  }
  getBitsAttr = (part) => {
    return menuAttrs.getAttr(part, this.opts.variant.current);
  };
}
class MenuMenuState {
  static create(opts, root) {
    return MenuMenuContext.set(new MenuMenuState(opts, root, null));
  }
  opts;
  root;
  parentMenu;
  contentId = boxWith(() => "");
  contentNode = null;
  triggerNode = null;
  constructor(opts, root, parentMenu) {
    this.opts = opts;
    this.root = root;
    this.parentMenu = parentMenu;
    new OpenChangeComplete({
      ref: boxWith(() => this.contentNode),
      open: this.opts.open,
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
    if (parentMenu) {
      watch(() => parentMenu.opts.open.current, () => {
        if (parentMenu.opts.open.current) return;
        this.opts.open.current = false;
      });
    }
  }
  toggleOpen() {
    this.opts.open.current = !this.opts.open.current;
  }
  onOpen() {
    this.opts.open.current = true;
  }
  onClose() {
    this.opts.open.current = false;
  }
}
class MenuContentState {
  static create(opts) {
    return MenuContentContext.set(new MenuContentState(opts, MenuMenuContext.get()));
  }
  opts;
  parentMenu;
  rovingFocusGroup;
  domContext;
  attachment;
  search = "";
  #timer = 0;
  #handleTypeaheadSearch;
  mounted = false;
  #isSub;
  constructor(opts, parentMenu) {
    this.opts = opts;
    this.parentMenu = parentMenu;
    this.domContext = new DOMContext(opts.ref);
    this.attachment = attachRef(this.opts.ref, (v) => {
      if (this.parentMenu.contentNode !== v) {
        this.parentMenu.contentNode = v;
      }
    });
    parentMenu.contentId = opts.id;
    this.#isSub = opts.isSub ?? false;
    this.onkeydown = this.onkeydown.bind(this);
    this.onblur = this.onblur.bind(this);
    this.onfocus = this.onfocus.bind(this);
    this.handleInteractOutside = this.handleInteractOutside.bind(this);
    new GraceArea({
      contentNode: () => this.parentMenu.contentNode,
      triggerNode: () => this.parentMenu.triggerNode,
      enabled: () => this.parentMenu.opts.open.current && Boolean(this.parentMenu.triggerNode?.hasAttribute(this.parentMenu.root.getBitsAttr("sub-trigger"))),
      onPointerExit: () => {
        this.parentMenu.opts.open.current = false;
      },
      setIsPointerInTransit: (value) => {
        this.parentMenu.root.isPointerInTransit = value;
      }
    });
    this.#handleTypeaheadSearch = new DOMTypeahead({
      getActiveElement: () => this.domContext.getActiveElement(),
      getWindow: () => this.domContext.getWindow()
    }).handleTypeaheadSearch;
    this.rovingFocusGroup = new RovingFocusGroup({
      rootNode: boxWith(() => this.parentMenu.contentNode),
      candidateAttr: this.parentMenu.root.getBitsAttr("item"),
      loop: this.opts.loop,
      orientation: boxWith(() => "vertical")
    });
    watch(() => this.parentMenu.contentNode, (contentNode) => {
      if (!contentNode) return;
      const handler = () => {
        afterTick(() => {
          if (!this.parentMenu.root.isUsingKeyboard.current) return;
          this.rovingFocusGroup.focusFirstCandidate();
        });
      };
      return MenuOpenEvent.listen(contentNode, handler);
    });
  }
  #getCandidateNodes() {
    const node = this.parentMenu.contentNode;
    if (!node) return [];
    const candidates = Array.from(node.querySelectorAll(`[${this.parentMenu.root.getBitsAttr("item")}]:not([data-disabled])`));
    return candidates;
  }
  #isPointerMovingToSubmenu() {
    return this.parentMenu.root.isPointerInTransit;
  }
  onCloseAutoFocus = (e) => {
    this.opts.onCloseAutoFocus.current?.(e);
    if (e.defaultPrevented || this.#isSub) return;
    if (this.parentMenu.triggerNode && isTabbable(this.parentMenu.triggerNode)) {
      this.parentMenu.triggerNode.focus();
    }
  };
  handleTabKeyDown(e) {
    let rootMenu = this.parentMenu;
    while (rootMenu.parentMenu !== null) {
      rootMenu = rootMenu.parentMenu;
    }
    if (!rootMenu.triggerNode) return;
    e.preventDefault();
    const nodeToFocus = getTabbableFrom(rootMenu.triggerNode, e.shiftKey ? "prev" : "next");
    if (nodeToFocus) {
      this.parentMenu.root.ignoreCloseAutoFocus = true;
      rootMenu.onClose();
      afterTick(() => {
        nodeToFocus.focus();
        afterTick(() => {
          this.parentMenu.root.ignoreCloseAutoFocus = false;
        });
      });
    } else {
      this.domContext.getDocument().body.focus();
    }
  }
  onkeydown(e) {
    if (e.defaultPrevented) return;
    if (e.key === TAB) {
      this.handleTabKeyDown(e);
      return;
    }
    const target = e.target;
    const currentTarget = e.currentTarget;
    if (!isHTMLElement(target) || !isHTMLElement(currentTarget)) return;
    const isKeydownInside = target.closest(`[${this.parentMenu.root.getBitsAttr("content")}]`)?.id === this.parentMenu.contentId.current;
    const isModifierKey = e.ctrlKey || e.altKey || e.metaKey;
    const isCharacterKey = e.key.length === 1;
    const kbdFocusedEl = this.rovingFocusGroup.handleKeydown(target, e);
    if (kbdFocusedEl) return;
    if (e.code === "Space") return;
    const candidateNodes = this.#getCandidateNodes();
    if (isKeydownInside) {
      if (!isModifierKey && isCharacterKey) {
        this.#handleTypeaheadSearch(e.key, candidateNodes);
      }
    }
    if (e.target?.id !== this.parentMenu.contentId.current) return;
    if (!FIRST_LAST_KEYS.includes(e.key)) return;
    e.preventDefault();
    if (LAST_KEYS.includes(e.key)) {
      candidateNodes.reverse();
    }
    focusFirst(candidateNodes, { select: false }, () => this.domContext.getActiveElement());
  }
  onblur(e) {
    if (!isElement(e.currentTarget)) return;
    if (!isElement(e.target)) return;
    if (!e.currentTarget.contains?.(e.target)) {
      this.domContext.getWindow().clearTimeout(this.#timer);
      this.search = "";
    }
  }
  onfocus(_) {
    if (!this.parentMenu.root.isUsingKeyboard.current) return;
    afterTick(() => this.rovingFocusGroup.focusFirstCandidate());
  }
  onItemEnter() {
    return this.#isPointerMovingToSubmenu();
  }
  onItemLeave(e) {
    if (e.currentTarget.hasAttribute(this.parentMenu.root.getBitsAttr("sub-trigger"))) return;
    if (this.#isPointerMovingToSubmenu() || this.parentMenu.root.isUsingKeyboard.current) return;
    const contentNode = this.parentMenu.contentNode;
    contentNode?.focus();
    this.rovingFocusGroup.setCurrentTabStopId("");
  }
  onTriggerLeave() {
    if (this.#isPointerMovingToSubmenu()) return true;
    return false;
  }
  onOpenAutoFocus = (e) => {
    if (e.defaultPrevented) return;
    e.preventDefault();
    const contentNode = this.parentMenu.contentNode;
    contentNode?.focus();
  };
  handleInteractOutside(e) {
    if (!isElementOrSVGElement(e.target)) return;
    const triggerId = this.parentMenu.triggerNode?.id;
    if (e.target.id === triggerId) {
      e.preventDefault();
      return;
    }
    if (e.target.closest(`#${triggerId}`)) {
      e.preventDefault();
    }
  }
  #snippetProps = derived(() => ({ open: this.parentMenu.opts.open.current }));
  get snippetProps() {
    return this.#snippetProps();
  }
  set snippetProps($$value) {
    return this.#snippetProps($$value);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "menu",
    "aria-orientation": "vertical",
    [this.parentMenu.root.getBitsAttr("content")]: "",
    "data-state": getDataOpenClosed(this.parentMenu.opts.open.current),
    onkeydown: this.onkeydown,
    onblur: this.onblur,
    onfocus: this.onfocus,
    dir: this.parentMenu.root.opts.dir.current,
    style: { pointerEvents: "auto" },
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  popperProps = { onCloseAutoFocus: (e) => this.onCloseAutoFocus(e) };
}
class MenuItemSharedState {
  opts;
  content;
  attachment;
  #isFocused = false;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
    this.attachment = attachRef(this.opts.ref);
    this.onpointermove = this.onpointermove.bind(this);
    this.onpointerleave = this.onpointerleave.bind(this);
    this.onfocus = this.onfocus.bind(this);
    this.onblur = this.onblur.bind(this);
  }
  onpointermove(e) {
    if (e.defaultPrevented) return;
    if (!isMouseEvent(e)) return;
    if (this.opts.disabled.current) {
      this.content.onItemLeave(e);
    } else {
      const defaultPrevented = this.content.onItemEnter();
      if (defaultPrevented) return;
      const item = e.currentTarget;
      if (!isHTMLElement(item)) return;
      item.focus();
    }
  }
  onpointerleave(e) {
    if (e.defaultPrevented) return;
    if (!isMouseEvent(e)) return;
    this.content.onItemLeave(e);
  }
  onfocus(e) {
    afterTick(() => {
      if (e.defaultPrevented || this.opts.disabled.current) return;
      this.#isFocused = true;
    });
  }
  onblur(e) {
    afterTick(() => {
      if (e.defaultPrevented) return;
      this.#isFocused = false;
    });
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    tabindex: -1,
    role: "menuitem",
    "aria-disabled": boolToStr(this.opts.disabled.current),
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    "data-highlighted": this.#isFocused ? "" : void 0,
    [this.content.parentMenu.root.getBitsAttr("item")]: "",
    //
    onpointermove: this.onpointermove,
    onpointerleave: this.onpointerleave,
    onfocus: this.onfocus,
    onblur: this.onblur,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuItemState {
  static create(opts) {
    const item = new MenuItemSharedState(opts, MenuContentContext.get());
    return new MenuItemState(opts, item);
  }
  opts;
  item;
  root;
  #isPointerDown = false;
  constructor(opts, item) {
    this.opts = opts;
    this.item = item;
    this.root = item.content.parentMenu.root;
    this.onkeydown = this.onkeydown.bind(this);
    this.onclick = this.onclick.bind(this);
    this.onpointerdown = this.onpointerdown.bind(this);
    this.onpointerup = this.onpointerup.bind(this);
  }
  #handleSelect() {
    if (this.item.opts.disabled.current) return;
    const selectEvent = new CustomEvent("menuitemselect", { bubbles: true, cancelable: true });
    this.opts.onSelect.current(selectEvent);
    if (selectEvent.defaultPrevented) {
      this.item.content.parentMenu.root.isUsingKeyboard.current = false;
      return;
    }
    if (this.opts.closeOnSelect.current) {
      this.item.content.parentMenu.root.opts.onClose();
    }
  }
  onkeydown(e) {
    const isTypingAhead = this.item.content.search !== "";
    if (this.item.opts.disabled.current || isTypingAhead && e.key === SPACE) return;
    if (SELECTION_KEYS.includes(e.key)) {
      if (!isHTMLElement(e.currentTarget)) return;
      e.currentTarget.click();
      e.preventDefault();
    }
  }
  onclick(_) {
    if (this.item.opts.disabled.current) return;
    this.#handleSelect();
  }
  onpointerup(e) {
    if (e.defaultPrevented) return;
    if (!this.#isPointerDown) {
      if (!isHTMLElement(e.currentTarget)) return;
      e.currentTarget?.click();
    }
  }
  onpointerdown(_) {
    this.#isPointerDown = true;
  }
  #props = derived(() => mergeProps(this.item.props, {
    onclick: this.onclick,
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
    onkeydown: this.onkeydown
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class MenuSeparatorState {
  static create(opts) {
    return new MenuSeparatorState(opts, MenuRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(this.opts.ref);
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    role: "group",
    [this.root.getBitsAttr("separator")]: "",
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class DropdownMenuTriggerState {
  static create(opts) {
    return new DropdownMenuTriggerState(opts, MenuMenuContext.get());
  }
  opts;
  parentMenu;
  attachment;
  constructor(opts, parentMenu) {
    this.opts = opts;
    this.parentMenu = parentMenu;
    this.attachment = attachRef(this.opts.ref, (v) => this.parentMenu.triggerNode = v);
  }
  onclick = (e) => {
    if (this.opts.disabled.current || e.detail !== 0) return;
    this.parentMenu.toggleOpen();
    e.preventDefault();
  };
  onpointerdown = (e) => {
    if (this.opts.disabled.current) return;
    if (e.pointerType === "touch") return e.preventDefault();
    if (e.button === 0 && e.ctrlKey === false) {
      this.parentMenu.toggleOpen();
      if (!this.parentMenu.opts.open.current) e.preventDefault();
    }
  };
  onpointerup = (e) => {
    if (this.opts.disabled.current) return;
    if (e.pointerType === "touch") {
      e.preventDefault();
      this.parentMenu.toggleOpen();
    }
  };
  onkeydown = (e) => {
    if (this.opts.disabled.current) return;
    if (e.key === SPACE || e.key === ENTER) {
      this.parentMenu.toggleOpen();
      e.preventDefault();
      return;
    }
    if (e.key === ARROW_DOWN) {
      this.parentMenu.onOpen();
      e.preventDefault();
    }
  };
  #ariaControls = derived(() => {
    if (this.parentMenu.opts.open.current && this.parentMenu.contentId.current) return this.parentMenu.contentId.current;
    return void 0;
  });
  #props = derived(() => ({
    id: this.opts.id.current,
    disabled: this.opts.disabled.current,
    "aria-haspopup": "menu",
    "aria-expanded": boolToStr(this.parentMenu.opts.open.current),
    "aria-controls": this.#ariaControls(),
    "data-disabled": boolToEmptyStrOrUndef(this.opts.disabled.current),
    "data-state": getDataOpenClosed(this.parentMenu.opts.open.current),
    [this.parentMenu.root.getBitsAttr("trigger")]: "",
    //
    onclick: this.onclick,
    onpointerdown: this.onpointerdown,
    onpointerup: this.onpointerup,
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
function Menu_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      child,
      children,
      ref = null,
      id = createId(uid),
      disabled = false,
      onSelect = noop,
      closeOnSelect = true,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const itemState = MenuItemState.create({
      id: boxWith(() => id),
      disabled: boxWith(() => disabled),
      onSelect: boxWith(() => onSelect),
      ref: boxWith(() => ref, (v) => ref = v),
      closeOnSelect: boxWith(() => closeOnSelect)
    });
    const mergedProps = mergeProps(restProps, itemState.props);
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
function Menu_separator($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      ref = null,
      id = createId(uid),
      child,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const separatorState = MenuSeparatorState.create({
      id: boxWith(() => id),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, separatorState.props);
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
function Menu($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      open = false,
      dir = "ltr",
      onOpenChange = noop,
      onOpenChangeComplete = noop,
      _internal_variant: variant = "dropdown-menu",
      children
    } = $$props;
    const root = MenuRootState.create({
      variant: boxWith(() => variant),
      dir: boxWith(() => dir),
      onClose: () => {
        open = false;
        onOpenChange(false);
      }
    });
    MenuMenuState.create(
      {
        open: boxWith(() => open, (v) => {
          open = v;
          onOpenChange(v);
        }),
        onOpenChangeComplete: boxWith(() => onOpenChangeComplete)
      },
      root
    );
    Floating_layer($$renderer2, {
      children: ($$renderer3) => {
        children?.($$renderer3);
        $$renderer3.push(`<!---->`);
      }
    });
    bind_props($$props, { open });
  });
}
function Dropdown_menu_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      child,
      children,
      ref = null,
      loop = true,
      onInteractOutside = noop,
      onEscapeKeydown = noop,
      onCloseAutoFocus = noop,
      forceMount = false,
      trapFocus = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = MenuContentState.create({
      id: boxWith(() => id),
      loop: boxWith(() => loop),
      ref: boxWith(() => ref, (v) => ref = v),
      onCloseAutoFocus: boxWith(() => onCloseAutoFocus)
    });
    const mergedProps = mergeProps(restProps, contentState.props);
    function handleInteractOutside(e) {
      contentState.handleInteractOutside(e);
      if (e.defaultPrevented) return;
      onInteractOutside(e);
      if (e.defaultPrevented) return;
      if (e.target && e.target instanceof Element) {
        const subContentSelector = `[${contentState.parentMenu.root.getBitsAttr("sub-content")}]`;
        if (e.target.closest(subContentSelector)) return;
      }
      contentState.parentMenu.onClose();
    }
    function handleEscapeKeydown(e) {
      onEscapeKeydown(e);
      if (e.defaultPrevented) return;
      contentState.parentMenu.onClose();
    }
    if (forceMount) {
      $$renderer2.push("<!--[-->");
      {
        let popper = function($$renderer3, { props, wrapperProps }) {
          const finalProps = mergeProps(props, { style: getFloatingContentCSSVars("dropdown-menu") });
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
            enabled: contentState.parentMenu.opts.open.current,
            onInteractOutside: handleInteractOutside,
            onEscapeKeydown: handleEscapeKeydown,
            trapFocus,
            loop,
            forceMount: true,
            id,
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
            const finalProps = mergeProps(props, { style: getFloatingContentCSSVars("dropdown-menu") });
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
              open: contentState.parentMenu.opts.open.current,
              onInteractOutside: handleInteractOutside,
              onEscapeKeydown: handleEscapeKeydown,
              trapFocus,
              loop,
              forceMount: false,
              id,
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
function Menu_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      ref = null,
      child,
      children,
      disabled = false,
      type = "button",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const triggerState = DropdownMenuTriggerState.create({
      id: boxWith(() => id),
      disabled: boxWith(() => disabled ?? false),
      ref: boxWith(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, triggerState.props, { type });
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
    bind_props($$props, { ref });
  });
}
let isUsingKeyboard = false;
class IsUsingKeyboard {
  static _refs = 0;
  // Reference counting to avoid multiple listeners.
  static _cleanup;
  constructor() {
  }
  get current() {
    return isUsingKeyboard;
  }
  set current(value) {
    isUsingKeyboard = value;
  }
}
function Chevron_right($$renderer, $$props) {
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
  const iconNode = [["path", { "d": "m9 18 6-6-6-6" }]];
  Icon($$renderer, spread_props([
    { name: "chevron-right" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronRight
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtOSAxOCA2LTYtNi02IiAvPgo8L3N2Zz4K) - https://lucide.dev/icons/chevron-right
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
function Chevrons_up_down($$renderer, $$props) {
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
    ["path", { "d": "m7 15 5 5 5-5" }],
    ["path", { "d": "m7 9 5-5 5 5" }]
  ];
  Icon($$renderer, spread_props([
    { name: "chevrons-up-down" },
    $$sanitized_props,
    {
      /**
       * @component @name ChevronsUpDown
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtNyAxNSA1IDUgNS01IiAvPgogIDxwYXRoIGQ9Im03IDkgNS01IDUgNSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/chevrons-up-down
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
function House($$renderer, $$props) {
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
      { "d": "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" }
    ],
    [
      "path",
      {
        "d": "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "house" },
    $$sanitized_props,
    {
      /**
       * @component @name House
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMTUgMjF2LThhMSAxIDAgMCAwLTEtMWgtNGExIDEgMCAwIDAtMSAxdjgiIC8+CiAgPHBhdGggZD0iTTMgMTBhMiAyIDAgMCAxIC43MDktMS41MjhsNy02YTIgMiAwIDAgMSAyLjU4MiAwbDcgNkEyIDIgMCAwIDEgMjEgMTB2OWEyIDIgMCAwIDEtMiAySDVhMiAyIDAgMCAxLTItMnoiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/house
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
function Log_out($$renderer, $$props) {
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
    ["path", { "d": "m16 17 5-5-5-5" }],
    ["path", { "d": "M21 12H9" }],
    ["path", { "d": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }]
  ];
  Icon($$renderer, spread_props([
    { name: "log-out" },
    $$sanitized_props,
    {
      /**
       * @component @name LogOut
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJtMTYgMTcgNS01LTUtNSIgLz4KICA8cGF0aCBkPSJNMjEgMTJIOSIgLz4KICA8cGF0aCBkPSJNOSAyMUg1YTIgMiAwIDAgMS0yLTJWNWEyIDIgMCAwIDEgMi0yaDQiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/log-out
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
function Moon($$renderer, $$props) {
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
        "d": "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"
      }
    ]
  ];
  Icon($$renderer, spread_props([
    { name: "moon" },
    $$sanitized_props,
    {
      /**
       * @component @name Moon
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNMjAuOTg1IDEyLjQ4NmE5IDkgMCAxIDEtOS40NzMtOS40NzJjLjQwNS0uMDIyLjYxNy40Ni40MDIuODAzYTYgNiAwIDAgMCA4LjI2OCA4LjI2OGMuMzQ0LS4yMTUuODI1LS4wMDQuODAzLjQwMSIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/moon
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
function Settings($$renderer, $$props) {
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
        "d": "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
      }
    ],
    ["circle", { "cx": "12", "cy": "12", "r": "3" }]
  ];
  Icon($$renderer, spread_props([
    { name: "settings" },
    $$sanitized_props,
    {
      /**
       * @component @name Settings
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cGF0aCBkPSJNOS42NzEgNC4xMzZhMi4zNCAyLjM0IDAgMCAxIDQuNjU5IDAgMi4zNCAyLjM0IDAgMCAwIDMuMzE5IDEuOTE1IDIuMzQgMi4zNCAwIDAgMSAyLjMzIDQuMDMzIDIuMzQgMi4zNCAwIDAgMCAwIDMuODMxIDIuMzQgMi4zNCAwIDAgMS0yLjMzIDQuMDMzIDIuMzQgMi4zNCAwIDAgMC0zLjMxOSAxLjkxNSAyLjM0IDIuMzQgMCAwIDEtNC42NTkgMCAyLjM0IDIuMzQgMCAwIDAtMy4zMi0xLjkxNSAyLjM0IDIuMzQgMCAwIDEtMi4zMy00LjAzMyAyLjM0IDIuMzQgMCAwIDAgMC0zLjgzMUEyLjM0IDIuMzQgMCAwIDEgNi4zNSA2LjA1MWEyLjM0IDIuMzQgMCAwIDAgMy4zMTktMS45MTUiIC8+CiAgPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMyIgLz4KPC9zdmc+Cg==) - https://lucide.dev/icons/settings
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
function Sun($$renderer, $$props) {
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
    ["circle", { "cx": "12", "cy": "12", "r": "4" }],
    ["path", { "d": "M12 2v2" }],
    ["path", { "d": "M12 20v2" }],
    ["path", { "d": "m4.93 4.93 1.41 1.41" }],
    ["path", { "d": "m17.66 17.66 1.41 1.41" }],
    ["path", { "d": "M2 12h2" }],
    ["path", { "d": "M20 12h2" }],
    ["path", { "d": "m6.34 17.66-1.41 1.41" }],
    ["path", { "d": "m19.07 4.93-1.41 1.41" }]
  ];
  Icon($$renderer, spread_props([
    { name: "sun" },
    $$sanitized_props,
    {
      /**
       * @component @name Sun
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI0IiAvPgogIDxwYXRoIGQ9Ik0xMiAydjIiIC8+CiAgPHBhdGggZD0iTTEyIDIwdjIiIC8+CiAgPHBhdGggZD0ibTQuOTMgNC45MyAxLjQxIDEuNDEiIC8+CiAgPHBhdGggZD0ibTE3LjY2IDE3LjY2IDEuNDEgMS40MSIgLz4KICA8cGF0aCBkPSJNMiAxMmgyIiAvPgogIDxwYXRoIGQ9Ik0yMCAxMmgyIiAvPgogIDxwYXRoIGQ9Im02LjM0IDE3LjY2LTEuNDEgMS40MSIgLz4KICA8cGF0aCBkPSJtMTkuMDcgNC45My0xLjQxIDEuNDEiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/sun
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
function Dropdown_menu_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      sideOffset = 4,
      portalProps,
      class: className,
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
            Dropdown_menu_content$1($$renderer4, spread_props([
              {
                "data-slot": "dropdown-menu-content",
                sideOffset,
                class: cn("bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 max-h-(--bits-dropdown-menu-content-available-height) origin-(--bits-dropdown-menu-content-transform-origin) z-50 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border p-1 shadow-md outline-none", className)
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
function Dropdown_menu_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      inset,
      variant = "default",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Menu_item($$renderer3, spread_props([
        {
          "data-slot": "dropdown-menu-item",
          "data-inset": inset,
          "data-variant": variant,
          class: cn("data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)
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
function Dropdown_menu_label($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      inset,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "dropdown-menu-label",
      "data-inset": inset,
      class: clsx(cn("px-2 py-1.5 text-sm font-semibold data-[inset]:pl-8", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Dropdown_menu_separator($$renderer, $$props) {
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
      Menu_separator($$renderer3, spread_props([
        {
          "data-slot": "dropdown-menu-separator",
          class: cn("bg-border -mx-1 my-1 h-px", className)
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
function Dropdown_menu_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Menu_trigger($$renderer3, spread_props([
        { "data-slot": "dropdown-menu-trigger" },
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
const Root$1 = Menu;
function Panel_left($$renderer, $$props) {
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
    const iconNode = [
      [
        "rect",
        { "width": "18", "height": "18", "x": "3", "y": "3", "rx": "2" }
      ],
      ["path", { "d": "M9 3v18" }]
    ];
    Icon$1($$renderer2, spread_props([
      { name: "panel-left" },
      /**
       * @component @name PanelLeft
       * @description Lucide SVG icon component, renders SVG Element with children.
       *
       * @preview ![img](data:image/svg+xml;base64,PHN2ZyAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogIHdpZHRoPSIyNCIKICBoZWlnaHQ9IjI0IgogIHZpZXdCb3g9IjAgMCAyNCAyNCIKICBmaWxsPSJub25lIgogIHN0cm9rZT0iIzAwMCIgc3R5bGU9ImJhY2tncm91bmQtY29sb3I6ICNmZmY7IGJvcmRlci1yYWRpdXM6IDJweCIKICBzdHJva2Utd2lkdGg9IjIiCiAgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIgogIHN0cm9rZS1saW5lam9pbj0icm91bmQiCj4KICA8cmVjdCB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHg9IjMiIHk9IjMiIHJ4PSIyIiAvPgogIDxwYXRoIGQ9Ik05IDN2MTgiIC8+Cjwvc3ZnPgo=) - https://lucide.dev/icons/panel-left
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
function Sidebar_content($$renderer, $$props) {
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
      "data-slot": "sidebar-content",
      "data-sidebar": "content",
      class: clsx(cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_footer($$renderer, $$props) {
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
      "data-slot": "sidebar-footer",
      "data-sidebar": "footer",
      class: clsx(cn("flex flex-col gap-2 p-2", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_group_label($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      children,
      child,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const mergedProps = {
      class: cn("text-sidebar-foreground/70 ring-sidebar-ring outline-hidden flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
      "data-slot": "sidebar-group-label",
      "data-sidebar": "group-label",
      ...restProps
    };
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
function Sidebar_group($$renderer, $$props) {
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
      "data-slot": "sidebar-group",
      "data-sidebar": "group",
      class: clsx(cn("relative flex w-full min-w-0 flex-col p-2", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_header($$renderer, $$props) {
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
      "data-slot": "sidebar-header",
      "data-sidebar": "header",
      class: clsx(cn("flex flex-col gap-2 p-2", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_inset($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<main${attributes({
      "data-slot": "sidebar-inset",
      class: clsx(cn("bg-background relative flex w-full flex-1 flex-col", "md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></main>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_menu_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<li${attributes({
      "data-slot": "sidebar-menu-item",
      "data-sidebar": "menu-item",
      class: clsx(cn("group/menu-item relative", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></li>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_menu_sub_button($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      children,
      child,
      class: className,
      size = "md",
      isActive = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const mergedProps = {
      class: cn("text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground outline-hidden flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground", size === "sm" && "text-xs", size === "md" && "text-sm", "group-data-[collapsible=icon]:hidden", className),
      "data-slot": "sidebar-menu-sub-button",
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      "data-active": isActive,
      ...restProps
    };
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<a${attributes({ ...mergedProps })}>`);
      children?.($$renderer2);
      $$renderer2.push(`<!----></a>`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Sidebar_menu_sub_item($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      children,
      class: className,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<li${attributes({
      "data-slot": "sidebar-menu-sub-item",
      "data-sidebar": "menu-sub-item",
      class: clsx(cn("group/menu-sub-item relative", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></li>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_menu_sub($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<ul${attributes({
      "data-slot": "sidebar-menu-sub",
      "data-sidebar": "menu-sub",
      class: clsx(cn("border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></ul>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_menu($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<ul${attributes({
      "data-slot": "sidebar-menu",
      "data-sidebar": "menu",
      class: clsx(cn("flex w-full min-w-0 flex-col gap-1", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></ul>`);
    bind_props($$props, { ref });
  });
}
function Sidebar_provider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      open = true,
      onOpenChange = () => {
      },
      class: className,
      style,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    setSidebar({
      open: () => open,
      setOpen: (value) => {
        open = value;
        onOpenChange(value);
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      }
    });
    $$renderer2.push(`<!---->`);
    Provider($$renderer2, {
      delayDuration: 0,
      children: ($$renderer3) => {
        $$renderer3.push(`<div${attributes({
          "data-slot": "sidebar-wrapper",
          style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH)}; --sidebar-width-icon: ${stringify(SIDEBAR_WIDTH_ICON)}; ${stringify(style)}`,
          class: clsx(cn("group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full", className)),
          ...restProps
        })}>`);
        children?.($$renderer3);
        $$renderer3.push(`<!----></div>`);
      }
    });
    $$renderer2.push(`<!---->`);
    bind_props($$props, { ref, open });
  });
}
function Sidebar_rail($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    useSidebar();
    $$renderer2.push(`<button${attributes({
      "data-sidebar": "rail",
      "data-slot": "sidebar-rail",
      "aria-label": "Toggle Sidebar",
      tabindex: -1,
      title: "Toggle Sidebar",
      class: clsx(cn("hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-[calc(1/2*100%-1px)] after:w-[2px] group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex", "in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></button>`);
    bind_props($$props, { ref });
  });
}
function Separator($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      "data-slot": dataSlot = "separator",
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Separator$1($$renderer3, spread_props([
        {
          "data-slot": dataSlot,
          class: cn("bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px", className)
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
function Sidebar_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      onclick,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const sidebar = useSidebar();
    Button($$renderer2, spread_props([
      {
        "data-sidebar": "trigger",
        "data-slot": "sidebar-trigger",
        variant: "ghost",
        size: "icon",
        class: cn("size-7", className),
        type: "button",
        onclick: (e) => {
          onclick?.(e);
          sidebar.toggle();
        }
      },
      restProps,
      {
        children: ($$renderer3) => {
          Panel_left($$renderer3, {});
          $$renderer3.push(`<!----> <span class="sr-only">Toggle Sidebar</span>`);
        },
        $$slots: { default: true }
      }
    ]));
    bind_props($$props, { ref });
  });
}
function Sheet_header($$renderer, $$props) {
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
      "data-slot": "sheet-header",
      class: clsx(cn("flex flex-col gap-1.5 p-4", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
function Sheet_title($$renderer, $$props) {
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
          "data-slot": "sheet-title",
          class: cn("text-foreground font-semibold", className)
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
function Sheet_description($$renderer, $$props) {
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
          "data-slot": "sheet-description",
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
const Root = Dialog;
function Sidebar$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      side = "left",
      variant = "sidebar",
      collapsible = "offcanvas",
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const sidebar = useSidebar();
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      if (collapsible === "none") {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<div${attributes({
          class: clsx(cn("bg-sidebar text-sidebar-foreground w-(--sidebar-width) flex h-full flex-col", className)),
          ...restProps
        })}>`);
        children?.($$renderer3);
        $$renderer3.push(`<!----></div>`);
      } else {
        $$renderer3.push("<!--[!-->");
        if (sidebar.isMobile) {
          $$renderer3.push("<!--[-->");
          var bind_get = () => sidebar.openMobile;
          var bind_set = (v) => sidebar.setOpenMobile(v);
          $$renderer3.push(`<!---->`);
          Root($$renderer3, spread_props([
            {
              get open() {
                return bind_get();
              },
              set open($$value) {
                bind_set($$value);
              }
            },
            restProps,
            {
              children: ($$renderer4) => {
                $$renderer4.push(`<!---->`);
                Sheet_content($$renderer4, {
                  "data-sidebar": "sidebar",
                  "data-slot": "sidebar",
                  "data-mobile": "true",
                  class: "bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden",
                  style: `--sidebar-width: ${stringify(SIDEBAR_WIDTH_MOBILE)};`,
                  side,
                  children: ($$renderer5) => {
                    $$renderer5.push(`<!---->`);
                    Sheet_header($$renderer5, {
                      class: "sr-only",
                      children: ($$renderer6) => {
                        $$renderer6.push(`<!---->`);
                        Sheet_title($$renderer6, {
                          children: ($$renderer7) => {
                            $$renderer7.push(`<!---->Sidebar`);
                          },
                          $$slots: { default: true }
                        });
                        $$renderer6.push(`<!----> <!---->`);
                        Sheet_description($$renderer6, {
                          children: ($$renderer7) => {
                            $$renderer7.push(`<!---->Displays the mobile sidebar.`);
                          },
                          $$slots: { default: true }
                        });
                        $$renderer6.push(`<!---->`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer5.push(`<!----> <div class="flex h-full w-full flex-col">`);
                    children?.($$renderer5);
                    $$renderer5.push(`<!----></div>`);
                  },
                  $$slots: { default: true }
                });
                $$renderer4.push(`<!---->`);
              },
              $$slots: { default: true }
            }
          ]));
          $$renderer3.push(`<!---->`);
        } else {
          $$renderer3.push("<!--[!-->");
          $$renderer3.push(`<div class="text-sidebar-foreground group peer hidden md:block"${attr("data-state", sidebar.state)}${attr("data-collapsible", sidebar.state === "collapsed" ? collapsible : "")}${attr("data-variant", variant)}${attr("data-side", side)} data-slot="sidebar"><div data-slot="sidebar-gap"${attr_class(clsx(cn("w-(--sidebar-width) relative bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)")))}></div> <div${attributes({
            "data-slot": "sidebar-container",
            class: clsx(cn(
              "w-(--sidebar-width) fixed inset-y-0 z-10 hidden h-svh transition-[left,right,width] duration-200 ease-linear md:flex",
              side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
              variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
              className
            )),
            ...restProps
          })}><div data-sidebar="sidebar" data-slot="sidebar-inner" class="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm">`);
          children?.($$renderer3);
          $$renderer3.push(`<!----></div></div></div>`);
        }
        $$renderer3.push(`<!--]-->`);
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
function toggleMode() {
  userPrefersMode.current = derivedMode.current === "dark" ? "light" : "dark";
}
function defineConfig(config) {
  return config;
}
function setInitialMode({ defaultMode = "system", themeColors: themeColors2, darkClassNames: darkClassNames2 = ["dark"], lightClassNames: lightClassNames2 = [], defaultTheme = "", modeStorageKey: modeStorageKey2 = "mode-watcher-mode", themeStorageKey: themeStorageKey2 = "mode-watcher-theme" }) {
  const rootEl = document.documentElement;
  const mode = localStorage.getItem(modeStorageKey2) ?? defaultMode;
  const theme = localStorage.getItem(themeStorageKey2) ?? defaultTheme;
  const light = mode === "light" || mode === "system" && window.matchMedia("(prefers-color-scheme: light)").matches;
  if (light) {
    if (darkClassNames2.length)
      rootEl.classList.remove(...darkClassNames2.filter(Boolean));
    if (lightClassNames2.length)
      rootEl.classList.add(...lightClassNames2.filter(Boolean));
  } else {
    if (lightClassNames2.length)
      rootEl.classList.remove(...lightClassNames2.filter(Boolean));
    if (darkClassNames2.length)
      rootEl.classList.add(...darkClassNames2.filter(Boolean));
  }
  rootEl.style.colorScheme = light ? "light" : "dark";
  if (themeColors2) {
    const themeMetaEl = document.querySelector('meta[name="theme-color"]');
    if (themeMetaEl) {
      themeMetaEl.setAttribute("content", mode === "light" ? themeColors2.light : themeColors2.dark);
    }
  }
  if (theme) {
    rootEl.setAttribute("data-theme", theme);
    localStorage.setItem(themeStorageKey2, theme);
  }
  localStorage.setItem(modeStorageKey2, mode);
}
function Mode_watcher_lite($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { themeColors: themeColors2 } = $$props;
    if (themeColors2) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<meta name="theme-color"${attr("content", themeColors2.dark)}/>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function Mode_watcher_full($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { trueNonce = "", initConfig, themeColors: themeColors2 } = $$props;
    head($$renderer2, ($$renderer3) => {
      if (themeColors2) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta name="theme-color"${attr("content", themeColors2.dark)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> ${html(`<script${trueNonce ? ` nonce=${trueNonce}` : ""}>(` + setInitialMode.toString() + `)(` + JSON.stringify(initConfig) + `);<\/script>`)}`);
    });
  });
}
function Mode_watcher($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      defaultMode = "system",
      themeColors: themeColorsProp,
      disableTransitions: disableTransitionsProp = true,
      darkClassNames: darkClassNamesProp = ["dark"],
      lightClassNames: lightClassNamesProp = [],
      defaultTheme = "",
      nonce = "",
      themeStorageKey: themeStorageKeyProp = "mode-watcher-theme",
      modeStorageKey: modeStorageKeyProp = "mode-watcher-mode",
      disableHeadScriptInjection = false,
      synchronousModeChanges: synchronousModeChangesProp = false
    } = $$props;
    modeStorageKey.current = modeStorageKeyProp;
    themeStorageKey.current = themeStorageKeyProp;
    darkClassNames.current = darkClassNamesProp;
    lightClassNames.current = lightClassNamesProp;
    disableTransitions.current = disableTransitionsProp;
    themeColors.current = themeColorsProp;
    synchronousModeChanges.current = synchronousModeChangesProp;
    const initConfig = defineConfig({
      defaultMode,
      themeColors: themeColorsProp,
      darkClassNames: darkClassNamesProp,
      lightClassNames: lightClassNamesProp,
      defaultTheme,
      modeStorageKey: modeStorageKeyProp,
      themeStorageKey: themeStorageKeyProp
    });
    const trueNonce = typeof window === "undefined" ? nonce : "";
    if (disableHeadScriptInjection) {
      $$renderer2.push("<!--[-->");
      Mode_watcher_lite($$renderer2, { themeColors: themeColors.current });
    } else {
      $$renderer2.push("<!--[!-->");
      Mode_watcher_full($$renderer2, { trueNonce, initConfig, themeColors: themeColors.current });
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function OrganizationSwitcher($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      organizations: orgs = [],
      activeOrganization,
      canCreateOrganization = false,
      onOpenChange
    } = $$props;
    const sidebar = useSidebar();
    let isSwitching = false;
    async function handleSwitchOrganization(org) {
      if (org.id === activeOrganization?.id) return;
      isSwitching = true;
      try {
        await organizations.switch({ organizationId: org.id });
        const params = new SvelteURLSearchParams();
        params.set("orgId", org.id);
        const currentDocType = page.url.searchParams.get("docType");
        if (currentDocType) {
          params.set("docType", currentDocType);
        }
        await goto(`${page.url.pathname}?${params.toString()}`, { replaceState: false });
        await invalidateAll();
      } catch (error) {
        console.error("Failed to switch organization:", error);
      } finally {
        isSwitching = false;
      }
    }
    function getOrganizationInitials(name) {
      return name.split(" ").map((word) => word[0]).join("").toUpperCase().slice(0, 2);
    }
    function getRoleLabel(role) {
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
    Sidebar_menu($$renderer2, {
      children: ($$renderer3) => {
        Sidebar_menu_item($$renderer3, {
          children: ($$renderer4) => {
            Root$1($$renderer4, {
              onOpenChange,
              children: ($$renderer5) => {
                {
                  let child = function($$renderer6, { props }) {
                    Sidebar_menu_button($$renderer6, spread_props([
                      props,
                      {
                        size: "lg",
                        class: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                        disabled: isSwitching,
                        children: ($$renderer7) => {
                          if (activeOrganization) {
                            $$renderer7.push("<!--[-->");
                            $$renderer7.push(`<div class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold">${escape_html(getOrganizationInitials(activeOrganization.name))}</div> <div class="grid flex-1 text-left text-sm leading-tight"><span class="truncate font-medium">${escape_html(activeOrganization.name)}</span> <span class="text-muted-foreground truncate text-xs">${escape_html(getRoleLabel(activeOrganization.role))}</span></div>`);
                          } else {
                            $$renderer7.push("<!--[!-->");
                            $$renderer7.push(`<div class="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg"><span class="text-muted-foreground text-xs">?</span></div> <span class="text-muted-foreground">No organization</span>`);
                          }
                          $$renderer7.push(`<!--]--> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto"><path d="m7 15 5 5 5-5"></path><path d="m7 9 5-5 5 5"></path></svg>`);
                        },
                        $$slots: { default: true }
                      }
                    ]));
                  };
                  Dropdown_menu_trigger($$renderer5, { child, $$slots: { child: true } });
                }
                $$renderer5.push(`<!----> `);
                Dropdown_menu_content($$renderer5, {
                  class: "w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg",
                  align: "start",
                  side: sidebar.isMobile ? "bottom" : "right",
                  sideOffset: 4,
                  children: ($$renderer6) => {
                    Dropdown_menu_label($$renderer6, {
                      class: "text-muted-foreground text-xs",
                      children: ($$renderer7) => {
                        $$renderer7.push(`<!---->Organizations`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer6.push(`<!----> <!--[-->`);
                    const each_array = ensure_array_like(orgs);
                    for (let index = 0, $$length = each_array.length; index < $$length; index++) {
                      let org = each_array[index];
                      Dropdown_menu_item($$renderer6, {
                        onSelect: () => handleSwitchOrganization(org),
                        class: "gap-2 p-2",
                        disabled: isSwitching || org.id === activeOrganization?.id,
                        children: ($$renderer7) => {
                          $$renderer7.push(`<div class="flex size-6 items-center justify-center rounded-md border text-xs font-semibold">${escape_html(getOrganizationInitials(org.name))}</div> <div class="flex flex-1 flex-col"><span class="text-sm">${escape_html(org.name)}</span> <span class="text-muted-foreground text-xs">${escape_html(getRoleLabel(org.role))}</span></div> `);
                          if (org.id === activeOrganization?.id) {
                            $$renderer7.push("<!--[-->");
                            $$renderer7.push(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M20 6 9 17l-5-5"></path></svg>`);
                          } else {
                            $$renderer7.push("<!--[!-->");
                          }
                          $$renderer7.push(`<!--]-->`);
                        },
                        $$slots: { default: true }
                      });
                    }
                    $$renderer6.push(`<!--]--> `);
                    Dropdown_menu_separator($$renderer6, {});
                    $$renderer6.push(`<!----> `);
                    Dropdown_menu_item($$renderer6, {
                      onSelect: () => goto(),
                      class: "gap-2 p-2",
                      children: ($$renderer7) => {
                        $$renderer7.push(`<button class="text-muted-foreground font-medium">View all organizations</button>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer6.push(`<!----> `);
                    if (canCreateOrganization) {
                      $$renderer6.push("<!--[-->");
                      Dropdown_menu_separator($$renderer6, {});
                      $$renderer6.push(`<!----> `);
                      Dropdown_menu_item($$renderer6, {
                        class: "gap-2 p-2",
                        children: ($$renderer7) => {
                          $$renderer7.push(`<div class="flex size-6 items-center justify-center rounded-md border bg-transparent"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg></div> <button class="text-muted-foreground font-medium">Create organization</button>`);
                        },
                        $$slots: { default: true }
                      });
                      $$renderer6.push(`<!---->`);
                    } else {
                      $$renderer6.push("<!--[!-->");
                    }
                    $$renderer6.push(`<!--]-->`);
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
      },
      $$slots: { default: true }
    });
  });
}
function Collapsible($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, open = false, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Collapsible$1($$renderer3, spread_props([
        { "data-slot": "collapsible" },
        restProps,
        {
          get ref() {
            return ref;
          },
          set ref($$value) {
            ref = $$value;
            $$settled = false;
          },
          get open() {
            return open;
          },
          set open($$value) {
            open = $$value;
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
    bind_props($$props, { ref, open });
  });
}
function Collapsible_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Collapsible_trigger$1($$renderer3, spread_props([
        { "data-slot": "collapsible-trigger" },
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
function Collapsible_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Collapsible_content$1($$renderer3, spread_props([
        { "data-slot": "collapsible-content" },
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
function NavMain($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { items, label = "Content" } = $$props;
    let currentPath = page.url.pathname;
    Sidebar_group($$renderer2, {
      children: ($$renderer3) => {
        Sidebar_group_label($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!---->${escape_html(label)}`);
          },
          $$slots: { default: true }
        });
        $$renderer3.push(`<!----> `);
        Sidebar_menu($$renderer3, {
          children: ($$renderer4) => {
            $$renderer4.push(`<!--[-->`);
            const each_array = ensure_array_like(items);
            for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
              let item = each_array[$$index_1];
              if (item.items && item.items.length > 0) {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<!---->`);
                {
                  let child = function($$renderer5, { props }) {
                    Sidebar_menu_item($$renderer5, spread_props([
                      props,
                      {
                        children: ($$renderer6) => {
                          $$renderer6.push(`<!---->`);
                          {
                            let child2 = function($$renderer7, { props: props2 }) {
                              Sidebar_menu_button($$renderer7, spread_props([
                                props2,
                                {
                                  tooltipContent: item.title,
                                  children: ($$renderer8) => {
                                    if (item.icon) {
                                      $$renderer8.push("<!--[-->");
                                      const Icon2 = item.icon;
                                      $$renderer8.push(`<!---->`);
                                      Icon2($$renderer8, { class: "h-4 w-4" });
                                      $$renderer8.push(`<!---->`);
                                    } else {
                                      $$renderer8.push("<!--[!-->");
                                    }
                                    $$renderer8.push(`<!--]--> <span>${escape_html(item.title)}</span> `);
                                    Chevron_right($$renderer8, {
                                      class: "ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                                    });
                                    $$renderer8.push(`<!---->`);
                                  },
                                  $$slots: { default: true }
                                }
                              ]));
                            };
                            Collapsible_trigger($$renderer6, { child: child2, $$slots: { child: true } });
                          }
                          $$renderer6.push(`<!----> <!---->`);
                          Collapsible_content($$renderer6, {
                            children: ($$renderer7) => {
                              Sidebar_menu_sub($$renderer7, {
                                children: ($$renderer8) => {
                                  $$renderer8.push(`<!--[-->`);
                                  const each_array_1 = ensure_array_like(item.items);
                                  for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
                                    let subItem = each_array_1[$$index];
                                    Sidebar_menu_sub_item($$renderer8, {
                                      children: ($$renderer9) => {
                                        {
                                          let child2 = function($$renderer10, { props: props2 }) {
                                            $$renderer10.push(`<a${attributes({ href: subItem.url, ...props2 })}><span>${escape_html(subItem.title)}</span></a>`);
                                          };
                                          Sidebar_menu_sub_button($$renderer9, { child: child2, $$slots: { child: true } });
                                        }
                                      },
                                      $$slots: { default: true }
                                    });
                                  }
                                  $$renderer8.push(`<!--]-->`);
                                },
                                $$slots: { default: true }
                              });
                            },
                            $$slots: { default: true }
                          });
                          $$renderer6.push(`<!---->`);
                        },
                        $$slots: { default: true }
                      }
                    ]));
                  };
                  Collapsible($$renderer4, {
                    open: item.isActive,
                    class: "group/collapsible",
                    child,
                    $$slots: { child: true }
                  });
                }
                $$renderer4.push(`<!---->`);
              } else {
                $$renderer4.push("<!--[!-->");
                Sidebar_menu_item($$renderer4, {
                  children: ($$renderer5) => {
                    Sidebar_menu_button($$renderer5, {
                      onclick: () => goto(item.url),
                      isActive: currentPath.startsWith(item.url),
                      tooltipContent: item.title,
                      children: ($$renderer6) => {
                        if (item.icon) {
                          $$renderer6.push("<!--[-->");
                          const Icon2 = item.icon;
                          $$renderer6.push(`<!---->`);
                          Icon2($$renderer6, { class: "h-4 w-4" });
                          $$renderer6.push(`<!---->`);
                        } else {
                          $$renderer6.push("<!--[!-->");
                        }
                        $$renderer6.push(`<!--]--> <span>${escape_html(item.title)}</span>`);
                      },
                      $$slots: { default: true }
                    });
                  },
                  $$slots: { default: true }
                });
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
  });
}
function NavUser($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { user, onSignOut } = $$props;
    const sidebar = useSidebar();
    async function handleSignOut() {
      if (onSignOut) {
        await onSignOut();
      }
    }
    Sidebar_menu($$renderer2, {
      children: ($$renderer3) => {
        Sidebar_menu_item($$renderer3, {
          children: ($$renderer4) => {
            Root$1($$renderer4, {
              children: ($$renderer5) => {
                {
                  let child = function($$renderer6, { props }) {
                    Sidebar_menu_button($$renderer6, spread_props([
                      props,
                      {
                        size: "lg",
                        class: "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                        children: ($$renderer7) => {
                          if (user.image) {
                            $$renderer7.push("<!--[-->");
                            $$renderer7.push(`<img${attr("src", user.image)}${attr("alt", user.name || user.email)} class="h-8 w-8 rounded-lg"/>`);
                          } else {
                            $$renderer7.push("<!--[!-->");
                            $$renderer7.push(`<div class="bg-sidebar-primary text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold">${escape_html(user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase())}</div>`);
                          }
                          $$renderer7.push(`<!--]--> <div class="grid flex-1 text-left text-sm leading-tight"><span class="truncate font-medium">${escape_html(user.name || user.email)}</span> <span class="text-muted-foreground truncate text-xs">${escape_html(user.email)}</span></div> `);
                          Chevrons_up_down($$renderer7, { class: "ml-auto size-4" });
                          $$renderer7.push(`<!---->`);
                        },
                        $$slots: { default: true }
                      }
                    ]));
                  };
                  Dropdown_menu_trigger($$renderer5, { child, $$slots: { child: true } });
                }
                $$renderer5.push(`<!----> `);
                Dropdown_menu_content($$renderer5, {
                  class: "w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg",
                  side: sidebar.isMobile ? "bottom" : "right",
                  align: "end",
                  sideOffset: 4,
                  children: ($$renderer6) => {
                    $$renderer6.push(`<div class="px-2 py-1.5 text-sm"><p class="font-medium">${escape_html(user.name || "User")}</p> <p class="text-muted-foreground text-xs">${escape_html(user.email)}</p></div> `);
                    Dropdown_menu_separator($$renderer6, {});
                    $$renderer6.push(`<!----> `);
                    Dropdown_menu_item($$renderer6, {
                      onclick: () => goto(),
                      children: ($$renderer7) => {
                        Settings($$renderer7, { class: "mr-2 h-4 w-4" });
                        $$renderer7.push(`<!----> <span>Account Settings</span>`);
                      },
                      $$slots: { default: true }
                    });
                    $$renderer6.push(`<!----> `);
                    Dropdown_menu_separator($$renderer6, {});
                    $$renderer6.push(`<!----> `);
                    Dropdown_menu_item($$renderer6, {
                      class: "text-destructive",
                      onclick: handleSignOut,
                      children: ($$renderer7) => {
                        Log_out($$renderer7, { class: "mr-2 h-4 w-4" });
                        $$renderer7.push(`<!----> <span>Sign Out</span>`);
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
      },
      $$slots: { default: true }
    });
  });
}
function AppSidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, onSignOut, $$slots, $$events, ...restProps } = $$props;
    const navMainItems = data?.navItems?.map((item) => ({
      title: item.label,
      url: item.href,
      icon: void 0,
      // We'll keep icons simple for now
      isActive: false
    })) || [
      {
        title: "Content",
        url: "/admin",
        icon: void 0,
        isActive: false
      }
    ];
    Sidebar$1($$renderer2, spread_props([
      { collapsible: "icon" },
      restProps,
      {
        children: ($$renderer3) => {
          Sidebar_header($$renderer3, {
            children: ($$renderer4) => {
              if (data?.organizations && data.organizations.length > 0) {
                $$renderer4.push("<!--[-->");
                OrganizationSwitcher($$renderer4, {
                  organizations: data.organizations,
                  activeOrganization: data.activeOrganization,
                  canCreateOrganization: data.user?.role === "super_admin"
                });
              } else {
                $$renderer4.push("<!--[!-->");
              }
              $$renderer4.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Sidebar_content($$renderer3, {
            children: ($$renderer4) => {
              NavMain($$renderer4, { items: navMainItems });
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Sidebar_footer($$renderer3, {
            children: ($$renderer4) => {
              if (data?.user) {
                $$renderer4.push("<!--[-->");
                NavUser($$renderer4, { user: data.user, onSignOut });
              } else {
                $$renderer4.push("<!--[!-->");
              }
              $$renderer4.push(`<!--]-->`);
            },
            $$slots: { default: true }
          });
          $$renderer3.push(`<!----> `);
          Sidebar_rail($$renderer3, {});
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      }
    ]));
  });
}
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, onSignOut, children, enableGraphiQL = false, activeTab } = $$props;
    const showTabs = page.url.pathname === "/admin";
    Mode_watcher($$renderer2, {});
    $$renderer2.push(`<!----> `);
    Sidebar_provider($$renderer2, {
      class: "h-screen",
      children: ($$renderer3) => {
        AppSidebar($$renderer3, { data, onSignOut });
        $$renderer3.push(`<!----> `);
        Sidebar_inset($$renderer3, {
          class: "flex h-full flex-col",
          children: ($$renderer4) => {
            $$renderer4.push(`<header class="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"><div${attr_class("flex w-full items-center px-4", void 0, { "justify-between": showTabs })}><div class="flex items-center gap-2">`);
            Sidebar_trigger($$renderer4, { class: "-ml-1" });
            $$renderer4.push(`<!----> `);
            Separator($$renderer4, { orientation: "vertical", class: "mr-2 h-4" });
            $$renderer4.push(`<!----></div> `);
            if (showTabs && activeTab) {
              $$renderer4.push("<!--[-->");
              $$renderer4.push(`<div class="bg-muted text-muted-foreground mx-auto inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"><button${attr_class(`${stringify(activeTab.value === "structure" ? "bg-background text-foreground shadow" : "text-muted-foreground")} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`)}>Structure</button> `);
              if (enableGraphiQL) {
                $$renderer4.push("<!--[-->");
                $$renderer4.push(`<button${attr_class(`${stringify(activeTab.value === "vision" ? "bg-background text-foreground shadow" : "text-muted-foreground")} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50`)}>Vision</button>`);
              } else {
                $$renderer4.push("<!--[!-->");
              }
              $$renderer4.push(`<!--]--></div>`);
            } else {
              $$renderer4.push("<!--[!-->");
            }
            $$renderer4.push(`<!--]--> <div${attr_class("", void 0, { "ml-auto": !showTabs })}>`);
            Button($$renderer4, {
              onclick: toggleMode,
              variant: "outline",
              size: "icon",
              children: ($$renderer5) => {
                Sun($$renderer5, {
                  class: "h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                });
                $$renderer5.push(`<!----> `);
                Moon($$renderer5, {
                  class: "absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                });
                $$renderer5.push(`<!----> <span class="sr-only">Toggle theme</span>`);
              },
              $$slots: { default: true }
            });
            $$renderer4.push(`<!----></div></div></header> <main class="flex flex-1 flex-col overflow-hidden pt-0">`);
            children($$renderer4);
            $$renderer4.push(`<!----></main>`);
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
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, children } = $$props;
    const enableGraphiQL = page.data.graphqlSettings?.enableGraphiQL ?? false;
    async function handleSignOut() {
      await authClient.signOut();
      goto(resolve("/"));
    }
    if (data?.sidebarData) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex h-screen flex-col"><div class="bg-muted/50 flex items-center justify-between border-b px-4 py-2"><div class="flex items-center gap-2">`);
      House($$renderer2, { class: "text-muted-foreground h-4 w-4" });
      $$renderer2.push(`<!----> <span class="text-muted-foreground text-sm">Admin Panel</span></div> `);
      Button($$renderer2, {
        variant: "ghost",
        size: "sm",
        href: "/",
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->← Back to Home`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!----></div> <div class="flex-1 overflow-hidden">`);
      Sidebar($$renderer2, {
        data: data.sidebarData,
        onSignOut: handleSignOut,
        enableGraphiQL,
        activeTab: activeTabState,
        children: ($$renderer3) => {
          children($$renderer3);
          $$renderer3.push(`<!---->`);
        }
      });
      $$renderer2.push(`<!----></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div>Loading...</div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-DMjiRUDe.js.map
