import { type ActionReturn } from "svelte/action";

type DragAndDrop = {
          readonly: boolean;
          onDragOver: (e: DragEvent) => void;
          onDrop: (e: DragEvent) => void;
          onDragLeave: (e: DragEvent) => void;
};

export function dnd(node: HTMLElement, { readonly, onDragOver, onDrop, onDragLeave }: DragAndDrop): ActionReturn<HTMLElement> {
          if (readonly) {
                    return {
                              destroy() { }
                    };
          }
          node.addEventListener('dragover', onDragOver);
          node.addEventListener('drop', onDrop);
          node.addEventListener('dragleave', onDragLeave);
          return {
                    destroy() {
                              node.removeEventListener('dragover', onDragOver);
                              node.removeEventListener('drop', onDrop);
                              node.removeEventListener('dragleave', onDragLeave);
                    }
          };
}
