/**
 * A schema as an agent needs it to write content: one TypeScript-style outline,
 * with every object that repeats declared once and named, list values as literal
 * unions, and descriptions as comments. The raw schema carries what the editor
 * needs as well (previews, placeholders, row counts, list titles), which for a
 * page builder is several times the size and tells a model nothing it writes.
 *
 * `only` narrows a list of block types to the ones named, so a model editing one
 * block reads that block, not the twenty beside it.
 */
import { isFieldRequired } from '../field-validation/utils';
import type { Field, ListOption, SchemaType, TypeReference } from '../types/schemas';
import { toPascalCase } from '../utils/string-case';

export const OUTLINE_LEGEND = {
	Image:
		"{ _type: 'image', asset: { _type: 'reference', _ref: '<assetId from upload_asset or list_assets>' }, alt?: string }",
	File: "{ _type: 'file', asset: { _type: 'reference', _ref: '<assetId>' } }",
	Ref: "Ref<t> = { _type: 'reference', _ref: '<id of a t document>' }",
	PortableText:
		'rich text: Portable Text blocks (portabletext.org); see portableText for this field’s styles and marks'
} as const;

type LegendName = keyof typeof OUTLINE_LEGEND;

const literal = (value: string) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** A title that says no more than its value ("Card" for card, "Text image" for textImage). */
function sameAsValue(title: string, value: string): boolean {
	const plain = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();
	return plain(title) === plain(value);
}

function listOptions(list: Array<string | ListOption>): { values: string[]; notes: string[] } {
	const values: string[] = [];
	const notes: string[] = [];
	for (const option of list) {
		if (typeof option === 'string') values.push(option);
		else {
			values.push(option.value);
			if (option.title && !sameAsValue(option.title, option.value))
				notes.push(`${option.value} = ${option.title}`);
		}
	}
	return { values, notes };
}

function oneLine(text: string): string {
	return text.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
}

/** More block types than this in one list, and get_schema lists them instead of outlining all of them. */
export const SUMMARIZE_OVER = 8;

interface Declared {
	name: string;
	comment?: string;
	body: string;
}

class Outline {
	private readonly schemas: Map<string, SchemaType>;
	/** Declared type name → its declaration, in the order first needed. */
	readonly declared = new Map<string, Declared>();
	/** An inline object's body → how often it occurs, from the counting pass. */
	private readonly counts = new Map<string, number>();
	/** An inline object's body → the name it was declared under. */
	private readonly names = new Map<string, string>();
	readonly used = new Set<LegendName>();
	private counting = false;
	private readonly visiting = new Set<string>();

	/** Lines listing a page builder's block types, when they're summarized. */
	readonly index: string[] = [];
	/** Every object type a list in the schema can hold, by the _type it's stored with. */
	readonly members = new Set<string>();

	constructor(
		schemas: SchemaType[],
		private readonly only?: Set<string>,
		/** Summarize a list of more than SUMMARIZE_OVER object types, unless `only` names some. */
		private readonly summarize = false
	) {
		this.schemas = new Map(schemas.map((s) => [s.name, s]));
	}

	/** Two passes: count every inline object, then render naming the repeated ones. */
	run(schema: SchemaType): string {
		this.counting = true;
		this.object(schema.fields, '');
		this.counting = false;
		this.declared.clear();
		this.used.clear();
		this.index.length = 0;
		const body = this.object(schema.fields, '');
		const own: Declared = { name: toPascalCase(schema.name), body };
		const comment = schema.description ? `// ${oneLine(schema.description)}\n` : '';
		const declarations = [own, ...this.declared.values()].map(
			(d) =>
				`${d === own ? comment : d.comment ? `// ${d.comment}\n` : ''}type ${d.name} = ${d.body}`
		);
		return [...declarations, ...this.index].join('\n');
	}

