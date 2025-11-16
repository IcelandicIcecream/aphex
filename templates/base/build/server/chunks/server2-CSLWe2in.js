import { f as resolve_route, b as base } from './routing-lpprPii4.js';
import { l as get_request_store } from './exports-Honk4keX.js';

function resolve(id, params) {
  const resolved = resolve_route(
    id,
    /** @type {Record<string, string>} */
    params
  );
  {
    const { event, state } = get_request_store();
    if (state.prerendering?.fallback) {
      return resolved;
    }
    const segments = event.url.pathname.slice(base.length).split("/").slice(2);
    const prefix = segments.map(() => "..").join("/") || ".";
    return prefix + resolved;
  }
}

export { resolve as r };
//# sourceMappingURL=server2-CSLWe2in.js.map
