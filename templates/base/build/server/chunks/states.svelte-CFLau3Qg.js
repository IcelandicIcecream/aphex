import { X as derived, Q as bind_props, F as spread_props, W as props_id, K as attributes, P as element, N as clsx, O as ensure_array_like, f as attr } from './index2-PlYtOn9l.js';
import { T, c as cn } from './button-BaYTBSEJ.js';
import { C as Context, M as MediaQuery, g as END, c as isHTMLElement$1, H as HOME, A as ARROW_DOWN, q as ARROW_RIGHT, e as ARROW_UP, r as ARROW_LEFT, s as createSubscriber, b as Portal, n as noop, u as DialogContentState, P as Presence_layer, v as DialogCloseState, x as Dialog_overlay, F as Focus_scope, y as shouldEnableFocusTrap, z as Escape_layer, B as Dismissible_layer, G as Text_selection_layer, I as Scroll_lock, J as useId, K as isNotNull, w as watch, L as getWindow$1, N as defaultWindow$2, O as OpenChangeComplete, D as DOMContext, Q as isFocusVisible, h as isElement$1, k as getDocument } from './dialog-overlay-LaS6gPE6.js';
import { b as boxWith$1, s as simpleBox, i as isWritableSymbol$1, B as BoxSymbol$1, j as boxFrom$1, k as boxFlatten$1, t as toReadonlyBox$1, l as isBox$1, n as isWritableBox$1, c as createBitsAttrs, a as createId, m as mergeProps, d as attachRef, o as cssToStyleObj, p as styleToString$1, f as boolToEmptyStrOrUndef, q as executeCallbacks } from './create-id-mXGs1H6b.js';
import { M as DEV, N as on } from './events-DlbR6UiW.js';
import { s as setContext, u as run, t as getContext, e as escape_html } from './context-DL4CYGHS.js';

