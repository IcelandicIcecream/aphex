// local-api/hook-reader.ts
//
// The read-only view of the Local API a schema hook gets as `args.read`.
//
// A hook transforms its own write, and some transforms need to look something up
// first: the next invoice number, a default from a settings singleton, the client
// an invoice points at. So a hook may read, as the writer and in the writer's
// organization, but it has no way to write. Writing elsewhere is a side effect,
// and side effects belong to event consumers.

import type { FindOptions, FindResult, Where } from '../types/filters';
import type { CollectionAPI } from './collection-api';
import type { Collections } from './index';
import type { LocalAPIContext } from './types';

/** A collection name: the generated `Collections` keys, or any string before types are generated. */
export type HookCollectionName = [keyof Collections] extends [never]
	? string
	: Extract<keyof Collections, string>;

/** The document type a collection holds, taken from the generated `Collections`. */
export type HookCollectionDoc<K> = K extends keyof Collections
	? Collections[K] extends CollectionAPI<infer T>
		? T
		: Collections[K] extends Pick<CollectionAPI<infer T>, 'get'>
			? T
			: Record<string, unknown>
	: Record<string, unknown>;

export interface DocumentHookReader {
	/** Documents of a type in the writer's organization. Drafts unless the options say otherwise. */
	find<K extends HookCollectionName>(
		type: K,
		options?: FindOptions<HookCollectionDoc<K>>
	): Promise<FindResult<HookCollectionDoc<K>>>;
	/** One document by id, or `null`. */
	findByID<K extends HookCollectionName>(
		type: K,
		id: string,
		options?: Partial<FindOptions<HookCollectionDoc<K>>>
	): Promise<HookCollectionDoc<K> | null>;
	/** How many documents of a type match. */
	count<K extends HookCollectionName>(type: K, options?: { where?: Where }): Promise<number>;
	/**
	 * A singleton's document, or `null` if it was never saved. Unlike the Local API's
	 * `get()`, this never creates the row, because a hook doesn't write.
	 */
	singleton<K extends HookCollectionName>(type: K): Promise<HookCollectionDoc<K> | null>;
}

/** Looks a collection up by name. `LocalAPI.getCollection`, passed in to keep this file free of the class. */
export type CollectionLookup = <T>(name: string) => CollectionAPI<T> | undefined;

/** Builds the reader a hook gets, bound to the writer's context. */
export function createDocumentHookReader(
	getCollection: CollectionLookup,
	context: LocalAPIContext
): DocumentHookReader {
	function collection<T>(type: string): CollectionAPI<T> {
		const found = getCollection<T>(type);
		if (!found) throw new Error(`A hook read the unknown document type "${type}"`);
		return found;
	}

	return {
		find: (type, options) =>
			collection<HookCollectionDoc<typeof type>>(type).find(context, options),
		findByID: (type, id, options) =>
			collection<HookCollectionDoc<typeof type>>(type).findByID(context, id, options),
		count: (type, options) => collection(type).count(context, options),
		singleton: async (type) => {
			const target = collection<HookCollectionDoc<typeof type>>(type);
			const id = target.getSingletonId(context);
			if (!id) throw new Error(`A hook read "${type}" as a singleton, but it isn't one`);
			return target.findByID(context, id);
		}
	};
}
