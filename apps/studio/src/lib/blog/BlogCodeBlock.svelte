<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'codeBlock';
			language?: string;
			code?: string;
		}>;
	}

	type Highlighter = {
		codeToHtml(code: string, options: { lang: string; theme: string }): string;
	};

	const languageLoaders = {
		bash: () => import('@shikijs/langs/bash'),
		css: () => import('@shikijs/langs/css'),
		html: () => import('@shikijs/langs/html'),
		javascript: () => import('@shikijs/langs/javascript'),
		js: () => import('@shikijs/langs/javascript'),
		json: () => import('@shikijs/langs/json'),
		jsx: () => import('@shikijs/langs/jsx'),
		markdown: () => import('@shikijs/langs/markdown'),
		md: () => import('@shikijs/langs/markdown'),
		python: () => import('@shikijs/langs/python'),
		py: () => import('@shikijs/langs/python'),
		shell: () => import('@shikijs/langs/bash'),
		sql: () => import('@shikijs/langs/sql'),
		svelte: () => import('@shikijs/langs/svelte'),
		typescript: () => import('@shikijs/langs/typescript'),
		ts: () => import('@shikijs/langs/typescript'),
		tsx: () => import('@shikijs/langs/tsx'),
		xml: () => import('@shikijs/langs/xml'),
		yaml: () => import('@shikijs/langs/yaml'),
		yml: () => import('@shikijs/langs/yaml')
	};
	const highlighters = new Map<string, Promise<Highlighter>>();

	let { portableText }: Props = $props();
	let highlightedCode = $state<string>();
	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	const source = $derived(portableText.value.code ?? '');
	// `language` is a loader lookup key, so strip stega markers — in preview they'd make
	// `languageLoaders[language]` miss and highlighting silently break.
	const language = $derived(
		stegaClean(portableText.value.language ?? 'text')
			.trim()
			.toLowerCase() || 'text'
	);
	const languageLabel = $derived(language === 'text' ? 'Plain text' : language);

	function getHighlighter(language: string) {
		const loadLanguage = languageLoaders[language as keyof typeof languageLoaders];
		if (!loadLanguage) return;

		let highlighter = highlighters.get(language);
		if (!highlighter) {
			highlighter = Promise.all([
				import('@shikijs/core'),
				import('@shikijs/engine-javascript'),
				import('@shikijs/themes/github-dark-default'),
				loadLanguage()
			]).then(
				async ([{ createHighlighterCore }, { createJavaScriptRegexEngine }, theme, grammar]) =>
					createHighlighterCore({
						themes: [theme.default],
						langs: [grammar.default],
						engine: createJavaScriptRegexEngine()
					})
			);
			highlighters.set(language, highlighter);
		}

		return highlighter;
	}

	$effect(() => {
		let cancelled = false;
		highlightedCode = undefined;

		void getHighlighter(language)
			?.then((highlighter) =>
				highlighter.codeToHtml(source, { lang: language, theme: 'github-dark-default' })
			)
			.then((html) => {
				if (!cancelled && html) highlightedCode = html;
			})
			.catch(() => {
				// Keep the escaped Svelte fallback visible for unrecognised languages.
			});

		return () => {
			cancelled = true;
		};
	});

	function copyCode() {
		void navigator.clipboard.writeText(source).then(() => {
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2_000);
		});
	}
</script>

<figure class="codeblock">
	<div class="codeblock__bar">
		<span class="codeblock__dots"><i></i><i></i><i></i></span>
		<span class="codeblock__lang">{languageLabel}</span>
		<button
			class="codeblock__copy"
			type="button"
			onclick={copyCode}
			aria-label="Copy code to clipboard"
		>
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
	{#if highlightedCode}
		<div class="codeblock__content">{@html highlightedCode}</div>
	{:else}
		<pre><code>{source}</code></pre>
	{/if}
</figure>

<style>
	.codeblock {
		margin: 2.5rem 0;
		width: 100vw;
		max-width: 52rem;
		margin-left: 50%;
		transform: translateX(-50%);
		border-radius: 12px;
		overflow: hidden;
		background: #0d1117;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow:
			0 24px 50px -28px rgba(0, 0, 0, 0.55),
			inset 0 1px rgba(255, 255, 255, 0.05);
	}
	.codeblock__bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.codeblock__dots {
		display: inline-flex;
		gap: 0.4rem;
	}
	.codeblock__dots i {
		width: 11px;
		height: 11px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.16);
	}
	.codeblock__lang {
		flex: 1;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}
	.codeblock__copy {
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 5px;
		padding: 0.25rem 0.5rem;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.68);
		font: inherit;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}
	.codeblock__copy:hover {
		background: rgba(255, 255, 255, 0.12);
		color: #fff;
	}
	.codeblock__copy:focus-visible {
		outline: 2px solid #79c0ff;
		outline-offset: 2px;
	}
	.codeblock pre {
		margin: 0;
		padding: 1.4rem 1.5rem;
		overflow-x: auto;
		font-size: 0.9rem;
		line-height: 1.7;
		color: #c9d1d9;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	.codeblock__content :global(.shiki) {
		margin: 0;
		padding: 1.4rem 1.5rem;
		overflow-x: auto;
		background: transparent !important;
		font-size: 0.9rem;
		line-height: 1.7;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	@media (max-width: 640px) {
		.codeblock {
			width: 100%;
			margin-left: 0;
			transform: none;
			border-radius: 9px;
		}
	}
</style>
