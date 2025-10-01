interface Props {
    currentView: 'dashboard' | 'documents' | 'editor';
    mobileView: 'types' | 'documents' | 'editor';
    selectedDocumentType: string | null;
    windowWidth: number;
    children?: any;
}
declare const AdminLayout: import("svelte").Component<Props, {
    typesPanel: "hidden" | "w-full" | "flex-1" | "w-[60px]" | "w-[350px]";
    documentsPanel: "hidden" | "w-full" | "flex-1" | "w-[60px]" | "w-[350px]";
    editorPanel: "hidden" | "w-full" | "flex-1";
}, "">;
type AdminLayout = ReturnType<typeof AdminLayout>;
export default AdminLayout;
//# sourceMappingURL=AdminLayout.svelte.d.ts.map