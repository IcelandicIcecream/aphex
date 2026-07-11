/**
 * The active admin area (tab). Built-in tools are named literals; plugin admin
 * tools are addressed as `plugin:<tool-id>`, so the tab system is open-ended
 * without the shell hardcoding plugin knowledge.
 */
export type AdminArea = 'structure' | 'vision' | 'media' | `plugin:${string}`;
