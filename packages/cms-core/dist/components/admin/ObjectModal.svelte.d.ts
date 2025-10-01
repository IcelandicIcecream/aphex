import type { SchemaType } from '../../types.js';
interface Props {
    open: boolean;
    schema: SchemaType;
    value: Record<string, any>;
    onClose: () => void;
    onSave: (value: Record<string, any>) => void;
    onUpdate?: (value: Record<string, any>) => void;
}
declare const ObjectModal: import("svelte").Component<Props, {}, "">;
type ObjectModal = ReturnType<typeof ObjectModal>;
export default ObjectModal;
//# sourceMappingURL=ObjectModal.svelte.d.ts.map