const badgeVariants = T({
  base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none [&>svg]:size-3",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90 border-transparent",
      secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 border-transparent",
      destructive: "bg-destructive [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/70 border-transparent text-white",
      outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
    }
  },
  defaultVariants: { variant: "default" }
});
function Badge($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      href,
      class: className,
      variant = "default",
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    element(
      $$renderer2,
      href ? "a" : "span",
      () => {
        $$renderer2.push(`${attributes({
          "data-slot": "badge",
          href,
          class: clsx(cn(badgeVariants({ variant }), className)),
          ...restProps
        })}`);
      },
      () => {
        children?.($$renderer2);
        $$renderer2.push(`<!---->`);
      }
    );
    bind_props($$props, { ref });
  });
}
const DEFAULT_BASE_URL = "/api";
const DEFAULT_TIMEOUT = 1e4;
class ApiError extends Error {
  status;
  response;
  constructor(status, response, message) {
    super(message || `API Error: ${status}`);
    this.status = status;
    this.response = response;
    this.name = "ApiError";
  }
}
class ApiClient {
  baseUrl;
  timeout;
  constructor(baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }
  /**
   * Make HTTP request with proper error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {};
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    const requestOptions = {
      headers: {
        ...headers,
        ...options.headers
      },
      ...options
    };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    requestOptions.signal = controller.signal;
    try {
      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        throw new ApiError(response.status, data, data.message || data.error);
      }
      if (!data.success) {
        throw new ApiError(response.status, data, data.message || data.error);
      }
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, null, error instanceof Error ? error.message : "Network error");
    }
  }
  /**
   * GET request
   */
  async get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== void 0 && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }
    return this.request(url, { method: "GET" });
  }
  /**
   * POST request
   */
  async post(endpoint, body) {
    return this.request(endpoint, {
      method: "POST",
      // Don't stringify FormData - pass it directly
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : void 0
    });
  }
  /**
   * PUT request
   */
  async put(endpoint, body) {
    return this.request(endpoint, {
      method: "PUT",
      // Don't stringify FormData - pass it directly
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : void 0
    });
  }
  /**
   * DELETE request
   */
  async delete(endpoint, body) {
    return this.request(endpoint, {
      method: "DELETE",
      body: body ? JSON.stringify(body) : void 0
    });
  }
  /**
   * PATCH request
   */
  async patch(endpoint, body) {
    return this.request(endpoint, {
      method: "PATCH",
      // Don't stringify FormData - pass it directly
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : void 0
    });
  }
}
const apiClient = new ApiClient();
class DocumentsApi {
  /**
   * List documents with optional filtering
   * NOTE: Requires 'type' parameter - use getByType() for convenience
   */
  static async list(params = {}) {
    const queryParams = {
      ...params,
      type: params.type || params.docType
    };
    delete queryParams.docType;
    return apiClient.get("/documents", queryParams);
  }
  /**
   * Get document by ID
   */
  static async getById(id) {
    return apiClient.get(`/documents/${id}`);
  }
  /**
   * Create new document
   */
  static async create(data) {
    return apiClient.post("/documents", data);
  }
  /**
   * Update document draft by ID (auto-save)
   */
  static async updateById(id, data) {
    return apiClient.put(`/documents/${id}`, data);
  }
  /**
   * Publish document (copy draft -> published)
   */
  static async publish(id) {
    return apiClient.post(`/documents/${id}/publish`);
  }
  /**
   * Unpublish document (revert to draft only)
   */
  static async unpublish(id) {
    return apiClient.delete(`/documents/${id}/publish`);
  }
  /**
   * Delete document by ID
   */
  static async deleteById(id) {
    return apiClient.delete(`/documents/${id}`);
  }
  /**
   * Get documents by type (convenience method)
   */
  static async getByType(docType, params = {}) {
    return this.list({ ...params, docType });
  }
  /**
   * Get published documents only (convenience method)
   */
  static async getPublished(params = {}) {
    return this.list({ ...params, status: "published" });
  }
  /**
   * Get draft documents only (convenience method)
   */
  static async getDrafts(params = {}) {
    return this.list({ ...params, status: "draft" });
  }
}
const documents = {
  list: DocumentsApi.list.bind(DocumentsApi),
  getById: DocumentsApi.getById.bind(DocumentsApi),
  create: DocumentsApi.create.bind(DocumentsApi),
  updateById: DocumentsApi.updateById.bind(DocumentsApi),
  publish: DocumentsApi.publish.bind(DocumentsApi),
  unpublish: DocumentsApi.unpublish.bind(DocumentsApi),
  deleteById: DocumentsApi.deleteById.bind(DocumentsApi),
  getByType: DocumentsApi.getByType.bind(DocumentsApi),
  getPublished: DocumentsApi.getPublished.bind(DocumentsApi),
  getDrafts: DocumentsApi.getDrafts.bind(DocumentsApi)
};
function box$1(initialValue) {
  let current = initialValue;
  return {
    [BoxSymbol$1]: true,
    [isWritableSymbol$1]: true,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
box$1.from = boxFrom$1;
box$1.with = boxWith$1;
box$1.flatten = boxFlatten$1;
box$1.readonly = toReadonlyBox$1;
box$1.isBox = isBox$1;
box$1.isWritableBox = isWritableBox$1;
function onDestroyEffect(fn) {
}
function isFunction$1(value) {
  return typeof value === "function";
}
function get$1(value) {
  if (isFunction$1(value)) {
    return value();
  }
  return value;
}
class ElementSize {
  // no need to use `$state` here since we are using createSubscriber
  #size = { width: 0, height: 0 };
  #observed = false;
  #options;
  #node;
  #window;
  // we use a derived here to extract the width so that if the width doesn't change we don't get a state update
  // which we would get if we would just use a getter since the version of the subscriber will be changing
  #width = derived(() => {
    this.#subscribe()?.();
    return this.getSize().width;
  });
  // we use a derived here to extract the height so that if the height doesn't change we don't get a state update
  // which we would get if we would just use a getter since the version of the subscriber will be changing
  #height = derived(() => {
    this.#subscribe()?.();
    return this.getSize().height;
  });
  // we need to use a derived here because the class will be created before the node is bound to the ref
  #subscribe = derived(() => {
    const node$ = get$1(this.#node);
    if (!node$) return;
    return createSubscriber();
  });
  constructor(node, options = { box: "border-box" }) {
    this.#window = options.window ?? defaultWindow$2;
    this.#options = options;
    this.#node = node;
    this.#size = { width: 0, height: 0 };
  }
  calculateSize() {
    const element2 = get$1(this.#node);
    if (!element2 || !this.#window) {
      return;
    }
    const offsetWidth = element2.offsetWidth;
    const offsetHeight = element2.offsetHeight;
    if (this.#options.box === "border-box") {
      return { width: offsetWidth, height: offsetHeight };
    }
    const style = this.#window.getComputedStyle(element2);
    const paddingWidth = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingHeight = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const borderWidth = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
    const borderHeight = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const contentWidth = offsetWidth - paddingWidth - borderWidth;
    const contentHeight = offsetHeight - paddingHeight - borderHeight;
    return { width: contentWidth, height: contentHeight };
  }
  getSize() {
    return this.#observed ? this.#size : this.calculateSize() ?? this.#size;
  }
  get current() {
    this.#subscribe()?.();
    return this.getSize();
  }
  get width() {
    return this.#width();
  }
  get height() {
    return this.#height();
  }
}
function getElemDirection(elem) {
  const style = window.getComputedStyle(elem);
  const direction = style.getPropertyValue("direction");
  return direction;
}
function getNextKey(dir = "ltr", orientation = "horizontal") {
  return {
    horizontal: dir === "rtl" ? ARROW_LEFT : ARROW_RIGHT,
    vertical: ARROW_DOWN
  }[orientation];
}
function getPrevKey(dir = "ltr", orientation = "horizontal") {
  return {
    horizontal: dir === "rtl" ? ARROW_RIGHT : ARROW_LEFT,
    vertical: ARROW_UP
  }[orientation];
}
function getDirectionalKeys(dir = "ltr", orientation = "horizontal") {
  if (!["ltr", "rtl"].includes(dir))
    dir = "ltr";
  if (!["horizontal", "vertical"].includes(orientation))
    orientation = "horizontal";
  return {
    nextKey: getNextKey(dir, orientation),
    prevKey: getPrevKey(dir, orientation)
  };
}
class RovingFocusGroup {
  #opts;
  #currentTabStopId = box$1(null);
  constructor(opts) {
    this.#opts = opts;
  }
  getCandidateNodes() {
    return [];
  }
  focusFirstCandidate() {
    const items = this.getCandidateNodes();
    if (!items.length)
      return;
    items[0]?.focus();
  }
  handleKeydown(node, e, both = false) {
    const rootNode = this.#opts.rootNode.current;
    if (!rootNode || !node)
      return;
    const items = this.getCandidateNodes();
    if (!items.length)
      return;
    const currentIndex = items.indexOf(node);
    const dir = getElemDirection(rootNode);
    const { nextKey, prevKey } = getDirectionalKeys(dir, this.#opts.orientation.current);
    const loop = this.#opts.loop.current;
    const keyToIndex = {
      [nextKey]: currentIndex + 1,
      [prevKey]: currentIndex - 1,
      [HOME]: 0,
      [END]: items.length - 1
    };
    if (both) {
      const altNextKey = nextKey === ARROW_DOWN ? ARROW_RIGHT : ARROW_DOWN;
      const altPrevKey = prevKey === ARROW_UP ? ARROW_LEFT : ARROW_UP;
      keyToIndex[altNextKey] = currentIndex + 1;
      keyToIndex[altPrevKey] = currentIndex - 1;
    }
    let itemIndex = keyToIndex[e.key];
    if (itemIndex === void 0)
      return;
    e.preventDefault();
    if (itemIndex < 0 && loop) {
      itemIndex = items.length - 1;
    } else if (itemIndex === items.length && loop) {
      itemIndex = 0;
    }
    const itemToFocus = items[itemIndex];
    if (!itemToFocus)
      return;
    itemToFocus.focus();
    this.#currentTabStopId.current = itemToFocus.id;
    this.#opts.onCandidateFocus?.(itemToFocus);
    return itemToFocus;
  }
  getTabIndex(node) {
    const items = this.getCandidateNodes();
    const anyActive = this.#currentTabStopId.current !== null;
    if (node && !anyActive && items[0] === node) {
      this.#currentTabStopId.current = node.id;
      return 0;
    } else if (node?.id === this.#currentTabStopId.current) {
      return 0;
    }
    return -1;
  }
  setCurrentTabStopId(id) {
    this.#currentTabStopId.current = id;
  }
  focusCurrentTabStop() {
    const currentTabStopId = this.#currentTabStopId.current;
    if (!currentTabStopId)
      return;
    const currentTabStop = this.#opts.rootNode.current?.querySelector(`#${currentTabStopId}`);
    if (!currentTabStop || !isHTMLElement$1(currentTabStop))
      return;
    currentTabStop.focus();
  }
}
const sides = ["top", "right", "bottom", "left"];
const min = Math.min;
const max = Math.max;
const round = Math.round;
const createCoords = (v) => ({
  x: v,
  y: v
});
const oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
const oppositeAlignmentMap = {
  start: "end",
  end: "start"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
const yAxisSides = /* @__PURE__ */ new Set(["top", "bottom"]);
function getSideAxis(placement) {
  return yAxisSides.has(getSide(placement)) ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, (alignment) => oppositeAlignmentMap[alignment]);
}
const lrPlacement = ["left", "right"];
const rlPlacement = ["right", "left"];
const tbPlacement = ["top", "bottom"];
const btPlacement = ["bottom", "top"];
function getSideList(side, isStart, rtl) {
  switch (side) {
    case "top":
    case "bottom":
      if (rtl) return isStart ? rlPlacement : lrPlacement;
      return isStart ? lrPlacement : rlPlacement;
    case "left":
    case "right":
      return isStart ? tbPlacement : btPlacement;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, (side) => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  const {
    x,
    y,
    width,
    height
  } = rect;
  return {
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    x,
    y
  };
}
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
const computePosition$1 = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform: platform2
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(floating));
  let rects = await platform2.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x,
    y
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i = 0; i < validMiddleware.length; i++) {
    const {
      name,
      fn
    } = validMiddleware[i];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x,
      y,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform: platform2,
      elements: {
        reference,
        floating
      }
    });
    x = nextX != null ? nextX : x;
    y = nextY != null ? nextY : y;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform2.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x,
          y
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i = -1;
    }
  }
  return {
    x,
    y,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x,
    y,
    platform: platform2,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element2 = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform2.getClippingRect({
    element: ((_await$platform$isEle = await (platform2.isElement == null ? void 0 : platform2.isElement(element2))) != null ? _await$platform$isEle : true) ? element2 : element2.contextElement || await (platform2.getDocumentElement == null ? void 0 : platform2.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    x,
    y,
    width: rects.floating.width,
    height: rects.floating.height
  } : rects.reference;
  const offsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(elements.floating));
  const offsetScale = await (platform2.isElement == null ? void 0 : platform2.isElement(offsetParent)) ? await (platform2.getScale == null ? void 0 : platform2.getScale(offsetParent)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform2.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform2.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements,
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
const arrow$1 = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x,
      y,
      placement,
      rects,
      platform: platform2,
      elements,
      middlewareData
    } = state;
    const {
      element: element2,
      padding = 0
    } = evaluate(options, state) || {};
    if (element2 == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x,
      y
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform2.getDimensions(element2);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform2.getOffsetParent == null ? void 0 : platform2.getOffsetParent(element2));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform2.isElement == null ? void 0 : platform2.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const min$1 = minPadding;
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset2 = clamp(min$1, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center !== offset2 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset2,
        centerOffset: center - offset2 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
const flip$1 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform: platform2,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const initialSideAxis = getSideAxis(initialPlacement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      const hasFallbackAxisSideDirection = fallbackAxisSideDirection !== "none";
      if (!specifiedFallbackPlacements && hasFallbackAxisSideDirection) {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements[nextIndex];
        if (nextPlacement) {
          const ignoreCrossAxisOverflow = checkCrossAxis === "alignment" ? initialSideAxis !== getSideAxis(nextPlacement) : false;
          if (!ignoreCrossAxisOverflow || // We leave the current main axis only if every placement on that axis
          // overflows the main axis.
          overflowsData.every((d) => getSideAxis(d.placement) === initialSideAxis ? d.overflows[0] > 0 : true)) {
            return {
              data: {
                index: nextIndex,
                overflows: overflowsData
              },
              reset: {
                placement: nextPlacement
              }
            };
          }
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d) => d.overflows[0] <= 0).sort((a, b) => a.overflows[1] - b.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$filter2;
              const placement2 = (_overflowsData$filter2 = overflowsData.filter((d) => {
                if (hasFallbackAxisSideDirection) {
                  const currentSideAxis = getSideAxis(d.placement);
                  return currentSideAxis === initialSideAxis || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  currentSideAxis === "y";
                }
                return true;
              }).map((d) => [d.placement, d.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a, b) => a[1] - b[1])[0]) == null ? void 0 : _overflowsData$filter2[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
function getSideOffsets(overflow, rect) {
  return {
    top: overflow.top - rect.height,
    right: overflow.right - rect.width,
    bottom: overflow.bottom - rect.height,
    left: overflow.left - rect.width
  };
}
function isAnySideFullyClipped(overflow) {
  return sides.some((side) => overflow[side] >= 0);
}
const hide$1 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "hide",
    options,
    async fn(state) {
      const {
        rects
      } = state;
      const {
        strategy = "referenceHidden",
        ...detectOverflowOptions
      } = evaluate(options, state);
      switch (strategy) {
        case "referenceHidden": {
          const overflow = await detectOverflow(state, {
            ...detectOverflowOptions,
            elementContext: "reference"
          });
          const offsets = getSideOffsets(overflow, rects.reference);
          return {
            data: {
              referenceHiddenOffsets: offsets,
              referenceHidden: isAnySideFullyClipped(offsets)
            }
          };
        }
        case "escaped": {
          const overflow = await detectOverflow(state, {
            ...detectOverflowOptions,
            altBoundary: true
          });
          const offsets = getSideOffsets(overflow, rects.floating);
          return {
            data: {
              escapedOffsets: offsets,
              escaped: isAnySideFullyClipped(offsets)
            }
          };
        }
        default: {
          return {};
        }
      }
    }
  };
};
const originSides = /* @__PURE__ */ new Set(["left", "top"]);
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform: platform2,
    elements
  } = state;
  const rtl = await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = originSides.has(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: rawValue.mainAxis || 0,
    crossAxis: rawValue.crossAxis || 0,
    alignmentAxis: rawValue.alignmentAxis
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
const offset$1 = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x,
        y,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x + diffCoords.x,
        y: y + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
const shift$1 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x,
        y,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x2,
              y: y2
            } = _ref;
            return {
              x: x2,
              y: y2
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === "y" ? "top" : "left";
        const maxSide = mainAxis === "y" ? "bottom" : "right";
        const min2 = mainAxisCoord + overflow[minSide];
        const max2 = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min2, mainAxisCoord, max2);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === "y" ? "top" : "left";
        const maxSide = crossAxis === "y" ? "bottom" : "right";
        const min2 = crossAxisCoord + overflow[minSide];
        const max2 = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min2, crossAxisCoord, max2);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x,
          y: limitedCoords.y - y,
          enabled: {
            [mainAxis]: checkMainAxis,
            [crossAxis]: checkCrossAxis
          }
        }
      };
    }
  };
};
const limitShift$1 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    options,
    fn(state) {
      const {
        x,
        y,
        placement,
        rects,
        middlewareData
      } = state;
      const {
        offset: offset2 = 0,
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true
      } = evaluate(options, state);
      const coords = {
        x,
        y
      };
      const crossAxis = getSideAxis(placement);
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      const rawOffset = evaluate(offset2, state);
      const computedOffset = typeof rawOffset === "number" ? {
        mainAxis: rawOffset,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...rawOffset
      };
      if (checkMainAxis) {
        const len = mainAxis === "y" ? "height" : "width";
        const limitMin = rects.reference[mainAxis] - rects.floating[len] + computedOffset.mainAxis;
        const limitMax = rects.reference[mainAxis] + rects.reference[len] - computedOffset.mainAxis;
        if (mainAxisCoord < limitMin) {
          mainAxisCoord = limitMin;
        } else if (mainAxisCoord > limitMax) {
          mainAxisCoord = limitMax;
        }
      }
      if (checkCrossAxis) {
        var _middlewareData$offse, _middlewareData$offse2;
        const len = mainAxis === "y" ? "width" : "height";
        const isOriginSide = originSides.has(getSide(placement));
        const limitMin = rects.reference[crossAxis] - rects.floating[len] + (isOriginSide ? ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse[crossAxis]) || 0 : 0) + (isOriginSide ? 0 : computedOffset.crossAxis);
        const limitMax = rects.reference[crossAxis] + rects.reference[len] + (isOriginSide ? 0 : ((_middlewareData$offse2 = middlewareData.offset) == null ? void 0 : _middlewareData$offse2[crossAxis]) || 0) - (isOriginSide ? computedOffset.crossAxis : 0);
        if (crossAxisCoord < limitMin) {
          crossAxisCoord = limitMin;
        } else if (crossAxisCoord > limitMax) {
          crossAxisCoord = limitMax;
        }
      }
      return {
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      };
    }
  };
};
const size$1 = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      var _state$middlewareData, _state$middlewareData2;
      const {
        placement,
        rects,
        platform: platform2,
        elements
      } = state;
      const {
        apply = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform2.isRTL == null ? void 0 : platform2.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const maximumClippingHeight = height - overflow.top - overflow.bottom;
      const maximumClippingWidth = width - overflow.left - overflow.right;
      const overflowAvailableHeight = min(height - overflow[heightSide], maximumClippingHeight);
      const overflowAvailableWidth = min(width - overflow[widthSide], maximumClippingWidth);
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if ((_state$middlewareData = state.middlewareData.shift) != null && _state$middlewareData.enabled.x) {
        availableWidth = maximumClippingWidth;
      }
      if ((_state$middlewareData2 = state.middlewareData.shift) != null && _state$middlewareData2.enabled.y) {
        availableHeight = maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform2.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};
function hasWindow() {
  return typeof window !== "undefined";
}
function getNodeName(node) {
  if (isNode(node)) {
    return (node.nodeName || "").toLowerCase();
  }
  return "#document";
}
function getWindow(node) {
  var _node$ownerDocument;
  return (node == null || (_node$ownerDocument = node.ownerDocument) == null ? void 0 : _node$ownerDocument.defaultView) || window;
}
function getDocumentElement(node) {
  var _ref;
  return (_ref = (isNode(node) ? node.ownerDocument : node.document) || window.document) == null ? void 0 : _ref.documentElement;
}
function isNode(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Node || value instanceof getWindow(value).Node;
}
function isElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof Element || value instanceof getWindow(value).Element;
}
function isHTMLElement(value) {
  if (!hasWindow()) {
    return false;
  }
  return value instanceof HTMLElement || value instanceof getWindow(value).HTMLElement;
}
function isShadowRoot(value) {
  if (!hasWindow() || typeof ShadowRoot === "undefined") {
    return false;
  }
  return value instanceof ShadowRoot || value instanceof getWindow(value).ShadowRoot;
}
const invalidOverflowDisplayValues = /* @__PURE__ */ new Set(["inline", "contents"]);
function isOverflowElement(element2) {
  const {
    overflow,
    overflowX,
    overflowY,
    display
  } = getComputedStyle$1(element2);
  return /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) && !invalidOverflowDisplayValues.has(display);
}
const tableElements = /* @__PURE__ */ new Set(["table", "td", "th"]);
function isTableElement(element2) {
  return tableElements.has(getNodeName(element2));
}
const topLayerSelectors = [":popover-open", ":modal"];
function isTopLayer(element2) {
  return topLayerSelectors.some((selector) => {
    try {
      return element2.matches(selector);
    } catch (_e) {
      return false;
    }
  });
}
const transformProperties = ["transform", "translate", "scale", "rotate", "perspective"];
const willChangeValues = ["transform", "translate", "scale", "rotate", "perspective", "filter"];
const containValues = ["paint", "layout", "strict", "content"];
function isContainingBlock(elementOrCss) {
  const webkit = isWebKit();
  const css = isElement(elementOrCss) ? getComputedStyle$1(elementOrCss) : elementOrCss;
  return transformProperties.some((value) => css[value] ? css[value] !== "none" : false) || (css.containerType ? css.containerType !== "normal" : false) || !webkit && (css.backdropFilter ? css.backdropFilter !== "none" : false) || !webkit && (css.filter ? css.filter !== "none" : false) || willChangeValues.some((value) => (css.willChange || "").includes(value)) || containValues.some((value) => (css.contain || "").includes(value));
}
function getContainingBlock(element2) {
  let currentNode = getParentNode(element2);
  while (isHTMLElement(currentNode) && !isLastTraversableNode(currentNode)) {
    if (isContainingBlock(currentNode)) {
      return currentNode;
    } else if (isTopLayer(currentNode)) {
      return null;
    }
    currentNode = getParentNode(currentNode);
  }
  return null;
}
function isWebKit() {
  if (typeof CSS === "undefined" || !CSS.supports) return false;
  return CSS.supports("-webkit-backdrop-filter", "none");
}
const lastTraversableNodeNames = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function isLastTraversableNode(node) {
  return lastTraversableNodeNames.has(getNodeName(node));
}
function getComputedStyle$1(element2) {
  return getWindow(element2).getComputedStyle(element2);
}
function getNodeScroll(element2) {
  if (isElement(element2)) {
    return {
      scrollLeft: element2.scrollLeft,
      scrollTop: element2.scrollTop
    };
  }
  return {
    scrollLeft: element2.scrollX,
    scrollTop: element2.scrollY
  };
}
function getParentNode(node) {
  if (getNodeName(node) === "html") {
    return node;
  }
  const result = (
    // Step into the shadow DOM of the parent of a slotted node.
    node.assignedSlot || // DOM Element detected.
    node.parentNode || // ShadowRoot detected.
    isShadowRoot(node) && node.host || // Fallback.
    getDocumentElement(node)
  );
  return isShadowRoot(result) ? result.host : result;
}
function getNearestOverflowAncestor(node) {
  const parentNode = getParentNode(node);
  if (isLastTraversableNode(parentNode)) {
    return node.ownerDocument ? node.ownerDocument.body : node.body;
  }
  if (isHTMLElement(parentNode) && isOverflowElement(parentNode)) {
    return parentNode;
  }
  return getNearestOverflowAncestor(parentNode);
}
function getOverflowAncestors(node, list, traverseIframes) {
  var _node$ownerDocument2;
  if (list === void 0) {
    list = [];
  }
  const scrollableAncestor = getNearestOverflowAncestor(node);
  const isBody = scrollableAncestor === ((_node$ownerDocument2 = node.ownerDocument) == null ? void 0 : _node$ownerDocument2.body);
  const win = getWindow(scrollableAncestor);
  if (isBody) {
    getFrameElement(win);
    return list.concat(win, win.visualViewport || [], isOverflowElement(scrollableAncestor) ? scrollableAncestor : [], []);
  }
  return list.concat(scrollableAncestor, getOverflowAncestors(scrollableAncestor, []));
}
function getFrameElement(win) {
  return win.parent && Object.getPrototypeOf(win.parent) ? win.frameElement : null;
}
function getCssDimensions(element2) {
  const css = getComputedStyle$1(element2);
  let width = parseFloat(css.width) || 0;
  let height = parseFloat(css.height) || 0;
  const hasOffset = isHTMLElement(element2);
  const offsetWidth = hasOffset ? element2.offsetWidth : width;
  const offsetHeight = hasOffset ? element2.offsetHeight : height;
  const shouldFallback = round(width) !== offsetWidth || round(height) !== offsetHeight;
  if (shouldFallback) {
    width = offsetWidth;
    height = offsetHeight;
  }
  return {
    width,
    height,
    $: shouldFallback
  };
}
function unwrapElement(element2) {
  return !isElement(element2) ? element2.contextElement : element2;
}
function getScale(element2) {
  const domElement = unwrapElement(element2);
  if (!isHTMLElement(domElement)) {
    return createCoords(1);
  }
  const rect = domElement.getBoundingClientRect();
  const {
    width,
    height,
    $
  } = getCssDimensions(domElement);
  let x = ($ ? round(rect.width) : rect.width) / width;
  let y = ($ ? round(rect.height) : rect.height) / height;
  if (!x || !Number.isFinite(x)) {
    x = 1;
  }
  if (!y || !Number.isFinite(y)) {
    y = 1;
  }
  return {
    x,
    y
  };
}
const noOffsets = /* @__PURE__ */ createCoords(0);
function getVisualOffsets(element2) {
  const win = getWindow(element2);
  if (!isWebKit() || !win.visualViewport) {
    return noOffsets;
  }
  return {
    x: win.visualViewport.offsetLeft,
    y: win.visualViewport.offsetTop
  };
}
function shouldAddVisualOffsets(element2, isFixed, floatingOffsetParent) {
  if (isFixed === void 0) {
    isFixed = false;
  }
  if (!floatingOffsetParent || isFixed && floatingOffsetParent !== getWindow(element2)) {
    return false;
  }
  return isFixed;
}
function getBoundingClientRect(element2, includeScale, isFixedStrategy, offsetParent) {
  if (includeScale === void 0) {
    includeScale = false;
  }
  if (isFixedStrategy === void 0) {
    isFixedStrategy = false;
  }
  const clientRect = element2.getBoundingClientRect();
  const domElement = unwrapElement(element2);
  let scale = createCoords(1);
  if (includeScale) {
    if (offsetParent) {
      if (isElement(offsetParent)) {
        scale = getScale(offsetParent);
      }
    } else {
      scale = getScale(element2);
    }
  }
  const visualOffsets = shouldAddVisualOffsets(domElement, isFixedStrategy, offsetParent) ? getVisualOffsets(domElement) : createCoords(0);
  let x = (clientRect.left + visualOffsets.x) / scale.x;
  let y = (clientRect.top + visualOffsets.y) / scale.y;
  let width = clientRect.width / scale.x;
  let height = clientRect.height / scale.y;
  if (domElement) {
    const win = getWindow(domElement);
    const offsetWin = offsetParent && isElement(offsetParent) ? getWindow(offsetParent) : offsetParent;
    let currentWin = win;
    let currentIFrame = getFrameElement(currentWin);
    while (currentIFrame && offsetParent && offsetWin !== currentWin) {
      const iframeScale = getScale(currentIFrame);
      const iframeRect = currentIFrame.getBoundingClientRect();
      const css = getComputedStyle$1(currentIFrame);
      const left = iframeRect.left + (currentIFrame.clientLeft + parseFloat(css.paddingLeft)) * iframeScale.x;
      const top = iframeRect.top + (currentIFrame.clientTop + parseFloat(css.paddingTop)) * iframeScale.y;
      x *= iframeScale.x;
      y *= iframeScale.y;
      width *= iframeScale.x;
      height *= iframeScale.y;
      x += left;
      y += top;
      currentWin = getWindow(currentIFrame);
      currentIFrame = getFrameElement(currentWin);
    }
  }
  return rectToClientRect({
    width,
    height,
    x,
    y
  });
}
function getWindowScrollBarX(element2, rect) {
  const leftScroll = getNodeScroll(element2).scrollLeft;
  if (!rect) {
    return getBoundingClientRect(getDocumentElement(element2)).left + leftScroll;
  }
  return rect.left + leftScroll;
}
function getHTMLOffset(documentElement, scroll) {
  const htmlRect = documentElement.getBoundingClientRect();
  const x = htmlRect.left + scroll.scrollLeft - getWindowScrollBarX(documentElement, htmlRect);
  const y = htmlRect.top + scroll.scrollTop;
  return {
    x,
    y
  };
}
function convertOffsetParentRelativeRectToViewportRelativeRect(_ref) {
  let {
    elements,
    rect,
    offsetParent,
    strategy
  } = _ref;
  const isFixed = strategy === "fixed";
  const documentElement = getDocumentElement(offsetParent);
  const topLayer = elements ? isTopLayer(elements.floating) : false;
  if (offsetParent === documentElement || topLayer && isFixed) {
    return rect;
  }
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  let scale = createCoords(1);
  const offsets = createCoords(0);
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isHTMLElement(offsetParent)) {
      const offsetRect = getBoundingClientRect(offsetParent);
      scale = getScale(offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    }
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  return {
    width: rect.width * scale.x,
    height: rect.height * scale.y,
    x: rect.x * scale.x - scroll.scrollLeft * scale.x + offsets.x + htmlOffset.x,
    y: rect.y * scale.y - scroll.scrollTop * scale.y + offsets.y + htmlOffset.y
  };
}
function getClientRects(element2) {
  return Array.from(element2.getClientRects());
}
function getDocumentRect(element2) {
  const html = getDocumentElement(element2);
  const scroll = getNodeScroll(element2);
  const body = element2.ownerDocument.body;
  const width = max(html.scrollWidth, html.clientWidth, body.scrollWidth, body.clientWidth);
  const height = max(html.scrollHeight, html.clientHeight, body.scrollHeight, body.clientHeight);
  let x = -scroll.scrollLeft + getWindowScrollBarX(element2);
  const y = -scroll.scrollTop;
  if (getComputedStyle$1(body).direction === "rtl") {
    x += max(html.clientWidth, body.clientWidth) - width;
  }
  return {
    width,
    height,
    x,
    y
  };
}
const SCROLLBAR_MAX = 25;
function getViewportRect(element2, strategy) {
  const win = getWindow(element2);
  const html = getDocumentElement(element2);
  const visualViewport = win.visualViewport;
  let width = html.clientWidth;
  let height = html.clientHeight;
  let x = 0;
  let y = 0;
  if (visualViewport) {
    width = visualViewport.width;
    height = visualViewport.height;
    const visualViewportBased = isWebKit();
    if (!visualViewportBased || visualViewportBased && strategy === "fixed") {
      x = visualViewport.offsetLeft;
      y = visualViewport.offsetTop;
    }
  }
  const windowScrollbarX = getWindowScrollBarX(html);
  if (windowScrollbarX <= 0) {
    const doc = html.ownerDocument;
    const body = doc.body;
    const bodyStyles = getComputedStyle(body);
    const bodyMarginInline = doc.compatMode === "CSS1Compat" ? parseFloat(bodyStyles.marginLeft) + parseFloat(bodyStyles.marginRight) || 0 : 0;
    const clippingStableScrollbarWidth = Math.abs(html.clientWidth - body.clientWidth - bodyMarginInline);
    if (clippingStableScrollbarWidth <= SCROLLBAR_MAX) {
      width -= clippingStableScrollbarWidth;
    }
  } else if (windowScrollbarX <= SCROLLBAR_MAX) {
    width += windowScrollbarX;
  }
  return {
    width,
    height,
    x,
    y
  };
}
const absoluteOrFixed = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function getInnerBoundingClientRect(element2, strategy) {
  const clientRect = getBoundingClientRect(element2, true, strategy === "fixed");
  const top = clientRect.top + element2.clientTop;
  const left = clientRect.left + element2.clientLeft;
  const scale = isHTMLElement(element2) ? getScale(element2) : createCoords(1);
  const width = element2.clientWidth * scale.x;
  const height = element2.clientHeight * scale.y;
  const x = left * scale.x;
  const y = top * scale.y;
  return {
    width,
    height,
    x,
    y
  };
}
function getClientRectFromClippingAncestor(element2, clippingAncestor, strategy) {
  let rect;
  if (clippingAncestor === "viewport") {
    rect = getViewportRect(element2, strategy);
  } else if (clippingAncestor === "document") {
    rect = getDocumentRect(getDocumentElement(element2));
  } else if (isElement(clippingAncestor)) {
    rect = getInnerBoundingClientRect(clippingAncestor, strategy);
  } else {
    const visualOffsets = getVisualOffsets(element2);
    rect = {
      x: clippingAncestor.x - visualOffsets.x,
      y: clippingAncestor.y - visualOffsets.y,
      width: clippingAncestor.width,
      height: clippingAncestor.height
    };
  }
  return rectToClientRect(rect);
}
function hasFixedPositionAncestor(element2, stopNode) {
  const parentNode = getParentNode(element2);
  if (parentNode === stopNode || !isElement(parentNode) || isLastTraversableNode(parentNode)) {
    return false;
  }
  return getComputedStyle$1(parentNode).position === "fixed" || hasFixedPositionAncestor(parentNode, stopNode);
}
function getClippingElementAncestors(element2, cache) {
  const cachedResult = cache.get(element2);
  if (cachedResult) {
    return cachedResult;
  }
  let result = getOverflowAncestors(element2, []).filter((el) => isElement(el) && getNodeName(el) !== "body");
  let currentContainingBlockComputedStyle = null;
  const elementIsFixed = getComputedStyle$1(element2).position === "fixed";
  let currentNode = elementIsFixed ? getParentNode(element2) : element2;
  while (isElement(currentNode) && !isLastTraversableNode(currentNode)) {
    const computedStyle = getComputedStyle$1(currentNode);
    const currentNodeIsContaining = isContainingBlock(currentNode);
    if (!currentNodeIsContaining && computedStyle.position === "fixed") {
      currentContainingBlockComputedStyle = null;
    }
    const shouldDropCurrentNode = elementIsFixed ? !currentNodeIsContaining && !currentContainingBlockComputedStyle : !currentNodeIsContaining && computedStyle.position === "static" && !!currentContainingBlockComputedStyle && absoluteOrFixed.has(currentContainingBlockComputedStyle.position) || isOverflowElement(currentNode) && !currentNodeIsContaining && hasFixedPositionAncestor(element2, currentNode);
    if (shouldDropCurrentNode) {
      result = result.filter((ancestor) => ancestor !== currentNode);
    } else {
      currentContainingBlockComputedStyle = computedStyle;
    }
    currentNode = getParentNode(currentNode);
  }
  cache.set(element2, result);
  return result;
}
function getClippingRect(_ref) {
  let {
    element: element2,
    boundary,
    rootBoundary,
    strategy
  } = _ref;
  const elementClippingAncestors = boundary === "clippingAncestors" ? isTopLayer(element2) ? [] : getClippingElementAncestors(element2, this._c) : [].concat(boundary);
  const clippingAncestors = [...elementClippingAncestors, rootBoundary];
  const firstClippingAncestor = clippingAncestors[0];
  const clippingRect = clippingAncestors.reduce((accRect, clippingAncestor) => {
    const rect = getClientRectFromClippingAncestor(element2, clippingAncestor, strategy);
    accRect.top = max(rect.top, accRect.top);
    accRect.right = min(rect.right, accRect.right);
    accRect.bottom = min(rect.bottom, accRect.bottom);
    accRect.left = max(rect.left, accRect.left);
    return accRect;
  }, getClientRectFromClippingAncestor(element2, firstClippingAncestor, strategy));
  return {
    width: clippingRect.right - clippingRect.left,
    height: clippingRect.bottom - clippingRect.top,
    x: clippingRect.left,
    y: clippingRect.top
  };
}
function getDimensions(element2) {
  const {
    width,
    height
  } = getCssDimensions(element2);
  return {
    width,
    height
  };
}
function getRectRelativeToOffsetParent(element2, offsetParent, strategy) {
  const isOffsetParentAnElement = isHTMLElement(offsetParent);
  const documentElement = getDocumentElement(offsetParent);
  const isFixed = strategy === "fixed";
  const rect = getBoundingClientRect(element2, true, isFixed, offsetParent);
  let scroll = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const offsets = createCoords(0);
  function setLeftRTLScrollbarOffset() {
    offsets.x = getWindowScrollBarX(documentElement);
  }
  if (isOffsetParentAnElement || !isOffsetParentAnElement && !isFixed) {
    if (getNodeName(offsetParent) !== "body" || isOverflowElement(documentElement)) {
      scroll = getNodeScroll(offsetParent);
    }
    if (isOffsetParentAnElement) {
      const offsetRect = getBoundingClientRect(offsetParent, true, isFixed, offsetParent);
      offsets.x = offsetRect.x + offsetParent.clientLeft;
      offsets.y = offsetRect.y + offsetParent.clientTop;
    } else if (documentElement) {
      setLeftRTLScrollbarOffset();
    }
  }
  if (isFixed && !isOffsetParentAnElement && documentElement) {
    setLeftRTLScrollbarOffset();
  }
  const htmlOffset = documentElement && !isOffsetParentAnElement && !isFixed ? getHTMLOffset(documentElement, scroll) : createCoords(0);
  const x = rect.left + scroll.scrollLeft - offsets.x - htmlOffset.x;
  const y = rect.top + scroll.scrollTop - offsets.y - htmlOffset.y;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height
  };
}
function isStaticPositioned(element2) {
  return getComputedStyle$1(element2).position === "static";
}
function getTrueOffsetParent(element2, polyfill) {
  if (!isHTMLElement(element2) || getComputedStyle$1(element2).position === "fixed") {
    return null;
  }
  if (polyfill) {
    return polyfill(element2);
  }
  let rawOffsetParent = element2.offsetParent;
  if (getDocumentElement(element2) === rawOffsetParent) {
    rawOffsetParent = rawOffsetParent.ownerDocument.body;
  }
  return rawOffsetParent;
}
function getOffsetParent(element2, polyfill) {
  const win = getWindow(element2);
  if (isTopLayer(element2)) {
    return win;
  }
  if (!isHTMLElement(element2)) {
    let svgOffsetParent = getParentNode(element2);
    while (svgOffsetParent && !isLastTraversableNode(svgOffsetParent)) {
      if (isElement(svgOffsetParent) && !isStaticPositioned(svgOffsetParent)) {
        return svgOffsetParent;
      }
      svgOffsetParent = getParentNode(svgOffsetParent);
    }
    return win;
  }
  let offsetParent = getTrueOffsetParent(element2, polyfill);
  while (offsetParent && isTableElement(offsetParent) && isStaticPositioned(offsetParent)) {
    offsetParent = getTrueOffsetParent(offsetParent, polyfill);
  }
  if (offsetParent && isLastTraversableNode(offsetParent) && isStaticPositioned(offsetParent) && !isContainingBlock(offsetParent)) {
    return win;
  }
  return offsetParent || getContainingBlock(element2) || win;
}
const getElementRects = async function(data) {
  const getOffsetParentFn = this.getOffsetParent || getOffsetParent;
  const getDimensionsFn = this.getDimensions;
  const floatingDimensions = await getDimensionsFn(data.floating);
  return {
    reference: getRectRelativeToOffsetParent(data.reference, await getOffsetParentFn(data.floating), data.strategy),
    floating: {
      x: 0,
      y: 0,
      width: floatingDimensions.width,
      height: floatingDimensions.height
    }
  };
};
function isRTL(element2) {
  return getComputedStyle$1(element2).direction === "rtl";
}
const platform = {
  convertOffsetParentRelativeRectToViewportRelativeRect,
  getDocumentElement,
  getClippingRect,
  getOffsetParent,
  getElementRects,
  getClientRects,
  getDimensions,
  getScale,
  isElement,
  isRTL
};
const offset = offset$1;
const shift = shift$1;
const flip = flip$1;
const size = size$1;
const hide = hide$1;
const arrow = arrow$1;
const limitShift = limitShift$1;
const computePosition = (reference, floating, options) => {
  const cache = /* @__PURE__ */ new Map();
  const mergedOptions = {
    platform,
    ...options
  };
  const platformWithCache = {
    ...mergedOptions.platform,
    _c: cache
  };
  return computePosition$1(reference, floating, {
    ...mergedOptions,
    platform: platformWithCache
  });
};
function get(valueOrGetValue) {
  return typeof valueOrGetValue === "function" ? valueOrGetValue() : valueOrGetValue;
}
function getDPR(element2) {
  if (typeof window === "undefined") return 1;
  const win = element2.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}
