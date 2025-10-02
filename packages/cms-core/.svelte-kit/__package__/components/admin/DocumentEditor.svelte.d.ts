import type { SchemaType } from '../../types.js';
interface Props {
    schemas: SchemaType[];
    documentType: string;
    documentId?: string | null;
    isCreating: boolean;
    onBack: () => void;
    onSaved?: (documentId: string) => void;
    onAutoSaved?: (documentId: string, title: string) => void;
    onDeleted?: () => void;
    onPublished?: (documentId: string) => void;
    onOpenReference?: (documentId: string, documentType: string) => void;
}
declare const DocumentEditor: import("svelte").Component<Props, {}, "">;
type DocumentEditor = ReturnType<typeof DocumentEditor>;
export default DocumentEditor;
//# sourceMappingURL=DocumentEditor.svelte.d.ts.map