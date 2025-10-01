interface DocumentType {
    name: string;
    title: string;
    description?: string;
    documentCount?: number;
}
interface Props {
    documentTypes: DocumentType[];
    objectTypes: DocumentType[];
}
declare const DocumentTypesList: import("svelte").Component<Props, {}, "">;
type DocumentTypesList = ReturnType<typeof DocumentTypesList>;
export default DocumentTypesList;
//# sourceMappingURL=DocumentTypesList.svelte.d.ts.map