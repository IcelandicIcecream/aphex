// Sanity-style validation Rule implementation
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Enable strict parsing
dayjs.extend(customParseFormat);

export interface ValidationMarker {
	level: 'error' | 'warning' | 'info';
	message: string;
	path?: string[];
}

export interface ValidationContext {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	document?: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	parent?: any;
	path?: string[];
}

export interface CustomValidator<T = unknown> {
	(
		value: T,
		context: ValidationContext
	): ValidationMarker[] | string | boolean | Promise<ValidationMarker[] | string | boolean>;
}

export interface FieldReference {
	__fieldReference: true;
	path: string | string[];
}

export class Rule {
	private _required: boolean = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private _rules: Array<{ type: string; constraint?: any; message?: string }> = [];
	private _level: 'error' | 'warning' | 'info' = 'error';
	private _message?: string;

	static FIELD_REF = Symbol('fieldReference');

	static valueOfField(path: string | string[]): FieldReference {
		return {
			__fieldReference: true,
			path
		};
	}

	valueOfField(path: string | string[]): FieldReference {
		return Rule.valueOfField(path);
	}

	required(): Rule {
		const newRule = this.clone();
		newRule._required = true;
		return newRule;
	}

	optional(): Rule {
		const newRule = this.clone();
		newRule._required = false;
		return newRule;
	}

