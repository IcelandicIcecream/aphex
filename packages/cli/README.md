# @aphexcms/cli

The official CLI for Aphex CMS. The package is `@aphexcms/cli`; the command it
installs is `aphx`.

> **`aphx` is not `aphex`.** They are two different commands from two different
> packages. `aphx` (this package) scaffolds a new project. `aphex` comes from
> `@aphexcms/cms-core` and operates on an existing one — `aphex migrate`,
> `aphex generate:types` — so it is available inside a project, not globally.

## Usage

No install needed — `create` is the only command, and it wraps `create-aphex`:

```bash
npx @aphexcms/cli create my-site
```

Or install it globally, if you scaffold often:

```bash
npm install -g @aphexcms/cli
aphx create my-site
```

With pnpm:

```bash
pnpm add -g @aphexcms/cli
aphx create my-site --template website
```

Going straight to the scaffolder is equivalent, and one fewer package:

```bash
pnpm create aphex my-site
```

## Commands

### `create`

Scaffold a new Aphex CMS project interactively.

```bash
aphx create
```

This will guide you through:

1. Choosing a project name
2. Selecting a template
3. Setting up your project files
4. Creating a basic `.env` file

### `help`

Show available commands and usage information.

```bash
aphx help
```

## Examples

```bash
# Create a new project
aphx create my-site

# Create a project without the template prompt
aphx create my-site --template website

# Show help
aphx help
```
