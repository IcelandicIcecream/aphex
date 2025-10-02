interface Props {
    currentView: 'dashboard' | 'documents' | 'editor';
    mobileView: 'types' | 'documents' | 'editor';
    selectedDocumentType: string | null;
    windowWidth: number;
    children?: any;
}
declare const AdminLayout: import("svelte").Component<Props, {
    typesPanel: "hidden" | "flex-1" | "w-full" | "w-[60px]" | "w-[350px]";
    documentsPanel: "hidden" | "flex-1" | "w-full" | "w-[60px]" | "w-[350px]";
    editorPanel: "hidden" | "flex-1" | "w-full";
}, "">;
type AdminLayout = ReturnType<typeof AdminLayout>;
export default AdminLayout;
//# sourceMappingURL=AdminLayout.svelte.d.ts.map