function roundByDPR(element2, value) {
  const dpr = getDPR(element2);
  return Math.round(value * dpr) / dpr;
}
function getFloatingContentCSSVars(name) {
  return {
    [`--bits-${name}-content-transform-origin`]: `var(--bits-floating-transform-origin)`,
    [`--bits-${name}-content-available-width`]: `var(--bits-floating-available-width)`,
    [`--bits-${name}-content-available-height`]: `var(--bits-floating-available-height)`,
    [`--bits-${name}-anchor-width`]: `var(--bits-floating-anchor-width)`,
    [`--bits-${name}-anchor-height`]: `var(--bits-floating-anchor-height)`
  };
}
function useFloating(options) {
  const openOption = get(options.open) ?? true;
  const middlewareOption = get(options.middleware);
  const transformOption = get(options.transform) ?? true;
  const placementOption = get(options.placement) ?? "bottom";
  const strategyOption = get(options.strategy) ?? "absolute";
  const sideOffsetOption = get(options.sideOffset) ?? 0;
  const alignOffsetOption = get(options.alignOffset) ?? 0;
  const reference = options.reference;
  let x = 0;
  let y = 0;
  const floating = simpleBox(null);
  let strategy = strategyOption;
  let placement = placementOption;
  let middlewareData = {};
  let isPositioned = false;
  const floatingStyles = (() => {
    const xVal = floating.current ? roundByDPR(floating.current, x) : x;
    const yVal = floating.current ? roundByDPR(floating.current, y) : y;
    if (transformOption) {
      return {
        position: strategy,
        left: "0",
        top: "0",
        transform: `translate(${xVal}px, ${yVal}px)`,
        ...floating.current && getDPR(floating.current) >= 1.5 && { willChange: "transform" }
      };
    }
    return { position: strategy, left: `${xVal}px`, top: `${yVal}px` };
  })();
  function update() {
    if (reference.current === null || floating.current === null) return;
    computePosition(reference.current, floating.current, {
      middleware: middlewareOption,
      placement: placementOption,
      strategy: strategyOption
    }).then((position) => {
      if (!openOption && x !== 0 && y !== 0) {
        const maxExpectedOffset = Math.max(Math.abs(sideOffsetOption), Math.abs(alignOffsetOption), 15);
        if (position.x <= maxExpectedOffset && position.y <= maxExpectedOffset) return;
      }
      x = position.x;
      y = position.y;
      strategy = position.strategy;
      placement = position.placement;
      middlewareData = position.middlewareData;
      isPositioned = true;
    });
  }
  return {
    floating,
    reference,
    get strategy() {
      return strategy;
    },
    get placement() {
      return placement;
    },
    get middlewareData() {
      return middlewareData;
    },
    get isPositioned() {
      return isPositioned;
    },
    get floatingStyles() {
      return floatingStyles;
    },
    get update() {
      return update;
    }
  };
}
const OPPOSITE_SIDE = { top: "bottom", right: "left", bottom: "top", left: "right" };
const FloatingRootContext = new Context("Floating.Root");
const FloatingContentContext = new Context("Floating.Content");
const FloatingTooltipRootContext = new Context("Floating.Root");
class FloatingRootState {
  static create(tooltip = false) {
    return tooltip ? FloatingTooltipRootContext.set(new FloatingRootState()) : FloatingRootContext.set(new FloatingRootState());
  }
  anchorNode = simpleBox(null);
  customAnchorNode = simpleBox(null);
  triggerNode = simpleBox(null);
  constructor() {
  }
}
class FloatingContentState {
  static create(opts, tooltip = false) {
    return tooltip ? FloatingContentContext.set(new FloatingContentState(opts, FloatingTooltipRootContext.get())) : FloatingContentContext.set(new FloatingContentState(opts, FloatingRootContext.get()));
  }
  opts;
  root;
  // nodes
  contentRef = simpleBox(null);
  wrapperRef = simpleBox(null);
  arrowRef = simpleBox(null);
  contentAttachment = attachRef(this.contentRef);
  wrapperAttachment = attachRef(this.wrapperRef);
  arrowAttachment = attachRef(this.arrowRef);
  // ids
  arrowId = simpleBox(useId());
  #transformedStyle = derived(() => {
    if (typeof this.opts.style === "string") return cssToStyleObj(this.opts.style);
    if (!this.opts.style) return {};
  });
  #updatePositionStrategy = void 0;
  #arrowSize = new ElementSize(() => this.arrowRef.current ?? void 0);
  #arrowWidth = derived(() => this.#arrowSize?.width ?? 0);
  #arrowHeight = derived(() => this.#arrowSize?.height ?? 0);
  #desiredPlacement = derived(() => this.opts.side?.current + (this.opts.align.current !== "center" ? `-${this.opts.align.current}` : ""));
  #boundary = derived(() => Array.isArray(this.opts.collisionBoundary.current) ? this.opts.collisionBoundary.current : [this.opts.collisionBoundary.current]);
  #hasExplicitBoundaries = derived(() => this.#boundary().length > 0);
  get hasExplicitBoundaries() {
    return this.#hasExplicitBoundaries();
  }
  set hasExplicitBoundaries($$value) {
    return this.#hasExplicitBoundaries($$value);
  }
  #detectOverflowOptions = derived(() => ({
    padding: this.opts.collisionPadding.current,
    boundary: this.#boundary().filter(isNotNull),
    altBoundary: this.hasExplicitBoundaries
  }));
  get detectOverflowOptions() {
    return this.#detectOverflowOptions();
  }
  set detectOverflowOptions($$value) {
    return this.#detectOverflowOptions($$value);
  }
  #availableWidth = void 0;
  #availableHeight = void 0;
  #anchorWidth = void 0;
  #anchorHeight = void 0;
  #middleware = derived(() => [
    offset({
      mainAxis: this.opts.sideOffset.current + this.#arrowHeight(),
      alignmentAxis: this.opts.alignOffset.current
    }),
    this.opts.avoidCollisions.current && shift({
      mainAxis: true,
      crossAxis: false,
      limiter: this.opts.sticky.current === "partial" ? limitShift() : void 0,
      ...this.detectOverflowOptions
    }),
    this.opts.avoidCollisions.current && flip({ ...this.detectOverflowOptions }),
    size({
      ...this.detectOverflowOptions,
      apply: ({ rects, availableWidth, availableHeight }) => {
        const { width: anchorWidth, height: anchorHeight } = rects.reference;
        this.#availableWidth = availableWidth;
        this.#availableHeight = availableHeight;
        this.#anchorWidth = anchorWidth;
        this.#anchorHeight = anchorHeight;
      }
    }),
    this.arrowRef.current && arrow({
      element: this.arrowRef.current,
      padding: this.opts.arrowPadding.current
    }),
    transformOrigin({
      arrowWidth: this.#arrowWidth(),
      arrowHeight: this.#arrowHeight()
    }),
    this.opts.hideWhenDetached.current && hide({ strategy: "referenceHidden", ...this.detectOverflowOptions })
  ].filter(Boolean));
  get middleware() {
    return this.#middleware();
  }
  set middleware($$value) {
    return this.#middleware($$value);
  }
  floating;
  #placedSide = derived(() => getSideFromPlacement(this.floating.placement));
  get placedSide() {
    return this.#placedSide();
  }
  set placedSide($$value) {
    return this.#placedSide($$value);
  }
  #placedAlign = derived(() => getAlignFromPlacement(this.floating.placement));
  get placedAlign() {
    return this.#placedAlign();
  }
  set placedAlign($$value) {
    return this.#placedAlign($$value);
  }
  #arrowX = derived(() => this.floating.middlewareData.arrow?.x ?? 0);
  get arrowX() {
    return this.#arrowX();
  }
  set arrowX($$value) {
    return this.#arrowX($$value);
  }
  #arrowY = derived(() => this.floating.middlewareData.arrow?.y ?? 0);
  get arrowY() {
    return this.#arrowY();
  }
  set arrowY($$value) {
    return this.#arrowY($$value);
  }
  #cannotCenterArrow = derived(() => this.floating.middlewareData.arrow?.centerOffset !== 0);
  get cannotCenterArrow() {
    return this.#cannotCenterArrow();
  }
  set cannotCenterArrow($$value) {
    return this.#cannotCenterArrow($$value);
  }
  contentZIndex;
  #arrowBaseSide = derived(() => OPPOSITE_SIDE[this.placedSide]);
  get arrowBaseSide() {
    return this.#arrowBaseSide();
  }
  set arrowBaseSide($$value) {
    return this.#arrowBaseSide($$value);
  }
  #wrapperProps = derived(() => ({
    id: this.opts.wrapperId.current,
    "data-bits-floating-content-wrapper": "",
    style: {
      ...this.floating.floatingStyles,
      transform: this.floating.isPositioned ? this.floating.floatingStyles.transform : "translate(0, -200%)",
      minWidth: "max-content",
      zIndex: this.contentZIndex,
      "--bits-floating-transform-origin": `${this.floating.middlewareData.transformOrigin?.x} ${this.floating.middlewareData.transformOrigin?.y}`,
      "--bits-floating-available-width": `${this.#availableWidth}px`,
      "--bits-floating-available-height": `${this.#availableHeight}px`,
      "--bits-floating-anchor-width": `${this.#anchorWidth}px`,
      "--bits-floating-anchor-height": `${this.#anchorHeight}px`,
      ...this.floating.middlewareData.hide?.referenceHidden && { visibility: "hidden", "pointer-events": "none" },
      ...this.#transformedStyle()
    },
    dir: this.opts.dir.current,
    ...this.wrapperAttachment
  }));
  get wrapperProps() {
    return this.#wrapperProps();
  }
  set wrapperProps($$value) {
    return this.#wrapperProps($$value);
  }
  #props = derived(() => ({
    "data-side": this.placedSide,
    "data-align": this.placedAlign,
    style: styleToString$1({ ...this.#transformedStyle() }),
    ...this.contentAttachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
  #arrowStyle = derived(() => ({
    position: "absolute",
    left: this.arrowX ? `${this.arrowX}px` : void 0,
    top: this.arrowY ? `${this.arrowY}px` : void 0,
    [this.arrowBaseSide]: 0,
    "transform-origin": { top: "", right: "0 0", bottom: "center 0", left: "100% 0" }[this.placedSide],
    transform: {
      top: "translateY(100%)",
      right: "translateY(50%) rotate(90deg) translateX(-50%)",
      bottom: "rotate(180deg)",
      left: "translateY(50%) rotate(-90deg) translateX(50%)"
    }[this.placedSide],
    visibility: this.cannotCenterArrow ? "hidden" : void 0
  }));
  get arrowStyle() {
    return this.#arrowStyle();
  }
  set arrowStyle($$value) {
    return this.#arrowStyle($$value);
  }
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    if (opts.customAnchor) {
      this.root.customAnchorNode.current = opts.customAnchor.current;
    }
    watch(() => opts.customAnchor.current, (customAnchor) => {
      this.root.customAnchorNode.current = customAnchor;
    });
    this.floating = useFloating({
      strategy: () => this.opts.strategy.current,
      placement: () => this.#desiredPlacement(),
      middleware: () => this.middleware,
      reference: this.root.anchorNode,
      open: () => this.opts.enabled.current,
      sideOffset: () => this.opts.sideOffset.current,
      alignOffset: () => this.opts.alignOffset.current
    });
    watch(() => this.contentRef.current, (contentNode) => {
      if (!contentNode) return;
      const win = getWindow$1(contentNode);
      this.contentZIndex = win.getComputedStyle(contentNode).zIndex;
    });
  }
}
class FloatingArrowState {
  static create(opts) {
    return new FloatingArrowState(opts, FloatingContentContext.get());
  }
  opts;
  content;
  constructor(opts, content) {
    this.opts = opts;
    this.content = content;
  }
  #props = derived(() => ({
    id: this.opts.id.current,
    style: this.content.arrowStyle,
    "data-side": this.content.placedSide,
    ...this.content.arrowAttachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class FloatingAnchorState {
  static create(opts, tooltip = false) {
    return tooltip ? new FloatingAnchorState(opts, FloatingTooltipRootContext.get()) : new FloatingAnchorState(opts, FloatingRootContext.get());
  }
  opts;
  root;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    if (opts.virtualEl && opts.virtualEl.current) {
      root.triggerNode = boxFrom$1(opts.virtualEl.current);
    } else {
      root.triggerNode = opts.ref;
    }
  }
}
function transformOrigin(options) {
  return {
    name: "transformOrigin",
    options,
    fn(data) {
      const { placement, rects, middlewareData } = data;
      const cannotCenterArrow = middlewareData.arrow?.centerOffset !== 0;
      const isArrowHidden = cannotCenterArrow;
      const arrowWidth = isArrowHidden ? 0 : options.arrowWidth;
      const arrowHeight = isArrowHidden ? 0 : options.arrowHeight;
      const [placedSide, placedAlign] = getSideAndAlignFromPlacement(placement);
      const noArrowAlign = { start: "0%", center: "50%", end: "100%" }[placedAlign];
      const arrowXCenter = (middlewareData.arrow?.x ?? 0) + arrowWidth / 2;
      const arrowYCenter = (middlewareData.arrow?.y ?? 0) + arrowHeight / 2;
      let x = "";
      let y = "";
      if (placedSide === "bottom") {
        x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
        y = `${-arrowHeight}px`;
      } else if (placedSide === "top") {
        x = isArrowHidden ? noArrowAlign : `${arrowXCenter}px`;
        y = `${rects.floating.height + arrowHeight}px`;
      } else if (placedSide === "right") {
        x = `${-arrowHeight}px`;
        y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
      } else if (placedSide === "left") {
        x = `${rects.floating.width + arrowHeight}px`;
        y = isArrowHidden ? noArrowAlign : `${arrowYCenter}px`;
      }
      return { data: { x, y } };
    }
  };
}
function getSideAndAlignFromPlacement(placement) {
  const [side, align = "center"] = placement.split("-");
  return [side, align];
}
function getSideFromPlacement(placement) {
  return getSideAndAlignFromPlacement(placement)[0];
}
function getAlignFromPlacement(placement) {
  return getSideAndAlignFromPlacement(placement)[1];
}
function Floating_layer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children, tooltip = false } = $$props;
    FloatingRootState.create(tooltip);
    children?.($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
const defaultOptions = { afterMs: 1e4, onChange: noop };
function boxAutoReset(defaultValue, options) {
  const { afterMs, onChange, getWindow: getWindow2 } = { ...defaultOptions, ...options };
  let timeout = null;
  let value = defaultValue;
  function resetAfter() {
    return getWindow2().setTimeout(
      () => {
        value = defaultValue;
        onChange?.(defaultValue);
      },
      afterMs
    );
  }
  return boxWith$1(() => value, (v) => {
    value = v;
    onChange?.(v);
    if (timeout) getWindow2().clearTimeout(timeout);
    timeout = resetAfter();
  });
}
function Floating_layer_anchor($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { id, children, virtualEl, ref, tooltip = false } = $$props;
    FloatingAnchorState.create(
      {
        id: boxWith$1(() => id),
        virtualEl: boxWith$1(() => virtualEl),
        ref
      },
      tooltip
    );
    children?.($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
function Arrow($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      id = useId(),
      children,
      child,
      width = 10,
      height = 5,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const mergedProps = mergeProps(restProps, { id });
    if (child) {
      $$renderer2.push("<!--[-->");
      child($$renderer2, { props: mergedProps });
      $$renderer2.push(`<!---->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span${attributes({ ...mergedProps })}>`);
      if (children) {
        $$renderer2.push("<!--[-->");
        children?.($$renderer2);
        $$renderer2.push(`<!---->`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<svg${attr("width", width)}${attr("height", height)} viewBox="0 0 30 10" preserveAspectRatio="none" data-arrow=""><polygon points="0,0 30,0 15,10" fill="currentColor"></polygon></svg>`);
      }
      $$renderer2.push(`<!--]--></span>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
function Floating_layer_arrow($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { id = useId(), ref = null, $$slots, $$events, ...restProps } = $$props;
    const arrowState = FloatingArrowState.create({
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, arrowState.props);
    Arrow($$renderer2, spread_props([mergedProps]));
    bind_props($$props, { ref });
  });
}
function Floating_layer_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      content,
      side = "bottom",
      sideOffset = 0,
      align = "center",
      alignOffset = 0,
      id,
      arrowPadding = 0,
      avoidCollisions = true,
      collisionBoundary = [],
      collisionPadding = 0,
      hideWhenDetached = false,
      onPlaced = () => {
      },
      sticky = "partial",
      updatePositionStrategy = "optimized",
      strategy = "fixed",
      dir = "ltr",
      style = {},
      wrapperId = useId(),
      customAnchor = null,
      enabled,
      tooltip = false
    } = $$props;
    const contentState = FloatingContentState.create(
      {
        side: boxWith$1(() => side),
        sideOffset: boxWith$1(() => sideOffset),
        align: boxWith$1(() => align),
        alignOffset: boxWith$1(() => alignOffset),
        id: boxWith$1(() => id),
        arrowPadding: boxWith$1(() => arrowPadding),
        avoidCollisions: boxWith$1(() => avoidCollisions),
        collisionBoundary: boxWith$1(() => collisionBoundary),
        collisionPadding: boxWith$1(() => collisionPadding),
        hideWhenDetached: boxWith$1(() => hideWhenDetached),
        onPlaced: boxWith$1(() => onPlaced),
        sticky: boxWith$1(() => sticky),
        updatePositionStrategy: boxWith$1(() => updatePositionStrategy),
        strategy: boxWith$1(() => strategy),
        dir: boxWith$1(() => dir),
        style: boxWith$1(() => style),
        enabled: boxWith$1(() => enabled),
        wrapperId: boxWith$1(() => wrapperId),
        customAnchor: boxWith$1(() => customAnchor)
      },
      tooltip
    );
    const mergedProps = mergeProps(contentState.wrapperProps, { style: { pointerEvents: "auto" } });
    content?.($$renderer2, { props: contentState.props, wrapperProps: mergedProps });
    $$renderer2.push(`<!---->`);
  });
}
function Floating_layer_content_static($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { content } = $$props;
    content?.($$renderer2, { props: {}, wrapperProps: {} });
    $$renderer2.push(`<!---->`);
  });
}
function Popper_content($$renderer, $$props) {
  let {
    content,
    isStatic = false,
    onPlaced,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  if (isStatic) {
    $$renderer.push("<!--[-->");
    Floating_layer_content_static($$renderer, { content });
  } else {
    $$renderer.push("<!--[!-->");
    Floating_layer_content($$renderer, spread_props([{ content, onPlaced }, restProps]));
  }
  $$renderer.push(`<!--]-->`);
}
function Popper_layer_inner($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      popper,
      onEscapeKeydown,
      escapeKeydownBehavior,
      preventOverflowTextSelection,
      id,
      onPointerDown,
      onPointerUp,
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      avoidCollisions,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      updatePositionStrategy,
      strategy,
      dir,
      preventScroll,
      wrapperId,
      style,
      onPlaced,
      onInteractOutside,
      onCloseAutoFocus,
      onOpenAutoFocus,
      onFocusOutside,
      interactOutsideBehavior = "close",
      loop,
      trapFocus = true,
      isValidEvent = () => false,
      customAnchor = null,
      isStatic = false,
      enabled,
      ref,
      tooltip = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    {
      let content = function($$renderer3, { props: floatingProps, wrapperProps }) {
        if (restProps.forceMount && enabled) {
          $$renderer3.push("<!--[-->");
          Scroll_lock($$renderer3, { preventScroll });
        } else {
          $$renderer3.push("<!--[!-->");
          if (!restProps.forceMount) {
            $$renderer3.push("<!--[-->");
            Scroll_lock($$renderer3, { preventScroll });
          } else {
            $$renderer3.push("<!--[!-->");
          }
          $$renderer3.push(`<!--]-->`);
        }
        $$renderer3.push(`<!--]--> `);
        {
          let focusScope = function($$renderer4, { props: focusScopeProps }) {
            Escape_layer($$renderer4, {
              onEscapeKeydown,
              escapeKeydownBehavior,
              enabled,
              ref,
              children: ($$renderer5) => {
                {
                  let children = function($$renderer6, { props: dismissibleProps }) {
                    Text_selection_layer($$renderer6, {
                      id,
                      preventOverflowTextSelection,
                      onPointerDown,
                      onPointerUp,
                      enabled,
                      ref,
                      children: ($$renderer7) => {
                        popper?.($$renderer7, {
                          props: mergeProps(restProps, floatingProps, dismissibleProps, focusScopeProps, { style: { pointerEvents: "auto" } }),
                          wrapperProps
                        });
                        $$renderer7.push(`<!---->`);
                      }
                    });
                  };
                  Dismissible_layer($$renderer5, {
                    id,
                    onInteractOutside,
                    onFocusOutside,
                    interactOutsideBehavior,
                    isValidEvent,
                    enabled,
                    ref,
                    children
                  });
                }
              }
            });
          };
          Focus_scope($$renderer3, {
            onOpenAutoFocus,
            onCloseAutoFocus,
            loop,
            enabled,
            trapFocus,
            forceMount: restProps.forceMount,
            ref,
            focusScope
          });
        }
        $$renderer3.push(`<!---->`);
      };
      Popper_content($$renderer2, {
        isStatic,
        id,
        side,
        sideOffset,
        align,
        alignOffset,
        arrowPadding,
        avoidCollisions,
        collisionBoundary,
        collisionPadding,
        sticky,
        hideWhenDetached,
        updatePositionStrategy,
        strategy,
        dir,
        wrapperId,
        style,
        onPlaced,
        customAnchor,
        enabled,
        tooltip,
        content,
        $$slots: { content: true }
      });
    }
  });
}
function Popper_layer($$renderer, $$props) {
  let {
    popper,
    open,
    onEscapeKeydown,
    escapeKeydownBehavior,
    preventOverflowTextSelection,
    id,
    onPointerDown,
    onPointerUp,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    sticky,
    hideWhenDetached,
    updatePositionStrategy,
    strategy,
    dir,
    preventScroll,
    wrapperId,
    style,
    onPlaced,
    onInteractOutside,
    onCloseAutoFocus,
    onOpenAutoFocus,
    onFocusOutside,
    interactOutsideBehavior = "close",
    loop,
    trapFocus = true,
    isValidEvent = () => false,
    customAnchor = null,
    isStatic = false,
    ref,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  {
    let presence = function($$renderer2) {
      Popper_layer_inner($$renderer2, spread_props([
        {
          popper,
          onEscapeKeydown,
          escapeKeydownBehavior,
          preventOverflowTextSelection,
          id,
          onPointerDown,
          onPointerUp,
          side,
          sideOffset,
          align,
          alignOffset,
          arrowPadding,
          avoidCollisions,
          collisionBoundary,
          collisionPadding,
          sticky,
          hideWhenDetached,
          updatePositionStrategy,
          strategy,
          dir,
          preventScroll,
          wrapperId,
          style,
          onPlaced,
          customAnchor,
          isStatic,
          enabled: open,
          onInteractOutside,
          onCloseAutoFocus,
          onOpenAutoFocus,
          interactOutsideBehavior,
          loop,
          trapFocus,
          isValidEvent,
          onFocusOutside,
          forceMount: false,
          ref
        },
        restProps
      ]));
    };
    Presence_layer($$renderer, { open, ref, presence });
  }
}
function Popper_layer_force_mount($$renderer, $$props) {
  let {
    popper,
    onEscapeKeydown,
    escapeKeydownBehavior,
    preventOverflowTextSelection,
    id,
    onPointerDown,
    onPointerUp,
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    avoidCollisions,
    collisionBoundary,
    collisionPadding,
    sticky,
    hideWhenDetached,
    updatePositionStrategy,
    strategy,
    dir,
    preventScroll,
    wrapperId,
    style,
    onPlaced,
    onInteractOutside,
    onCloseAutoFocus,
    onOpenAutoFocus,
    onFocusOutside,
    interactOutsideBehavior = "close",
    loop,
    trapFocus = true,
    isValidEvent = () => false,
    customAnchor = null,
    isStatic = false,
    enabled,
    $$slots,
    $$events,
    ...restProps
  } = $$props;
  Popper_layer_inner($$renderer, spread_props([
    {
      popper,
      onEscapeKeydown,
      escapeKeydownBehavior,
      preventOverflowTextSelection,
      id,
      onPointerDown,
      onPointerUp,
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      avoidCollisions,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      updatePositionStrategy,
      strategy,
      dir,
      preventScroll,
      wrapperId,
      style,
      onPlaced,
      customAnchor,
      isStatic,
      enabled,
      onInteractOutside,
      onCloseAutoFocus,
      onOpenAutoFocus,
      interactOutsideBehavior,
      loop,
      trapFocus,
      isValidEvent,
      onFocusOutside
    },
    restProps,
    { forceMount: true }
  ]));
}
class GraceArea {
  #opts;
  #enabled;
  #isPointerInTransit;
  #pointerGraceArea = null;
  constructor(opts) {
    this.#opts = opts;
    this.#enabled = derived(() => this.#opts.enabled());
    this.#isPointerInTransit = boxAutoReset(false, {
      afterMs: opts.transitTimeout ?? 300,
      onChange: (value) => {
        if (!this.#enabled()) return;
        this.#opts.setIsPointerInTransit?.(value);
      },
      getWindow: () => getWindow$1(this.#opts.triggerNode())
    });
    watch([opts.triggerNode, opts.contentNode, opts.enabled], ([triggerNode, contentNode, enabled]) => {
      if (!triggerNode || !contentNode || !enabled) return;
      const handleTriggerLeave = (e) => {
        this.#createGraceArea(e, contentNode);
      };
      const handleContentLeave = (e) => {
        this.#createGraceArea(e, triggerNode);
      };
      return executeCallbacks(on(triggerNode, "pointerleave", handleTriggerLeave), on(contentNode, "pointerleave", handleContentLeave));
    });
    watch(() => this.#pointerGraceArea, () => {
      const handleTrackPointerGrace = (e) => {
        if (!this.#pointerGraceArea) return;
        const target = e.target;
        if (!isElement$1(target)) return;
        const pointerPosition = { x: e.clientX, y: e.clientY };
        const hasEnteredTarget = opts.triggerNode()?.contains(target) || opts.contentNode()?.contains(target);
        const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, this.#pointerGraceArea);
        if (hasEnteredTarget) {
          this.#removeGraceArea();
        } else if (isPointerOutsideGraceArea) {
          this.#removeGraceArea();
          opts.onPointerExit();
        }
      };
      const doc = getDocument(opts.triggerNode() ?? opts.contentNode());
      if (!doc) return;
      return on(doc, "pointermove", handleTrackPointerGrace);
    });
  }
  #removeGraceArea() {
    this.#pointerGraceArea = null;
    this.#isPointerInTransit.current = false;
  }
  #createGraceArea(e, hoverTarget) {
    const currentTarget = e.currentTarget;
    if (!isHTMLElement$1(currentTarget)) return;
    const exitPoint = { x: e.clientX, y: e.clientY };
    const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
    const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide);
    const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
    const graceArea = getHull([...paddedExitPoints, ...hoverTargetPoints]);
    this.#pointerGraceArea = graceArea;
    this.#isPointerInTransit.current = true;
  }
}
function getExitSideFromRect(point, rect) {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);
  switch (Math.min(top, bottom, right, left)) {
    case left:
      return "left";
    case right:
      return "right";
    case top:
      return "top";
    case bottom:
      return "bottom";
    default:
      throw new Error("unreachable");
  }
}
function getPaddedExitPoints(exitPoint, exitSide, padding = 5) {
  const tipPadding = padding * 1.5;
  switch (exitSide) {
    case "top":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
        { x: exitPoint.x, y: exitPoint.y - tipPadding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      ];
    case "bottom":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x, y: exitPoint.y + tipPadding },
        { x: exitPoint.x + padding, y: exitPoint.y - padding }
      ];
    case "left":
      return [
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
        { x: exitPoint.x - tipPadding, y: exitPoint.y },
        { x: exitPoint.x + padding, y: exitPoint.y + padding }
      ];
    case "right":
      return [
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x + tipPadding, y: exitPoint.y },
        { x: exitPoint.x - padding, y: exitPoint.y + padding }
      ];
  }
}
function getPointsFromRect(rect) {
  const { top, right, bottom, left } = rect;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom }
  ];
}
function isPointInPolygon(point, polygon) {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function getHull(points) {
  const newPoints = points.slice();
  newPoints.sort((a, b) => {
    if (a.x < b.x) return -1;
    else if (a.x > b.x) return 1;
    else if (a.y < b.y) return -1;
    else if (a.y > b.y) return 1;
    else return 0;
  });
  return getHullPresorted(newPoints);
}
function getHullPresorted(points) {
  if (points.length <= 1) return points.slice();
  const upperHull = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    while (upperHull.length >= 2) {
      const q = upperHull[upperHull.length - 1];
      const r = upperHull[upperHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) upperHull.pop();
      else break;
    }
    upperHull.push(p);
  }
  upperHull.pop();
  const lowerHull = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (lowerHull.length >= 2) {
      const q = lowerHull[lowerHull.length - 1];
      const r = lowerHull[lowerHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) lowerHull.pop();
      else break;
    }
    lowerHull.push(p);
  }
  lowerHull.pop();
  if (upperHull.length === 1 && lowerHull.length === 1 && upperHull[0].x === lowerHull[0].x && upperHull[0].y === lowerHull[0].y) return upperHull;
  else return upperHull.concat(lowerHull);
}
function Dialog_close($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      disabled = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const closeState = DialogCloseState.create({
      variant: boxWith$1(() => "close"),
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v),
      disabled: boxWith$1(() => Boolean(disabled))
    });
    const mergedProps = mergeProps(restProps, closeState.props);
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
function Dialog_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      id = createId(uid),
      children,
      child,
      ref = null,
      forceMount = false,
      onCloseAutoFocus = noop,
      onOpenAutoFocus = noop,
      onEscapeKeydown = noop,
      onInteractOutside = noop,
      trapFocus = true,
      preventScroll = true,
      restoreScrollDelay = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = DialogContentState.create({
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v)
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
            onOpenAutoFocus,
            onCloseAutoFocus,
            focusScope
          });
        }
      };
      Presence_layer($$renderer2, spread_props([
        mergedProps,
        {
          forceMount,
          open: contentState.root.opts.open.current || forceMount,
          ref: contentState.opts.ref,
          presence,
          $$slots: { presence: true }
        }
      ]));
    }
    bind_props($$props, { ref });
  });
}
const defaultOpts = {
  immediate: true
};
class TimeoutFn {
  #opts;
  #interval;
  #cb;
  #timer = null;
  constructor(cb, interval, opts = {}) {
    this.#cb = cb;
    this.#interval = interval;
    this.#opts = { ...defaultOpts, ...opts };
    this.stop = this.stop.bind(this);
    this.start = this.start.bind(this);
    if (this.#opts.immediate && DEV) ;
    onDestroyEffect(this.stop);
  }
  #clear() {
    if (this.#timer !== null) {
      window.clearTimeout(this.#timer);
      this.#timer = null;
    }
  }
  stop() {
    this.#clear();
  }
  start(...args) {
    this.#clear();
    this.#timer = window.setTimeout(() => {
      this.#timer = null;
      this.#cb(...args);
    }, this.#interval);
  }
}
const tooltipAttrs = createBitsAttrs({ component: "tooltip", parts: ["content", "trigger"] });
const TooltipProviderContext = new Context("Tooltip.Provider");
const TooltipRootContext = new Context("Tooltip.Root");
class TooltipProviderState {
  static create(opts) {
    return TooltipProviderContext.set(new TooltipProviderState(opts));
  }
  opts;
  isOpenDelayed = true;
  isPointerInTransit = simpleBox(false);
  #timerFn;
  #openTooltip = null;
  constructor(opts) {
    this.opts = opts;
    this.#timerFn = new TimeoutFn(
      () => {
        this.isOpenDelayed = true;
      },
      this.opts.skipDelayDuration.current,
      { immediate: false }
    );
  }
  #startTimer = () => {
    const skipDuration = this.opts.skipDelayDuration.current;
    if (skipDuration === 0) {
      return;
    } else {
      this.#timerFn.start();
    }
  };
  #clearTimer = () => {
    this.#timerFn.stop();
  };
  onOpen = (tooltip) => {
    if (this.#openTooltip && this.#openTooltip !== tooltip) {
      this.#openTooltip.handleClose();
    }
    this.#clearTimer();
    this.isOpenDelayed = false;
    this.#openTooltip = tooltip;
  };
  onClose = (tooltip) => {
    if (this.#openTooltip === tooltip) {
      this.#openTooltip = null;
    }
    this.#startTimer();
  };
  isTooltipOpen = (tooltip) => {
    return this.#openTooltip === tooltip;
  };
}
class TooltipRootState {
  static create(opts) {
    return TooltipRootContext.set(new TooltipRootState(opts, TooltipProviderContext.get()));
  }
  opts;
  provider;
  #delayDuration = derived(() => this.opts.delayDuration.current ?? this.provider.opts.delayDuration.current);
  get delayDuration() {
    return this.#delayDuration();
  }
  set delayDuration($$value) {
    return this.#delayDuration($$value);
  }
  #disableHoverableContent = derived(() => this.opts.disableHoverableContent.current ?? this.provider.opts.disableHoverableContent.current);
  get disableHoverableContent() {
    return this.#disableHoverableContent();
  }
  set disableHoverableContent($$value) {
    return this.#disableHoverableContent($$value);
  }
  #disableCloseOnTriggerClick = derived(() => this.opts.disableCloseOnTriggerClick.current ?? this.provider.opts.disableCloseOnTriggerClick.current);
  get disableCloseOnTriggerClick() {
    return this.#disableCloseOnTriggerClick();
  }
  set disableCloseOnTriggerClick($$value) {
    return this.#disableCloseOnTriggerClick($$value);
  }
  #disabled = derived(() => this.opts.disabled.current ?? this.provider.opts.disabled.current);
  get disabled() {
    return this.#disabled();
  }
  set disabled($$value) {
    return this.#disabled($$value);
  }
  #ignoreNonKeyboardFocus = derived(() => this.opts.ignoreNonKeyboardFocus.current ?? this.provider.opts.ignoreNonKeyboardFocus.current);
  get ignoreNonKeyboardFocus() {
    return this.#ignoreNonKeyboardFocus();
  }
  set ignoreNonKeyboardFocus($$value) {
    return this.#ignoreNonKeyboardFocus($$value);
  }
  contentNode = null;
  triggerNode = null;
  #wasOpenDelayed = false;
  #timerFn;
  #stateAttr = derived(() => {
    if (!this.opts.open.current) return "closed";
    return this.#wasOpenDelayed ? "delayed-open" : "instant-open";
  });
  get stateAttr() {
    return this.#stateAttr();
  }
  set stateAttr($$value) {
    return this.#stateAttr($$value);
  }
  constructor(opts, provider) {
    this.opts = opts;
    this.provider = provider;
    this.#timerFn = new TimeoutFn(
      () => {
        this.#wasOpenDelayed = true;
        this.opts.open.current = true;
      },
      this.delayDuration ?? 0,
      { immediate: false }
    );
    new OpenChangeComplete({
      open: this.opts.open,
      ref: boxWith$1(() => this.contentNode),
      onComplete: () => {
        this.opts.onOpenChangeComplete.current(this.opts.open.current);
      }
    });
    watch(() => this.delayDuration, () => {
      if (this.delayDuration === void 0) return;
      this.#timerFn = new TimeoutFn(
        () => {
          this.#wasOpenDelayed = true;
          this.opts.open.current = true;
        },
        this.delayDuration,
        { immediate: false }
      );
    });
    watch(() => this.opts.open.current, (isOpen) => {
      if (isOpen) {
        this.provider.onOpen(this);
      } else {
        this.provider.onClose(this);
      }
    });
  }
  handleOpen = () => {
    this.#timerFn.stop();
    this.#wasOpenDelayed = false;
    this.opts.open.current = true;
  };
  handleClose = () => {
    this.#timerFn.stop();
    this.opts.open.current = false;
  };
  #handleDelayedOpen = () => {
    this.#timerFn.stop();
    const shouldSkipDelay = !this.provider.isOpenDelayed;
    const delayDuration = this.delayDuration ?? 0;
    if (shouldSkipDelay || delayDuration === 0) {
      this.#wasOpenDelayed = delayDuration > 0 && shouldSkipDelay;
      this.opts.open.current = true;
    } else {
      this.#timerFn.start();
    }
  };
  onTriggerEnter = () => {
    this.#handleDelayedOpen();
  };
  onTriggerLeave = () => {
    if (this.disableHoverableContent) {
      this.handleClose();
    } else {
      this.#timerFn.stop();
    }
  };
}
class TooltipTriggerState {
  static create(opts) {
    return new TooltipTriggerState(opts, TooltipRootContext.get());
  }
  opts;
  root;
  attachment;
  #isPointerDown = simpleBox(false);
  #hasPointerMoveOpened = false;
  #isDisabled = derived(() => this.opts.disabled.current || this.root.disabled);
  domContext;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.domContext = new DOMContext(opts.ref);
    this.attachment = attachRef(this.opts.ref, (v) => this.root.triggerNode = v);
  }
  handlePointerUp = () => {
    this.#isPointerDown.current = false;
  };
  #onpointerup = () => {
    if (this.#isDisabled()) return;
    this.#isPointerDown.current = false;
  };
  #onpointerdown = () => {
    if (this.#isDisabled()) return;
    this.#isPointerDown.current = true;
    this.domContext.getDocument().addEventListener(
      "pointerup",
      () => {
        this.handlePointerUp();
      },
      { once: true }
    );
  };
  #onpointermove = (e) => {
    if (this.#isDisabled()) return;
    if (e.pointerType === "touch") return;
    if (this.#hasPointerMoveOpened) return;
    if (this.root.provider.isPointerInTransit.current) return;
    this.root.onTriggerEnter();
    this.#hasPointerMoveOpened = true;
  };
  #onpointerleave = () => {
    if (this.#isDisabled()) return;
    this.root.onTriggerLeave();
    this.#hasPointerMoveOpened = false;
  };
  #onfocus = (e) => {
    if (this.#isPointerDown.current || this.#isDisabled()) return;
    if (this.root.ignoreNonKeyboardFocus && !isFocusVisible(e.currentTarget)) return;
    this.root.handleOpen();
  };
  #onblur = () => {
    if (this.#isDisabled()) return;
    this.root.handleClose();
  };
  #onclick = () => {
    if (this.root.disableCloseOnTriggerClick || this.#isDisabled()) return;
    this.root.handleClose();
  };
  #props = derived(() => ({
    id: this.opts.id.current,
    "aria-describedby": this.root.opts.open.current ? this.root.contentNode?.id : void 0,
    "data-state": this.root.stateAttr,
    "data-disabled": boolToEmptyStrOrUndef(this.#isDisabled()),
    "data-delay-duration": `${this.root.delayDuration}`,
    [tooltipAttrs.trigger]: "",
    tabindex: this.#isDisabled() ? void 0 : 0,
    disabled: this.opts.disabled.current,
    onpointerup: this.#onpointerup,
    onpointerdown: this.#onpointerdown,
    onpointermove: this.#onpointermove,
    onpointerleave: this.#onpointerleave,
    onfocus: this.#onfocus,
    onblur: this.#onblur,
    onclick: this.#onclick,
    ...this.attachment
  }));
  get props() {
    return this.#props();
  }
  set props($$value) {
    return this.#props($$value);
  }
}
class TooltipContentState {
  static create(opts) {
    return new TooltipContentState(opts, TooltipRootContext.get());
  }
  opts;
  root;
  attachment;
  constructor(opts, root) {
    this.opts = opts;
    this.root = root;
    this.attachment = attachRef(this.opts.ref, (v) => this.root.contentNode = v);
    new GraceArea({
      triggerNode: () => this.root.triggerNode,
      contentNode: () => this.root.contentNode,
      enabled: () => this.root.opts.open.current && !this.root.disableHoverableContent,
      onPointerExit: () => {
        if (this.root.provider.isTooltipOpen(this.root)) {
          this.root.handleClose();
        }
      },
      setIsPointerInTransit: (value) => {
        this.root.provider.isPointerInTransit.current = value;
      },
      transitTimeout: this.root.provider.opts.skipDelayDuration.current
    });
  }
  onInteractOutside = (e) => {
    if (isElement$1(e.target) && this.root.triggerNode?.contains(e.target) && this.root.disableCloseOnTriggerClick) {
      e.preventDefault();
      return;
    }
    this.opts.onInteractOutside.current(e);
    if (e.defaultPrevented) return;
    this.root.handleClose();
  };
  onEscapeKeydown = (e) => {
    this.opts.onEscapeKeydown.current?.(e);
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
    "data-state": this.root.stateAttr,
    "data-disabled": boolToEmptyStrOrUndef(this.root.disabled),
    style: { pointerEvents: "auto", outline: "none" },
    [tooltipAttrs.content]: "",
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
    onCloseAutoFocus: this.onCloseAutoFocus
  };
}
function Tooltip($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      open = false,
      onOpenChange = noop,
      onOpenChangeComplete = noop,
      disabled,
      delayDuration,
      disableCloseOnTriggerClick,
      disableHoverableContent,
      ignoreNonKeyboardFocus,
      children
    } = $$props;
    TooltipRootState.create({
      open: boxWith$1(() => open, (v) => {
        open = v;
        onOpenChange(v);
      }),
      delayDuration: boxWith$1(() => delayDuration),
      disableCloseOnTriggerClick: boxWith$1(() => disableCloseOnTriggerClick),
      disableHoverableContent: boxWith$1(() => disableHoverableContent),
      ignoreNonKeyboardFocus: boxWith$1(() => ignoreNonKeyboardFocus),
      disabled: boxWith$1(() => disabled),
      onOpenChangeComplete: boxWith$1(() => onOpenChangeComplete)
    });
    Floating_layer($$renderer2, {
      tooltip: true,
      children: ($$renderer3) => {
        children?.($$renderer3);
        $$renderer3.push(`<!---->`);
      }
    });
    bind_props($$props, { open });
  });
}
function Tooltip_content$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      ref = null,
      side = "top",
      sideOffset = 0,
      align = "center",
      avoidCollisions = true,
      arrowPadding = 0,
      sticky = "partial",
      strategy,
      hideWhenDetached = false,
      collisionPadding = 0,
      onInteractOutside = noop,
      onEscapeKeydown = noop,
      forceMount = false,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const contentState = TooltipContentState.create({
      id: boxWith$1(() => id),
      ref: boxWith$1(() => ref, (v) => ref = v),
      onInteractOutside: boxWith$1(() => onInteractOutside),
      onEscapeKeydown: boxWith$1(() => onEscapeKeydown)
    });
    const floatingProps = {
      side,
      sideOffset,
      align,
      avoidCollisions,
      arrowPadding,
      sticky,
      hideWhenDetached,
      collisionPadding,
      strategy
    };
    const mergedProps = mergeProps(restProps, floatingProps, contentState.props);
    if (forceMount) {
      $$renderer2.push("<!--[-->");
      {
        let popper = function($$renderer3, { props, wrapperProps }) {
          const mergedProps2 = mergeProps(props, { style: getFloatingContentCSSVars("tooltip") });
          if (child) {
            $$renderer3.push("<!--[-->");
            child($$renderer3, {
              props: mergedProps2,
              wrapperProps,
              ...contentState.snippetProps
            });
            $$renderer3.push(`<!---->`);
          } else {
            $$renderer3.push("<!--[!-->");
            $$renderer3.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...mergedProps2 })}>`);
            children?.($$renderer3);
            $$renderer3.push(`<!----></div></div>`);
          }
          $$renderer3.push(`<!--]-->`);
        };
        Popper_layer_force_mount($$renderer2, spread_props([
          mergedProps,
          contentState.popperProps,
          {
            enabled: contentState.root.opts.open.current,
            id,
            trapFocus: false,
            loop: false,
            preventScroll: false,
            forceMount: true,
            ref: contentState.opts.ref,
            tooltip: true,
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
            const mergedProps2 = mergeProps(props, { style: getFloatingContentCSSVars("tooltip") });
            if (child) {
              $$renderer3.push("<!--[-->");
              child($$renderer3, {
                props: mergedProps2,
                wrapperProps,
                ...contentState.snippetProps
              });
              $$renderer3.push(`<!---->`);
            } else {
              $$renderer3.push("<!--[!-->");
              $$renderer3.push(`<div${attributes({ ...wrapperProps })}><div${attributes({ ...mergedProps2 })}>`);
              children?.($$renderer3);
              $$renderer3.push(`<!----></div></div>`);
            }
            $$renderer3.push(`<!--]-->`);
          };
          Popper_layer($$renderer2, spread_props([
            mergedProps,
            contentState.popperProps,
            {
              open: contentState.root.opts.open.current,
              id,
              trapFocus: false,
              loop: false,
              preventScroll: false,
              forceMount: false,
              ref: contentState.opts.ref,
              tooltip: true,
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
function Tooltip_trigger$1($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const uid = props_id($$renderer2);
    let {
      children,
      child,
      id = createId(uid),
      disabled = false,
      type = "button",
      ref = null,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const triggerState = TooltipTriggerState.create({
      id: boxWith$1(() => id),
      disabled: boxWith$1(() => disabled ?? false),
      ref: boxWith$1(() => ref, (v) => ref = v)
    });
    const mergedProps = mergeProps(restProps, triggerState.props, { type });
    Floating_layer_anchor($$renderer2, {
      id,
      ref: triggerState.opts.ref,
      tooltip: true,
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
function Tooltip_arrow($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      Floating_layer_arrow($$renderer3, spread_props([
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
function Tooltip_provider($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      children,
      delayDuration = 700,
      disableCloseOnTriggerClick = false,
      disableHoverableContent = false,
      disabled = false,
      ignoreNonKeyboardFocus = false,
      skipDelayDuration = 300
    } = $$props;
    TooltipProviderState.create({
      delayDuration: boxWith$1(() => delayDuration),
      disableCloseOnTriggerClick: boxWith$1(() => disableCloseOnTriggerClick),
      disableHoverableContent: boxWith$1(() => disableHoverableContent),
      disabled: boxWith$1(() => disabled),
      ignoreNonKeyboardFocus: boxWith$1(() => ignoreNonKeyboardFocus),
      skipDelayDuration: boxWith$1(() => skipDelayDuration)
    });
    children?.($$renderer2);
    $$renderer2.push(`<!---->`);
  });
}
const alertVariants = T({
  base: "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  variants: {
    variant: {
      default: "bg-card text-card-foreground",
      destructive: "text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current"
    }
  },
  defaultVariants: { variant: "default" }
});
function Alert($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      variant = "default",
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<div${attributes({
      "data-slot": "alert",
      class: clsx(cn(alertVariants({ variant }), className)),
      ...restProps,
      role: "alert"
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}
class AssetsApi {
  /**
   * List assets with optional filters
   */
  static async list(filters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== void 0) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get(`/assets${query ? `?${query}` : ""}`);
  }
  /**
   * Get asset by ID
   */
  static async getById(id) {
    return apiClient.get(`/assets/${id}`);
  }
  /**
   * Upload a new asset (multipart/form-data)
   * Note: Use FormData for file uploads
   */
  static async upload(formData) {
    return apiClient.post("/assets", formData);
  }
  /**
   * Update asset metadata
   */
  static async update(id, data) {
    return apiClient.patch(`/assets/${id}`, data);
  }
  /**
   * Delete an asset
   */
  static async delete(id) {
    return apiClient.delete(`/assets/${id}`);
  }
}
({
  list: AssetsApi.list.bind(AssetsApi),
  getById: AssetsApi.getById.bind(AssetsApi),
  upload: AssetsApi.upload.bind(AssetsApi),
  update: AssetsApi.update.bind(AssetsApi),
  delete: AssetsApi.delete.bind(AssetsApi)
});
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
const defaultAttributes = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round"
};
function Icon($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const {
      name,
      color = "currentColor",
      size: size2 = 24,
      strokeWidth = 2,
      absoluteStrokeWidth = false,
      iconNode = [],
      children,
      $$slots,
      $$events,
      ...props
    } = $$props;
    $$renderer2.push(`<svg${attributes(
      {
        ...defaultAttributes,
        ...props,
        width: size2,
        height: size2,
        stroke: color,
        "stroke-width": absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size2) : strokeWidth,
        class: clsx(["lucide-icon lucide", name && `lucide-${name}`, props.class])
      },
      void 0,
      void 0,
      void 0,
      3
    )}><!--[-->`);
    const each_array = ensure_array_like(iconNode);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let [tag, attrs] = each_array[$$index];
      element($$renderer2, tag, () => {
        $$renderer2.push(`${attributes({ ...attrs }, void 0, void 0, void 0, 3)}`);
      });
    }
    $$renderer2.push(`<!--]-->`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></svg>`);
  });
}
function X($$renderer, $$props) {
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
const DEFAULT_MOBILE_BREAKPOINT = 768;
class IsMobile extends MediaQuery {
  constructor(breakpoint = DEFAULT_MOBILE_BREAKPOINT) {
    super(`max-width: ${breakpoint - 1}px`);
  }
}
const SIDEBAR_COOKIE_NAME = "sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
class SidebarState {
  props;
  #open = derived(() => this.props.open());
  get open() {
    return this.#open();
  }
  set open($$value) {
    return this.#open($$value);
  }
  openMobile = false;
  setOpen;
  #isMobile;
  #state = derived(() => this.open ? "expanded" : "collapsed");
  get state() {
    return this.#state();
  }
  set state($$value) {
    return this.#state($$value);
  }
  constructor(props) {
    this.setOpen = props.setOpen;
    this.#isMobile = new IsMobile();
    this.props = props;
  }
  // Convenience getter for checking if the sidebar is mobile
  // without this, we would need to use `sidebar.isMobile.current` everywhere
  get isMobile() {
    return this.#isMobile.current;
  }
  // Event handler to apply to the `<svelte:window>`
  handleShortcutKeydown = (e) => {
    if (e.key === SIDEBAR_KEYBOARD_SHORTCUT && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.toggle();
    }
  };
  setOpenMobile = (value) => {
    this.openMobile = value;
  };
  toggle = () => {
    return this.#isMobile.current ? this.openMobile = !this.openMobile : this.setOpen(!this.open);
  };
}
const SYMBOL_KEY = "scn-sidebar";
function setSidebar(props) {
  return setContext(Symbol.for(SYMBOL_KEY), new SidebarState(props));
}
function useSidebar() {
  return getContext(Symbol.for(SYMBOL_KEY));
}
function Tooltip_trigger($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { ref = null, $$slots, $$events, ...restProps } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Tooltip_trigger$1($$renderer3, spread_props([
        { "data-slot": "tooltip-trigger" },
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
function Tooltip_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      sideOffset = 0,
      side = "top",
      children,
      arrowClasses,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    let $$settled = true;
    let $$inner_renderer;
    function $$render_inner($$renderer3) {
      $$renderer3.push(`<!---->`);
      Portal($$renderer3, {
        children: ($$renderer4) => {
          $$renderer4.push(`<!---->`);
          Tooltip_content$1($$renderer4, spread_props([
            {
              "data-slot": "tooltip-content",
              sideOffset,
              side,
              class: cn("bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--bits-tooltip-content-transform-origin) z-50 w-fit text-balance rounded-md px-3 py-1.5 text-xs", className)
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
                $$renderer5.push(`<!----> <!---->`);
                {
                  let child = function($$renderer6, { props }) {
                    $$renderer6.push(`<div${attributes({
                      class: clsx(cn("bg-primary z-50 size-2.5 rotate-45 rounded-[2px]", "data-[side=top]:translate-x-1/2 data-[side=top]:translate-y-[calc(-50%_+_2px)]", "data-[side=bottom]:-translate-x-1/2 data-[side=bottom]:-translate-y-[calc(-50%_+_1px)]", "data-[side=right]:translate-x-[calc(50%_+_2px)] data-[side=right]:translate-y-1/2", "data-[side=left]:-translate-y-[calc(50%_-_3px)]", arrowClasses)),
                      ...props
                    })}></div>`);
                  };
                  Tooltip_arrow($$renderer5, { child, $$slots: { child: true } });
                }
                $$renderer5.push(`<!---->`);
              },
              $$slots: { default: true }
            }
          ]));
          $$renderer4.push(`<!---->`);
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
const Root = Tooltip;
const Provider = Tooltip_provider;
const sidebarMenuButtonVariants = T({
  base: "peer/menu-button outline-hidden ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground group-has-data-[sidebar=menu-action]/menu-item:pr-8 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm transition-[width,height,padding] focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:font-medium [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  variants: {
    variant: {
      default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      outline: "bg-background hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shadow-[0_0_0_1px_var(--sidebar-border)] hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
    },
    size: {
      default: "h-8 text-sm",
      sm: "h-7 text-xs",
      lg: "group-data-[collapsible=icon]:p-0! h-12 text-sm"
    }
  },
  defaultVariants: { variant: "default", size: "default" }
});
function Sidebar_menu_button($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      child,
      variant = "default",
      size: size2 = "default",
      isActive = false,
      tooltipContent,
      tooltipContentProps,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    const sidebar = useSidebar();
    const buttonProps = {
      class: cn(sidebarMenuButtonVariants({ variant, size: size2 }), className),
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-size": size2,
      "data-active": isActive,
      ...restProps
    };
    function Button($$renderer3, { props }) {
      const mergedProps = mergeProps(buttonProps, props);
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
    if (!tooltipContent) {
      $$renderer2.push("<!--[-->");
      Button($$renderer2, {});
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!---->`);
      Root($$renderer2, {
        children: ($$renderer3) => {
          $$renderer3.push(`<!---->`);
          {
            let child2 = function($$renderer4, { props }) {
              Button($$renderer4, { props });
            };
            Tooltip_trigger($$renderer3, { child: child2, $$slots: { child: true } });
          }
          $$renderer3.push(`<!----> <!---->`);
          Tooltip_content($$renderer3, spread_props([
            {
              side: "right",
              align: "center",
              hidden: sidebar.state !== "collapsed" || sidebar.isMobile
            },
            tooltipContentProps,
            {
              children: ($$renderer4) => {
                if (typeof tooltipContent === "string") {
                  $$renderer4.push("<!--[-->");
                  $$renderer4.push(`${escape_html(tooltipContent)}`);
                } else {
                  $$renderer4.push("<!--[!-->");
                  if (tooltipContent) {
                    $$renderer4.push("<!--[-->");
                    tooltipContent($$renderer4);
                    $$renderer4.push(`<!---->`);
                  } else {
                    $$renderer4.push("<!--[!-->");
                  }
                  $$renderer4.push(`<!--]-->`);
                }
                $$renderer4.push(`<!--]-->`);
              },
              $$slots: { default: true }
            }
          ]));
          $$renderer3.push(`<!---->`);
        },
        $$slots: { default: true }
      });
      $$renderer2.push(`<!---->`);
    }
    $$renderer2.push(`<!--]-->`);
    bind_props($$props, { ref });
  });
}
function Sheet_overlay($$renderer, $$props) {
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
          "data-slot": "sheet-overlay",
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
const sheetVariants = T({
  base: "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  variants: {
    side: {
      top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
      bottom: "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t",
      left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm"
    }
  },
  defaultVariants: { side: "right" }
});
function Sheet_content($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      side = "right",
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
      Portal($$renderer3, spread_props([
        portalProps,
        {
          children: ($$renderer4) => {
            Sheet_overlay($$renderer4, {});
            $$renderer4.push(`<!----> <!---->`);
            Dialog_content($$renderer4, spread_props([
              {
                "data-slot": "sheet-content",
                class: cn(sheetVariants({ side }), className)
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
                  $$renderer5.push(`<!----> <!---->`);
                  Dialog_close($$renderer5, {
                    class: "ring-offset-background focus-visible:ring-ring rounded-xs focus-visible:outline-hidden absolute right-4 top-4 opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none",
                    children: ($$renderer6) => {
                      X($$renderer6, { class: "size-4" });
                      $$renderer6.push(`<!----> <span class="sr-only">Close</span>`);
                    },
                    $$slots: { default: true }
                  });
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
class OrganizationsApi {
  /**
   * List user's organizations
   */
  static async list() {
    return apiClient.get("/organizations");
  }
  /**
   * Create new organization (super_admin only)
   */
  static async create(data) {
    return apiClient.post("/organizations", data);
  }
  /**
   * Switch to a different organization
   */
  static async switch(data) {
    return apiClient.post("/organizations/switch", data);
  }
  /**
   * Get organization by ID
   */
  static async getById(id) {
    return apiClient.get(`/organizations/${id}`);
  }
  /**
   * Get active organization
   */
  static async getActive() {
    const result = await this.list();
    const active = result.data?.find((org) => org.isActive);
    if (!active) {
      throw new Error("No active organization found");
    }
    return {
      success: true,
      data: active
    };
  }
  /**
   * Get organization members
   */
  static async getMembers() {
    return apiClient.get("/organizations/members");
  }
  /**
   * Invite a member to the organization
   */
  static async inviteMember(data) {
    return apiClient.post("/organizations/invitations", data);
  }
  /**
   * Remove a member from the organization
   */
  static async removeMember(data) {
    return apiClient.delete("/organizations/members", data);
  }
  /**
   * Update a member's role
   */
  static async updateMemberRole(data) {
    return apiClient.patch("/organizations/members", data);
  }
  /**
   * Update organization settings
   */
  static async update(id, data) {
    return apiClient.patch(`/organizations/${id}`, data);
  }
  /**
   * Cancel a pending invitation
   */
  static async cancelInvitation(data) {
    return apiClient.delete("/organizations/invitations", data);
  }
}
const organizations = {
  list: OrganizationsApi.list.bind(OrganizationsApi),
  create: OrganizationsApi.create.bind(OrganizationsApi),
  switch: OrganizationsApi.switch.bind(OrganizationsApi),
  getById: OrganizationsApi.getById.bind(OrganizationsApi),
  getActive: OrganizationsApi.getActive.bind(OrganizationsApi),
  update: OrganizationsApi.update.bind(OrganizationsApi),
  getMembers: OrganizationsApi.getMembers.bind(OrganizationsApi),
  inviteMember: OrganizationsApi.inviteMember.bind(OrganizationsApi),
  removeMember: OrganizationsApi.removeMember.bind(OrganizationsApi),
  updateMemberRole: OrganizationsApi.updateMemberRole.bind(OrganizationsApi),
  cancelInvitation: OrganizationsApi.cancelInvitation.bind(OrganizationsApi)
};
const defaultWindow$1 = void 0;
function getActiveElement$1(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
let ActiveElement$1 = class ActiveElement {
  #document;
  #subscribe;
  constructor(options = {}) {
    const { window: window2 = defaultWindow$1, document: document2 = window2?.document } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement$1(this.#document);
  }
};
new ActiveElement$1();
function getStorage(storageType, window2) {
  switch (storageType) {
    case "local":
      return window2.localStorage;
    case "session":
      return window2.sessionStorage;
  }
}
class PersistedState {
  #current;
  #key;
  #serializer;
  #storage;
  #subscribe;
  #version = 0;
  constructor(key, initialValue, options = {}) {
    const {
      storage: storageType = "local",
      serializer = { serialize: JSON.stringify, deserialize: JSON.parse },
      syncTabs = true,
      window: window2 = defaultWindow$1
    } = options;
    this.#current = initialValue;
    this.#key = key;
    this.#serializer = serializer;
    if (window2 === void 0) return;
    const storage = getStorage(storageType, window2);
    this.#storage = storage;
    const existingValue = storage.getItem(key);
    if (existingValue !== null) {
      this.#current = this.#deserialize(existingValue);
    } else {
      this.#serialize(initialValue);
    }
    if (syncTabs && storageType === "local") {
      this.#subscribe = createSubscriber();
    }
  }
  get current() {
    this.#subscribe?.();
    this.#version;
    const root = this.#deserialize(this.#storage?.getItem(this.#key)) ?? this.#current;
    const proxies = /* @__PURE__ */ new WeakMap();
    const proxy = (value) => {
      if (value === null || value?.constructor.name === "Date" || typeof value !== "object") {
        return value;
      }
      let p = proxies.get(value);
      if (!p) {
        p = new Proxy(value, {
          get: (target, property) => {
            this.#version;
            return proxy(Reflect.get(target, property));
          },
          set: (target, property, value2) => {
            this.#version += 1;
            Reflect.set(target, property, value2);
            this.#serialize(root);
            return true;
          }
        });
        proxies.set(value, p);
      }
      return p;
    };
    return proxy(root);
  }
  set current(newValue) {
    this.#serialize(newValue);
    this.#version += 1;
  }
  #handleStorageEvent = (event) => {
    if (event.key !== this.#key || event.newValue === null) return;
    this.#current = this.#deserialize(event.newValue);
    this.#version += 1;
  };
  #deserialize(value) {
    try {
      return this.#serializer.deserialize(value);
    } catch (error) {
      console.error(`Error when parsing "${value}" from persisted store "${this.#key}"`, error);
      return;
    }
  }
  #serialize(value) {
    try {
      if (value != void 0) {
        this.#storage?.setItem(this.#key, this.#serializer.serialize(value));
      }
    } catch (error) {
      console.error(`Error when writing value from persisted store "${this.#key}" to ${this.#storage}`, error);
    }
  }
}
function sanitizeClassNames(classNames) {
  return classNames.filter((className) => className.length > 0);
}
const noopStorage = {
  getItem: (_key) => null,
  setItem: (_key, _value) => {
  }
};
const isBrowser = typeof document !== "undefined";
function isFunction(value) {
  return typeof value === "function";
}
function isObject(value) {
  return value !== null && typeof value === "object";
}
const BoxSymbol = Symbol("box");
const isWritableSymbol = Symbol("is-writable");
function isBox(value) {
  return isObject(value) && BoxSymbol in value;
}
function isWritableBox(value) {
  return box.isBox(value) && isWritableSymbol in value;
}
function box(initialValue) {
  let current = initialValue;
  return {
    [BoxSymbol]: true,
    [isWritableSymbol]: true,
    get current() {
      return current;
    },
    set current(v) {
      current = v;
    }
  };
}
function boxWith(getter, setter) {
  const derived2 = getter();
  if (setter) {
    return {
      [BoxSymbol]: true,
      [isWritableSymbol]: true,
      get current() {
        return derived2;
      },
      set current(v) {
        setter(v);
      }
    };
  }
  return {
    [BoxSymbol]: true,
    get current() {
      return getter();
    }
  };
}
function boxFrom(value) {
  if (box.isBox(value)) return value;
  if (isFunction(value)) return box.with(value);
  return box(value);
}
function boxFlatten(boxes) {
  return Object.entries(boxes).reduce(
    (acc, [key, b]) => {
      if (!box.isBox(b)) {
        return Object.assign(acc, { [key]: b });
      }
      if (box.isWritableBox(b)) {
        Object.defineProperty(acc, key, {
          get() {
            return b.current;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(v) {
            b.current = v;
          }
        });
      } else {
        Object.defineProperty(acc, key, {
          get() {
            return b.current;
          }
        });
      }
      return acc;
    },
    {}
  );
}
function toReadonlyBox(b) {
  if (!box.isWritableBox(b)) return b;
  return {
    [BoxSymbol]: true,
    get current() {
      return b.current;
    }
  };
}
box.from = boxFrom;
box.with = boxWith;
box.flatten = boxFlatten;
box.readonly = toReadonlyBox;
box.isBox = isBox;
box.isWritableBox = isWritableBox;
function createParser(matcher, replacer) {
  const regex = RegExp(matcher, "g");
  return (str) => {
    if (typeof str !== "string") {
      throw new TypeError(`expected an argument of type string, but got ${typeof str}`);
    }
    if (!str.match(regex))
      return str;
    return str.replace(regex, replacer);
  };
}
const camelToKebab = createParser(/[A-Z]/, (match) => `-${match.toLowerCase()}`);
function styleToCSS(styleObj) {
  if (!styleObj || typeof styleObj !== "object" || Array.isArray(styleObj)) {
    throw new TypeError(`expected an argument of type object, but got ${typeof styleObj}`);
  }
  return Object.keys(styleObj).map((property) => `${camelToKebab(property)}: ${styleObj[property]};`).join("\n");
}
function styleToString(style = {}) {
  return styleToCSS(style).replace("\n", " ");
}
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
styleToString(srOnlyStyles);
const defaultWindow = void 0;
function getActiveElement(document2) {
  let activeElement = document2.activeElement;
  while (activeElement?.shadowRoot) {
    const node = activeElement.shadowRoot.activeElement;
    if (node === activeElement)
      break;
    else
      activeElement = node;
  }
  return activeElement;
}
class ActiveElement2 {
  #document;
  #subscribe;
  constructor(options = {}) {
    const { window: window2 = defaultWindow, document: document2 = window2?.document } = options;
    if (window2 === void 0) return;
    this.#document = document2;
    this.#subscribe = createSubscriber();
  }
  get current() {
    this.#subscribe?.();
    if (!this.#document) return null;
    return getActiveElement(this.#document);
  }
}
new ActiveElement2();
const modeStorageKey = box("mode-watcher-mode");
const themeStorageKey = box("mode-watcher-theme");
const modes = ["dark", "light", "system"];
function isValidMode(value) {
  if (typeof value !== "string")
    return false;
  return modes.includes(value);
}
class UserPrefersMode {
  #defaultValue = "system";
  #storage = isBrowser ? localStorage : noopStorage;
  #initialValue = this.#storage.getItem(modeStorageKey.current);
  #value = isValidMode(this.#initialValue) ? this.#initialValue : this.#defaultValue;
  #persisted = this.#makePersisted();
  #makePersisted(value = this.#value) {
    return new PersistedState(modeStorageKey.current, value, {
      serializer: {
        serialize: (v) => v,
        deserialize: (v) => {
          if (isValidMode(v)) return v;
          return this.#defaultValue;
        }
      }
    });
  }
  constructor() {
  }
  get current() {
    return this.#persisted.current;
  }
  set current(newValue) {
    this.#persisted.current = newValue;
  }
}
class SystemPrefersMode {
  #defaultValue = void 0;
  #track = true;
  #current = this.#defaultValue;
  #mediaQueryState = typeof window !== "undefined" && typeof window.matchMedia === "function" ? new MediaQuery("prefers-color-scheme: light") : { current: false };
  query() {
    if (!isBrowser) return;
    this.#current = this.#mediaQueryState.current ? "light" : "dark";
  }
  tracking(active) {
    this.#track = active;
  }
  constructor() {
    this.query = this.query.bind(this);
    this.tracking = this.tracking.bind(this);
  }
  get current() {
    return this.#current;
  }
}
const userPrefersMode = new UserPrefersMode();
const systemPrefersMode = new SystemPrefersMode();
class CustomTheme {
  #storage = isBrowser ? localStorage : noopStorage;
  #initialValue = this.#storage.getItem(themeStorageKey.current);
  #value = this.#initialValue === null || this.#initialValue === void 0 ? "" : this.#initialValue;
  #persisted = this.#makePersisted();
  #makePersisted(value = this.#value) {
    return new PersistedState(themeStorageKey.current, value, {
      serializer: {
        serialize: (v) => {
          if (typeof v !== "string") return "";
          return v;
        },
        deserialize: (v) => v
      }
    });
  }
  constructor() {
  }
  /**
   * The current theme.
   * @returns The current theme.
   */
  get current() {
    return this.#persisted.current;
  }
  /**
   * Set the current theme.
   * @param newValue The new theme to set.
   */
  set current(newValue) {
    this.#persisted.current = newValue;
  }
}
const customTheme = new CustomTheme();
let timeoutAction;
let timeoutEnable;
let hasLoaded = false;
let styleElement = null;
function getStyleElement() {
  if (styleElement)
    return styleElement;
  styleElement = document.createElement("style");
  styleElement.appendChild(document.createTextNode(`* {
		-webkit-transition: none !important;
		-moz-transition: none !important;
		-o-transition: none !important;
		-ms-transition: none !important;
		transition: none !important;
	}`));
  return styleElement;
}
function withoutTransition(action, synchronous = false) {
  if (typeof document === "undefined")
    return;
  if (!hasLoaded) {
    hasLoaded = true;
    action();
    return;
  }
  const isTest = typeof process !== "undefined" && process.env?.NODE_ENV === "test" || typeof window !== "undefined" && window.__vitest_worker__;
  if (isTest) {
    action();
    return;
  }
  clearTimeout(timeoutAction);
  clearTimeout(timeoutEnable);
  const style = getStyleElement();
  const disable = () => document.head.appendChild(style);
  const enable = () => {
    if (style.parentNode) {
      document.head.removeChild(style);
    }
  };
  function executeAction() {
    action();
    window.requestAnimationFrame(enable);
  }
  if (typeof window.requestAnimationFrame !== "undefined") {
    disable();
    if (synchronous) {
      executeAction();
    } else {
      window.requestAnimationFrame(() => {
        executeAction();
      });
    }
    return;
  }
  disable();
  timeoutAction = window.setTimeout(() => {
    action();
    timeoutEnable = window.setTimeout(enable, 16);
  }, 16);
}
const themeColors = box(void 0);
const disableTransitions = box(true);
const synchronousModeChanges = box(false);
const darkClassNames = box([]);
const lightClassNames = box([]);
function createDerivedMode() {
  const current = (() => {
    if (!isBrowser) return void 0;
    const derivedMode2 = userPrefersMode.current === "system" ? systemPrefersMode.current : userPrefersMode.current;
    const sanitizedDarkClassNames = sanitizeClassNames(darkClassNames.current);
    const sanitizedLightClassNames = sanitizeClassNames(lightClassNames.current);
    function update() {
      const htmlEl = document.documentElement;
      const themeColorEl = document.querySelector('meta[name="theme-color"]');
      if (derivedMode2 === "light") {
        if (sanitizedDarkClassNames.length) htmlEl.classList.remove(...sanitizedDarkClassNames);
        if (sanitizedLightClassNames.length) htmlEl.classList.add(...sanitizedLightClassNames);
        htmlEl.style.colorScheme = "light";
        if (themeColorEl && themeColors.current) {
          themeColorEl.setAttribute("content", themeColors.current.light);
        }
      } else {
        if (sanitizedLightClassNames.length) htmlEl.classList.remove(...sanitizedLightClassNames);
        if (sanitizedDarkClassNames.length) htmlEl.classList.add(...sanitizedDarkClassNames);
        htmlEl.style.colorScheme = "dark";
        if (themeColorEl && themeColors.current) {
          themeColorEl.setAttribute("content", themeColors.current.dark);
        }
      }
    }
    if (disableTransitions.current) {
      withoutTransition(update, synchronousModeChanges.current);
    } else {
      update();
    }
    return derivedMode2;
  })();
  return {
    get current() {
      return current;
    }
  };
}
function createDerivedTheme() {
  const current = (() => {
    customTheme.current;
    if (!isBrowser) return void 0;
    function update() {
      const htmlEl = document.documentElement;
      htmlEl.setAttribute("data-theme", customTheme.current);
    }
    if (disableTransitions.current) {
      withoutTransition(update, run(() => synchronousModeChanges.current));
    } else {
      update();
    }
    return customTheme.current;
  })();
  return {
    get current() {
      return current;
    }
  };
}
const derivedMode = createDerivedMode();
createDerivedTheme();

export { Alert as A, Badge as B, Dialog_content as D, Floating_layer as F, GraceArea as G, Icon as I, Provider as P, RovingFocusGroup as R, SIDEBAR_COOKIE_NAME as S, X, SIDEBAR_COOKIE_MAX_AGE as a, disableTransitions as b, themeColors as c, darkClassNames as d, synchronousModeChanges as e, Sheet_content as f, SIDEBAR_WIDTH as g, SIDEBAR_WIDTH_ICON as h, SIDEBAR_WIDTH_MOBILE as i, userPrefersMode as j, derivedMode as k, lightClassNames as l, modeStorageKey as m, Sidebar_menu_button as n, Floating_layer_anchor as o, Popper_layer_force_mount as p, Popper_layer as q, getFloatingContentCSSVars as r, setSidebar as s, themeStorageKey as t, useSidebar as u, organizations as v, boxAutoReset as w, documents as x, ApiError as y, Dialog_close as z };
//# sourceMappingURL=states.svelte-CFLau3Qg.js.map
