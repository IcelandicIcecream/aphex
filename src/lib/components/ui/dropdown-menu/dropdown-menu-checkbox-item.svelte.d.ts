import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
import { type WithoutChildrenOrChild } from "$lib/utils.js";
import type { Snippet } from "svelte";
type $$ComponentProps = WithoutChildrenOrChild<DropdownMenuPrimitive.CheckboxItemProps> & {
    children?: Snippet;
};
declare const DropdownMenuCheckboxItem: import("svelte").Component<$$ComponentProps, {}, "checked" | "indeterminate" | "ref">;
type DropdownMenuCheckboxItem = ReturnType<typeof DropdownMenuCheckboxItem>;
export default DropdownMenuCheckboxItem;
//# sourceMappingURL=dropdown-menu-checkbox-item.svelte.d.ts.map