	min(len: number | string | FieldReference): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'min', constraint: len });
		return newRule;
	}

	max(len: number | string | FieldReference): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'max', constraint: len });
		return newRule;
	}

	length(len: number | FieldReference): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'length', constraint: len });
		return newRule;
	}

	unique(): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'unique' });
		return newRule;
	}

	email(): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'email' });
		return newRule;
	}

	uri(options?: { scheme?: RegExp[]; allowRelative?: boolean }): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'uri', constraint: options });
		return newRule;
	}

	regex(pattern: RegExp, name?: string): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'regex', constraint: { pattern, name } });
		return newRule;
	}

	positive(): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'positive' });
		return newRule;
	}

	negative(): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'negative' });
		return newRule;
	}

	integer(): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'integer' });
		return newRule;
	}

	greaterThan(num: number | FieldReference): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'greaterThan', constraint: num });
		return newRule;
	}

	lessThan(num: number | FieldReference): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'lessThan', constraint: num });
		return newRule;
	}

	date(format?: string): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'date', constraint: format || 'YYYY-MM-DD' });
		return newRule;
	}

	datetime(dateFormat?: string, timeFormat?: string): Rule {
		const newRule = this.clone();
		const fullFormat = `${dateFormat || 'YYYY-MM-DD'} ${timeFormat || 'HH:mm'}`;
		newRule._rules.push({ type: 'datetime', constraint: fullFormat });
		return newRule;
	}

	custom<T = unknown>(fn: CustomValidator<T>): Rule {
		const newRule = this.clone();
		newRule._rules.push({ type: 'custom', constraint: fn });
		return newRule;
	}

	error(message?: string): Rule {
		const newRule = this.clone();
		newRule._level = 'error';
		newRule._message = message;
		return newRule;
	}

	warning(message?: string): Rule {
		const newRule = this.clone();
		newRule._level = 'warning';
		newRule._message = message;
		return newRule;
	}

	info(message?: string): Rule {
		const newRule = this.clone();
		newRule._level = 'info';
		newRule._message = message;
		return newRule;
	}

	clone(): Rule {
		const newRule = new Rule();
		newRule._required = this._required;
		newRule._rules = [...this._rules];
		newRule._level = this._level;
		newRule._message = this._message;
		return newRule;
	}

	async validate(value: unknown, context: ValidationContext = {}): Promise<ValidationMarker[]> {
		const markers: ValidationMarker[] = [];

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
			} catch (error) {
				markers.push({
					level: 'error',
					message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
					path: context.path
				});
			}
		}

		return markers;
	}

	private async validateRule(
		rule: { type: string; constraint?: any },
		value: unknown,
		context: ValidationContext
	): Promise<string | null> {
		switch (rule.type) {
			case 'min':
				if (typeof value === 'string' && value.length < rule.constraint) {
					return `Must be at least ${rule.constraint} characters`;
				}
				if (typeof value === 'number' && value < rule.constraint) {
					return `Must be at least ${rule.constraint}`;
				}
				if (Array.isArray(value) && value.length < rule.constraint) {
					return `Must have at least ${rule.constraint} item${rule.constraint === 1 ? '' : 's'}`;
				}
				break;

			case 'max':
				if (typeof value === 'string' && value.length > rule.constraint) {
					return `Must be at most ${rule.constraint} characters`;
				}
				if (typeof value === 'number' && value > rule.constraint) {
					return `Must be at most ${rule.constraint}`;
				}
				if (Array.isArray(value) && value.length > rule.constraint) {
					return `Must have at most ${rule.constraint} item${rule.constraint === 1 ? '' : 's'}`;
				}
				break;

			case 'length':
				if (Array.isArray(value) && value.length !== rule.constraint) {
					return `Must have exactly ${rule.constraint} item${rule.constraint === 1 ? '' : 's'}`;
				}
				if (typeof value === 'string' && value.length !== rule.constraint) {
					return `Must be exactly ${rule.constraint} characters`;
				}
				break;

			case 'unique':
				if (Array.isArray(value)) {
					const seen = new Set();
					for (const item of value) {
						// Deep comparison excluding _key property
						const normalized = this.normalizeForComparison(item);
						const serialized = JSON.stringify(normalized);
						if (seen.has(serialized)) {
							return 'All items must be unique';
						}
						seen.add(serialized);
					}
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
					} catch {
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

			case 'date': {
				if (typeof value === 'string') {
					const format = rule.constraint || 'YYYY-MM-DD';
					console.log('[Rule.validate] DATE validation', { value, format });

					// Parse with strict mode
					const parsed = dayjs(value, format, true);
					console.log('[Rule.validate] DATE parsed', { isValid: parsed.isValid(), parsed: parsed.format() });

					if (!parsed.isValid()) {
						console.log('[Rule.validate] DATE validation FAILED - invalid format');
						return `Invalid date format. Expected: ${format}`;
					}
					// Verify the parsed date matches the input (catches invalid dates like 2025-02-31)
					if (parsed.format(format) !== value) {
						console.log('[Rule.validate] DATE validation FAILED - format mismatch', {
							expected: value,
							got: parsed.format(format)
						});
						return `Invalid date. Expected format: ${format}`;
					}
					console.log('[Rule.validate] DATE validation PASSED');
				}
				break;
			}

			case 'datetime': {
				if (typeof value === 'string') {
					const format = rule.constraint || 'YYYY-MM-DD HH:mm';
					console.log('[Rule.validate] DATETIME validation', { value, format });

					// Parse with strict mode
					const parsed = dayjs(value, format, true);
					console.log('[Rule.validate] DATETIME parsed', { isValid: parsed.isValid(), parsed: parsed.format() });

					if (!parsed.isValid()) {
						console.log('[Rule.validate] DATETIME validation FAILED - invalid format');
						return `Invalid datetime format. Expected: ${format}`;
					}
					// Verify the parsed datetime matches the input (catches invalid dates like 2025-02-31 23:59)
					if (parsed.format(format) !== value) {
						console.log('[Rule.validate] DATETIME validation FAILED - format mismatch', {
							expected: value,
							got: parsed.format(format)
						});
						return `Invalid datetime. Expected format: ${format}`;
					}
					console.log('[Rule.validate] DATETIME validation PASSED');
				}
				break;
			}

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

	isRequired(): boolean {
		return this._required;
	}

	// Helper method to normalize objects for comparison (exclude _key)
	private normalizeForComparison(value: unknown): unknown {
		if (value === null || value === undefined) {
			return value;
		}
		if (Array.isArray(value)) {
			return value.map((item) => this.normalizeForComparison(item));
		}
		if (typeof value === 'object') {
			const normalized: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(value)) {
				if (key !== '_key') {
					normalized[key] = this.normalizeForComparison(val);
				}
			}
			return normalized;
		}
		return value;
	}
}
