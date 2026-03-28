import { a as attributes, c as clsx, b as bind_props } from './index5-DltsKoco.js';
import { c as cn } from './utils2-CVx6kO_W.js';

function Card_description($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let {
      ref = null,
      class: className,
      children,
      $$slots,
      $$events,
      ...restProps
    } = $$props;
    $$renderer2.push(`<p${attributes({
      "data-slot": "card-description",
      class: clsx(cn("text-muted-foreground text-sm", className)),
      ...restProps
    })}>`);
    children?.($$renderer2);
    $$renderer2.push(`<!----></p>`);
    bind_props($$props, { ref });
  });
}

export { Card_description as C };
//# sourceMappingURL=card-description-B4j6Vmwc.js.map
