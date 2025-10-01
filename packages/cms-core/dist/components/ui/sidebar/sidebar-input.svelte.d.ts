declare const SidebarInput: import("svelte").Component<(Omit<import("svelte/elements").HTMLInputAttributes, "type"> & ({
    type: "file";
    files?: FileList;
} | {
    type?: "number" | "email" | "text" | "image" | "date" | "search" | "url" | "hidden" | "color" | "submit" | "reset" | "button" | "checkbox" | "radio" | (string & {}) | "tel" | "datetime-local" | "month" | "password" | "range" | "time" | "week";
    files?: undefined;
})) & {
    ref?: HTMLElement | null | undefined;
}, {}, "value" | "ref">;
type SidebarInput = ReturnType<typeof SidebarInput>;
export default SidebarInput;
//# sourceMappingURL=sidebar-input.svelte.d.ts.map