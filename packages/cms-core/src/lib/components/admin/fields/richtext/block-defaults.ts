// Default Portable Text block config, applied when a `{ type: 'block' }` in a
// schema omits its own `styles` / `marks.decorators` / `lists`. Single source of
// truth: the editor (RichtextField.svelte) and the MCP schema guide
// (mcp/tools.ts → portableTextGuide) both import these, so what the agent is told
// matches what the editor actually offers. Plain constants — no Svelte.

export const DEFAULT_BLOCK_STYLES = ['normal', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'];

export const DEFAULT_BLOCK_DECORATORS = ['strong', 'em', 'underline', 'strike-through', 'code'];

export const DEFAULT_BLOCK_LISTS = ['bullet', 'number'];
