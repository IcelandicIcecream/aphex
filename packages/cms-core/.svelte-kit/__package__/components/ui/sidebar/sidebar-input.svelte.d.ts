declare const SidebarInput: import("svelte").Component<(Omit<import("svelte/elements").HTMLInputAttributes, "type"> & ({
    type: "file";
    files?: FileList;
} | {
    type?: "number" | "email" | "text" | "image" | "date" | "search" | "url" | "submit" | "reset" | "button" | "checkbox" | "radio" | (string & {}) | "tel" | "hidden" | "color" | "datetime-local" | "month" | "password" | "range" | "time" | "week";
    files?: undefined;
})) & {
    ref?: HTMLElement | null | undefined;
}, {}, "ref" | "value">;
type SidebarInput = ReturnType<typeof SidebarInput>;
export default SidebarInput;
//# sourceMappingURL=sidebar-input.svelte.d.ts.map