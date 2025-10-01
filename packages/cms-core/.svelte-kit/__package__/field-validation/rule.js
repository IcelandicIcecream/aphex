export class Rule {
    _required = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _rules = [];
    _level = 'error';
    _message;
    static FIELD_REF = Symbol('fieldReference');
    static valueOfField(path) {
        return {
            __fieldReference: true,
            path
        };
    }
    valueOfField(path) {
        return Rule.valueOfField(path);
    }
    required() {
        const newRule = this.clone();
        newRule._required = true;
        return newRule;
    }
    optional() {
        const newRule = this.clone();
        newRule._required = false;
        return newRule;
    }
    min(len) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'min', constraint: len });
        return newRule;
    }
    max(len) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'max', constraint: len });
        return newRule;
    }
    length(len) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'length', constraint: len });
        return newRule;
    }
    email() {
        const newRule = this.clone();
        newRule._rules.push({ type: 'email' });
        return newRule;
    }
    uri(options) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'uri', constraint: options });
        return newRule;
    }
    regex(pattern, name) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'regex', constraint: { pattern, name } });
        return newRule;
    }
    positive() {
        const newRule = this.clone();
        newRule._rules.push({ type: 'positive' });
        return newRule;
    }
    negative() {
        const newRule = this.clone();
        newRule._rules.push({ type: 'negative' });
        return newRule;
    }
    integer() {
        const newRule = this.clone();
        newRule._rules.push({ type: 'integer' });
        return newRule;
    }
    greaterThan(num) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'greaterThan', constraint: num });
        return newRule;
    }
    lessThan(num) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'lessThan', constraint: num });
        return newRule;
    }
    custom(fn) {
        const newRule = this.clone();
        newRule._rules.push({ type: 'custom', constraint: fn });
        return newRule;
    }
    error(message) {
        const newRule = this.clone();
        newRule._level = 'error';
        newRule._message = message;
        return newRule;
    }
    warning(message) {
        const newRule = this.clone();
        newRule._level = 'warning';
        newRule._message = message;
        return newRule;
    }
    info(message) {
        const newRule = this.clone();
        newRule._level = 'info';
        newRule._message = message;
        return newRule;
    }
    clone() {
        const newRule = new Rule();
        newRule._required = this._required;
        newRule._rules = [...this._rules];
        newRule._level = this._level;
        newRule._message = this._message;
        return newRule;
    }
    async validate(value, context = {}) {
        const markers = [];
        // Check required
        if (this._required && (value === undefined || value === null || value === '')) {
            markers.push({
                level: this._level,
                message: this._message || 'Required',
                path: context.path
            });
        }
        // If value is empty and not required, skip other validations
        if (!this._required && (value === undefined || value === null || value === '')) {
            return markers;
        }
        // Run other validations
        for (const rule of this._rules) {
            try {
                const result = await this.validateRule(rule, value, context);
                if (result) {
                    markers.push({
                        level: this._level,
                        message: this._message || result,
                        path: context.path
                    });
                }
            }
            catch (error) {
                markers.push({
                    level: 'error',
                    message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    path: context.path
                });
            }
        }
        return markers;
    }
    async validateRule(rule, value, context) {
        switch (rule.type) {
            case 'min':
                if (typeof value === 'string' && value.length < rule.constraint) {
                    return `Must be at least ${rule.constraint} characters`;
                }
                if (typeof value === 'number' && value < rule.constraint) {
                    return `Must be at least ${rule.constraint}`;
                }
                break;
            case 'max':
                if (typeof value === 'string' && value.length > rule.constraint) {
                    return `Must be at most ${rule.constraint} characters`;
                }
                if (typeof value === 'number' && value > rule.constraint) {
                    return `Must be at most ${rule.constraint}`;
                }
                break;
            case 'email':
                if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Must be a valid email address';
                }
                break;
            case 'uri':
                if (typeof value === 'string') {
                    try {
                        new URL(value);
                    }
                    catch {
                        return 'Must be a valid URL';
                    }
                }
                break;
            case 'regex':
                if (typeof value === 'string' && !rule.constraint.pattern.test(value)) {
                    return `Must match pattern${rule.constraint.name ? ` (${rule.constraint.name})` : ''}`;
                }
                break;
            case 'positive':
                if (typeof value === 'number' && value <= 0) {
                    return 'Must be positive';
                }
                break;
            case 'negative':
                if (typeof value === 'number' && value >= 0) {
                    return 'Must be negative';
                }
                break;
            case 'integer':
                if (typeof value === 'number' && !Number.isInteger(value)) {
                    return 'Must be an integer';
                }
                break;
            case 'custom': {
                const customResult = await rule.constraint(value, context);
                if (customResult === false) {
                    return 'Validation failed';
                }
                if (typeof customResult === 'string') {
                    return customResult;
                }
                if (Array.isArray(customResult) && customResult.length > 0) {
                    return customResult[0].message;
                }
                break;
            }
        }
        return null;
    }
    isRequired() {
        return this._required;
    }
}
