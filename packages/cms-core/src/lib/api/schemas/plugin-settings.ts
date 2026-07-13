import { z } from 'zod';

// Save a plugin's settings — a partial patch of field-name → value. Values are
// deliberately loose (`unknown`): the field types are plugin-declared, so the
// authoritative shape check is the declaration, enforced in the service (which
// whitelists to declared field names). This guard only ensures a well-formed body.
export const savePluginSettingsRequest = z.object({
	values: z.record(z.string(), z.unknown())
});

export type SavePluginSettingsRequest = z.infer<typeof savePluginSettingsRequest>;
