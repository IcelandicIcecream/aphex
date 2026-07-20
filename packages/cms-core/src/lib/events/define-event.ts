import { z } from 'zod';

/**
 * A typed domain-event definition: a stable `type` name paired with a zod schema for
 * its payload. Mirrors the API-contract pattern (`api/schemas/*`) — one source of truth
 * for the payload shape, with an inferred TS type. Emitters call `parse` so a malformed
 * payload fails loudly at the write site rather than rotting in the log.
 */
export interface EventDefinition<TName extends string, TSchema extends z.ZodTypeAny> {
	type: TName;
	schema: TSchema;
	/** Validate + narrow an unknown payload to the event's payload type. Throws on mismatch. */
	parse(payload: unknown): z.infer<TSchema>;
}

/** The payload type of an event definition. */
export type EventPayload<D> = D extends EventDefinition<string, infer S> ? z.infer<S> : never;

export function defineEvent<TName extends string, TSchema extends z.ZodTypeAny>(
	type: TName,
	schema: TSchema
): EventDefinition<TName, TSchema> {
	return {
		type,
		schema,
		parse: (payload) => schema.parse(payload)
	};
}
