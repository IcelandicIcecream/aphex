import { a as attributes, c as clsx, b as bind_props } from './index5-DltsKoco.js';
import { c as cn } from './utils2-CVx6kO_W.js';

function Card_footer($$renderer, $$props) {
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
      "data-slot": "card-footer",
      class: clsx(cn("flex items-center px-6 [.border-t]:pt-6", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></div>`);
    bind_props($$props, { ref });
  });
}

export { Card_footer as C };
//# sourceMappingURL=card-footer-CVs8Uocz.js.map