	private declare(base: string, body: string, comment?: string): string {
		const existing = this.names.get(body);
		if (existing && this.declared.has(existing)) return existing;
		let name = toPascalCase(base);
		for (
			let n = 2;
			[...this.declared.values()].some((d) => d.name === name && d.body !== body);
			n++
		) {
			name = `${toPascalCase(base)}${n}`;
		}
		this.names.set(body, name);
		if (!this.declared.has(name))
			this.declared.set(name, { name, body, ...(comment ? { comment } : {}) });
		return name;
	}

	/** `{ a: string; b?: number }`, one field a line. `tag` adds the `_type` and `_key` a list item carries. */
	private object(fields: Field[], indent: string, tag?: string): string {
		const inner = `${indent}  `;
		const lines: string[] = [];
		if (tag) lines.push(`${inner}_type: ${literal(tag)}`, `${inner}_key?: string`);
		for (const field of fields) {
			const notes: string[] = [];
			const type = this.field(field, inner, notes);
			if (field.description) notes.unshift(oneLine(field.description));
			const optional = isFieldRequired(field) ? '' : '?';
			lines.push(
				`${inner}${field.name}${optional}: ${type}${notes.length ? ` // ${notes.join('; ')}` : ''}`
			);
		}
		return `{\n${lines.join('\n')}\n${indent}}`;
	}

	private named(base: string, fields: Field[], tag?: string, comment?: string): string {
		// A type that contains itself (a layout group holding groups) names itself.
		if (this.visiting.has(base)) return toPascalCase(base);
		this.visiting.add(base);
		// Declared types start at the left edge, whatever depth they were met at.
		const body = this.object(fields, '', tag);
		this.visiting.delete(base);
		if (this.counting) {
			this.counts.set(body, (this.counts.get(body) ?? 0) + 1);
			return base;
		}
		return this.declare(base, body, comment);
	}

	/** An inline object: written in place when it occurs once, declared and named when it repeats. */
	private inline(base: string, fields: Field[], indent: string, tag?: string): string {
		const flat = this.object(fields, '', tag);
		if (this.counting) {
			this.counts.set(flat, (this.counts.get(flat) ?? 0) + 1);
			return this.object(fields, indent, tag);
		}
		if ((this.counts.get(flat) ?? 0) > 1) return this.declare(base, flat);
		return this.object(fields, indent, tag);
	}

	private ref(to: Array<{ type: string }> | undefined): string {
		this.used.add('Ref');
		const targets = (to ?? []).map((t) => t.type);
		return `Ref<${targets.length ? targets.join(' | ') : 'any'}>`;
	}

	private field(field: Field, indent: string, notes: string[]): string {
		const kind: string = field.type;
		switch (field.type) {
			case 'string': {
				const list = field.list;
				if (Array.isArray(list) && list.length > 0) {
					const { values, notes: titles } = listOptions(list);
					notes.push(...titles);
					return values.map(literal).join(' | ');
				}
				if (list && !Array.isArray(list)) {
					const values = [
						...new Set(
							Object.values(list.options).flatMap((options) => listOptions(options).values)
						)
					];
					notes.push(`which of these depends on ${list.dependsOn}`);
					return values.map(literal).join(' | ');
				}
				if (field.maxLength) notes.push(`at most ${field.maxLength} characters`);
				return 'string';
			}
			case 'text':
			case 'slug':
				return 'string';
			case 'url':
				notes.push('a URL');
				return 'string';
			case 'number': {
				const range = [
					field.min !== undefined ? `min ${field.min}` : '',
					field.max !== undefined ? `max ${field.max}` : ''
				].filter(Boolean);
				if (range.length) notes.push(range.join(', '));
				return 'number';
			}
			case 'boolean':
				return 'boolean';
			case 'date':
				notes.push('YYYY-MM-DD');
				return 'string';
			case 'datetime':
				notes.push('ISO datetime, UTC');
				return 'string';
			case 'image':
				this.used.add('Image');
				return 'Image';
			case 'file':
				this.used.add('File');
				return 'File';
			case 'reference':
				return this.ref(field.to);
			case 'object':
				return field.fields ? this.inline(field.name, field.fields, indent) : 'object';
			case 'array':
				return this.array(field.of, indent, notes);
			default:
				// A plugin's field type: its stored shape is the plugin's.
				notes.push(`a ${kind} field`);
				return 'unknown';
		}
	}

