import type { Field } from '../../../types.js';
interface Props {
    field: Field;
    value: number | null;
    onUpdate: (value: number | null) => void;
}
declare const NumberField: import("svelte").Component<Props, {}, "">;
type NumberField = ReturnType<typeof NumberField>;
export default NumberField;
//# sourceMappingURL=NumberField.svelte.d.ts.map