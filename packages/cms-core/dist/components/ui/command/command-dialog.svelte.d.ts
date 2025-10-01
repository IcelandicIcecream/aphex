import type { Command as CommandPrimitive, Dialog as DialogPrimitive } from "bits-ui";
import type { Snippet } from "svelte";
import type { WithoutChildrenOrChild } from "../../../lib/utils.js";
type $$ComponentProps = WithoutChildrenOrChild<DialogPrimitive.RootProps> & WithoutChildrenOrChild<CommandPrimitive.RootProps> & {
    portalProps?: DialogPrimitive.PortalProps;
    children: Snippet;
    title?: string;
    description?: string;
};
declare const CommandDialog: import("svelte").Component<$$ComponentProps, {}, "value" | "ref" | "open">;
type CommandDialog = ReturnType<typeof CommandDialog>;
export default CommandDialog;
//# sourceMappingURL=command-dialog.svelte.d.ts.map