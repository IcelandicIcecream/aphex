import type { Field } from '../../../types.js';
interface Props {
    field: Field;
    value: string | null;
    onUpdate: (value: string | null) => void;
    onOpenReference?: (documentId: string, documentType: string) => void;
}
declare const ReferenceField: import("svelte").Component<Props, {}, "">;
type ReferenceField = ReturnType<typeof ReferenceField>;
export default ReferenceField;
//# sourceMappingURL=ReferenceField.svelte.d.ts.map