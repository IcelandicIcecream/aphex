import type { ImageField as ImageFieldType, ImageValue } from '../../../types.js';
interface Props {
    field: ImageFieldType;
    value: ImageValue | null;
    onUpdate: (value: ImageValue | null) => void;
}
declare const ImageField: import("svelte").Component<Props, {}, "">;
type ImageField = ReturnType<typeof ImageField>;
export default ImageField;
//# sourceMappingURL=ImageField.svelte.d.ts.map