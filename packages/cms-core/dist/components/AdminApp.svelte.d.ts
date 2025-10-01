import type { SchemaType } from '../types.js';
interface DocumentType {
    name: string;
    title: string;
    description?: string;
}
interface Props {
    schemas: SchemaType[];
    documentTypes: DocumentType[];
    schemaError?: {
        message: string;
    } | null;
    title?: string;
}
declare const AdminApp: import("svelte").Component<Props, {}, "">;
type AdminApp = ReturnType<typeof AdminApp>;
export default AdminApp;
//# sourceMappingURL=AdminApp.svelte.d.ts.map