import type { ArrayField as ArrayFieldType } from '../../../types.js';
interface Props {
    field: ArrayFieldType;
    value: any;
    onUpdate: (value: any) => void;
    onOpenReference?: (documentId: string, documentType: string) => void;
}
declare const ArrayField: import("svelte").Component<Props, {}, "">;
type ArrayField = ReturnType<typeof ArrayField>;
export default ArrayField;
//# sourceMappingURL=ArrayField.svelte.d.ts.map