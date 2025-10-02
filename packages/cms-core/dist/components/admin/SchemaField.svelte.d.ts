import type { Field } from '../../types.js';
import SchemaField from './SchemaField.svelte';
interface Props {
    field: Field;
    value: any;
    documentData?: Record<string, any>;
    onUpdate: (value: any) => void;
    onOpenReference?: (documentId: string, documentType: string) => void;
}
declare const SchemaField: import("svelte").Component<Props, {}, "">;
type SchemaField = ReturnType<typeof SchemaField>;
export default SchemaField;
//# sourceMappingURL=SchemaField.svelte.d.ts.map