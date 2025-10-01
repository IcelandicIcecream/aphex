import type { Field } from '../../../types.js';
interface Props {
    field: Field;
    value: any;
    documentData?: Record<string, any>;
    onUpdate: (value: any) => void;
}
declare const SlugField: import("svelte").Component<Props, {}, "">;
type SlugField = ReturnType<typeof SlugField>;
export default SlugField;
//# sourceMappingURL=SlugField.svelte.d.ts.map