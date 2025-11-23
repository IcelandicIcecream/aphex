import { type ActionReturn } from "svelte/action";

export function onClick(node: HTMLElement, callback: (e: MouseEvent) => void): ActionReturn<HTMLElement> {
          function handleClick(event: MouseEvent) {
                    const target = event.target as HTMLElement;
                    if (node.contains(target)) {
                              callback(event);
                    }
          }
          node.addEventListener('click', handleClick);
          return {
                    destroy() {
                              node.removeEventListener('click', handleClick);
                    }
          };
}