	private array(of: TypeReference[], indent: string, notes: string[]): string {
		const members: string[] = [];
		const skipped: string[] = [];
		const objects = of.filter(
			(item) => Array.isArray(item.fields) || this.schemas.get(item.type)?.type === 'object'
		);
		for (const item of objects)
			this.members.add(Array.isArray(item.fields) ? (item.name ?? item.type) : item.type);
		if (this.summarize && !this.only && objects.length > SUMMARIZE_OVER) {
			if (!this.counting) {
				this.index.push(
					`// ${objects.length} block types. Call get_schema again with types: [...] naming the ones you'll write, to get their fields:`,
					...objects.map((item) => {
						const storedAs = Array.isArray(item.fields) ? (item.name ?? item.type) : item.type;
						const registered = this.schemas.get(item.type);
						const about =
							item.description ?? registered?.description ?? item.title ?? registered?.title;
						return `//   ${storedAs}${about ? `: ${oneLine(about)}` : ''}`;
					})
				);
			}
			notes.push('block types listed at the end');
			return 'Block[]';
		}
		for (const item of of) {
			if (item.type === 'block') {
				this.used.add('PortableText');
				members.push('PortableText');
				continue;
			}
			if (item.type === 'reference') {
				members.push(this.ref(item.to));
				continue;
			}
			if (item.type === 'image') {
				this.used.add('Image');
				members.push('Image');
				continue;
			}
			const tag = Array.isArray(item.fields) ? (item.name ?? item.type) : undefined;
			const fields =
				item.fields ??
				(this.schemas.get(item.type)?.type === 'object'
					? this.schemas.get(item.type)?.fields
					: undefined);
			if (fields) {
				const storedAs = tag ?? item.type;
				if (this.only && objects.length > 1 && !this.only.has(storedAs)) {
					skipped.push(storedAs);
					continue;
				}
				// A list of several object types is a page builder: each member gets a name.
				const comment = item.description ? oneLine(item.description) : undefined;
				members.push(
					objects.length > 1 || this.schemas.has(item.type)
						? this.named(storedAs, fields, storedAs, comment)
						: this.inline(storedAs, fields, indent, storedAs)
				);
				continue;
			}
			members.push(
				item.type === 'text' || item.type === 'slug' || item.type === 'url' ? 'string' : item.type
			);
		}
		if (skipped.length)
			notes.push(`also: ${skipped.join(', ')} (get_schema with types to see them)`);
		if (members.length === 0) return 'unknown[]';
		return members.length === 1 ? `${members[0]}[]` : `(${members.join(' | ')})[]`;
	}
}

export interface SchemaOutline {
	/** TypeScript-style declarations, the collection's own type first. */
	types: string;
	/** The value shapes the declarations name (Image, Ref…), only those used. */
	values: Partial<Record<LegendName, string>>;
	/** Names in `only` that no list in the schema holds. */
	unknown: string[];
}

export interface SchemaOutlineOptions {
	/** Outline only these of a list's object types (a page's blocks). */
	only?: string[];
	/** List a long page builder's block types rather than outlining them all. */
	summarize?: boolean;
}

export function schemaOutline(
	schema: SchemaType,
	schemas: SchemaType[],
	options: SchemaOutlineOptions = {}
): SchemaOutline {
	const { only, summarize = false } = options;
	const outline = new Outline(schemas, only?.length ? new Set(only) : undefined, summarize);
	const types = outline.run(schema);
	const values: Partial<Record<LegendName, string>> = {};
	for (const name of outline.used) values[name] = OUTLINE_LEGEND[name];
	return { types, values, unknown: (only ?? []).filter((name) => !outline.members.has(name)) };
}
