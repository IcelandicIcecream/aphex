import { type ActionReturn } from "svelte/action";

export function onClick(node: HTMLElement, callback: (e: MouseEvent) => void): ActionReturn<HTMLElement> {
          node.addEventListener('click', callback);
          return {
                    destroy() {
                              node.removeEventListener('click', callback);
                    }
          };
}
