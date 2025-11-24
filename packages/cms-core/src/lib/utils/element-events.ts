import { type ActionReturn } from "svelte/action";

type ElementEvent<K extends keyof HTMLElementEventMap = keyof HTMLElementEventMap> = {
          [P in K]: {
                    name: P;
                    handler: (event: HTMLElementEventMap[P]) => void;
                    options?: boolean | AddEventListenerOptions;
          };
}[K];

interface ElementEventsParams {
          events: ElementEvent[] | null;
          enabled?: boolean;
}

export default function elementEvents(
          node: HTMLElement,
          { events, enabled = true }: ElementEventsParams
): ActionReturn {

          if (events && enabled) {
                    for (const e of events) {
                              node.addEventListener(e.name, e.handler as EventListener, e.options);
                    }
          }

          return {
                    destroy() {
                              if (events && enabled) {
                                        for (const e of events) {
                                                  node.removeEventListener(e.name, e.handler as EventListener, e.options);
                                        }
                              }
                    },
          };
}