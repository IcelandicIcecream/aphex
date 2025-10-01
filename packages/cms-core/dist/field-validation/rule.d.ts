export interface ValidationMarker {
    level: 'error' | 'warning' | 'info';
    message: string;
    path?: string[];
}
export interface ValidationContext {
    document?: any;
    parent?: any;
    path?: string[];
}
export interface CustomValidator<T = unknown> {
    (value: T, context: ValidationContext): ValidationMarker[] | string | boolean | Promise<ValidationMarker[] | string | boolean>;
}
export interface FieldReference {
    __fieldReference: true;
    path: string | string[];
}
export declare class Rule {
    private _required;
    private _rules;
    private _level;
    private _message?;
    static FIELD_REF: symbol;
    static valueOfField(path: string | string[]): FieldReference;
    valueOfField(path: string | string[]): FieldReference;
    required(): Rule;
    optional(): Rule;
    min(len: number | string | FieldReference): Rule;
    max(len: number | string | FieldReference): Rule;
    length(len: number | FieldReference): Rule;
    email(): Rule;
    uri(options?: {
        scheme?: RegExp[];
        allowRelative?: boolean;
    }): Rule;
    regex(pattern: RegExp, name?: string): Rule;
    positive(): Rule;
    negative(): Rule;
    integer(): Rule;
    greaterThan(num: number | FieldReference): Rule;
    lessThan(num: number | FieldReference): Rule;
    custom<T = unknown>(fn: CustomValidator<T>): Rule;
    error(message?: string): Rule;
    warning(message?: string): Rule;
    info(message?: string): Rule;
    clone(): Rule;
    validate(value: unknown, context?: ValidationContext): Promise<ValidationMarker[]>;
    private validateRule;
    isRequired(): boolean;
}
//# sourceMappingURL=rule.d.ts.map