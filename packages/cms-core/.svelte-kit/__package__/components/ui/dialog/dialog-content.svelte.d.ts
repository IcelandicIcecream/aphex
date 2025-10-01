import { Dialog as DialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import { type WithoutChildrenOrChild } from "../../../lib/utils.js";
type $$ComponentProps = WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: DialogPrimitive.PortalProps;
    children: Snippet;
    showCloseButton?: boolean;
};
declare const DialogContent: import("svelte").Component<$$ComponentProps, {}, "ref">;
type DialogContent = ReturnType<typeof DialogContent>;
export default DialogContent;
//# sourceMappingURL=dialog-content.svelte.d.ts.map