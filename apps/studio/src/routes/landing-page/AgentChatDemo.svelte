<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import {
		MessageScroller,
		MessageScrollerButton,
		MessageScrollerContent,
		MessageScrollerItem,
		MessageScrollerProvider,
		MessageScrollerViewport
	} from '@aphexcms/ui/shadcn/message-scroller';
	import { Message, MessageContent, MessageFooter } from '@aphexcms/ui/shadcn/message';
	import { Bubble, BubbleContent } from '@aphexcms/ui/shadcn/bubble';
	import {
		Bot,
		Check,
		ChevronDown,
		Copy,
		Database,
		FileCode,
		Layers,
		LoaderCircle,
		RefreshCw,
		Search,
		Send,
		Sparkles,
		Trash2
	} from '@lucide/svelte';

	const demos = [
		{
			prompt: 'List the collections in this CMS',
			tool: 'Listed collections',
			detail: '5 collections',
			response: 'This CMS has Locations, Menus, Menu Items, Dietary Tags, and Business Settings.',
			icon: Layers
		},
		{
			prompt: 'Summarize the latest published documents',
			tool: 'Searched documents',
			detail: 'Published perspective · 3 results',
			response:
				'The latest updates are a seasonal dinner menu, the downtown location hours, and the Truffle Rigatoni menu item.',
			icon: Search
		},
		{
			prompt: 'Describe the schema for my pages',
			tool: 'Read a schema',
			detail: 'Page',
			response:
				'Pages include a title, slug, modular content blocks, SEO fields, and references to shared site settings.',
			icon: FileCode
		}
	] as const;

	let activeDemo = $state<(typeof demos)[number] | null>(null);
	let demoStatus = $state<'working' | 'complete'>('complete');
	let input = $state('');
	let completionTimer: ReturnType<typeof setTimeout> | undefined;

	function runDemo(demo: (typeof demos)[number]) {
		if (completionTimer) clearTimeout(completionTimer);

		activeDemo = demo;
		demoStatus = 'working';
		completionTimer = setTimeout(() => {
			demoStatus = 'complete';
		}, 1400);
	}

	function clearDemo() {
		if (completionTimer) clearTimeout(completionTimer);
		completionTimer = undefined;
		activeDemo = null;
		demoStatus = 'complete';
	}

	onDestroy(() => {
		if (completionTimer) clearTimeout(completionTimer);
	});
</script>

<div class="bg-muted/20 flex h-full min-h-0 flex-col">
	<header
		class="bg-background/90 flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur sm:px-6"
	>
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg"
			>
				<Sparkles class="size-4" />
			</div>
			<div class="min-w-0">
				<h3 class="truncate text-sm font-semibold">Aphex Assistant</h3>
				<p class="text-muted-foreground truncate text-xs">CMS-aware answers and content tools</p>
			</div>
		</div>
		{#if activeDemo}
			<Button variant="ghost" size="icon-sm" onclick={clearDemo} aria-label="Clear conversation">
				<Trash2 />
			</Button>
		{/if}
	</header>

	<MessageScrollerProvider
		autoScroll
		defaultScrollPosition="last-anchor"
		scrollPreviousItemPeek={48}
	>
		<MessageScroller class="min-h-0 flex-1">
			<MessageScrollerViewport>
				<MessageScrollerContent class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
					{#if !activeDemo}
						<div class="m-auto flex max-w-xl flex-col items-center px-4 py-8 text-center">
							<div
								class="border-primary/20 bg-primary/10 text-primary mb-5 flex size-14 items-center justify-center rounded-2xl border shadow-sm"
							>
								<Bot class="size-7" />
							</div>
							<h4 class="text-xl font-semibold tracking-tight">What are we working on?</h4>
							<p class="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
								Ask about your schemas, inspect documents, or use the CMS tools available to your
								role.
							</p>
							<div class="mt-6 grid w-full gap-2 sm:grid-cols-3">
								{#each demos as demo}
									<button
										type="button"
										class="bg-background hover:bg-accent flex cursor-pointer items-start rounded-xl border p-3 text-left text-xs leading-relaxed shadow-xs transition-colors"
										onclick={() => runDemo(demo)}
									>
										{demo.prompt}
									</button>
								{/each}
							</div>
						</div>
					{:else}
						<MessageScrollerItem messageId="demo-user" scrollAnchor>
							<Message align="end">
								<MessageContent>
									<Bubble variant="secondary" align="end">
										<BubbleContent class="rounded-xl">{activeDemo.prompt}</BubbleContent>
									</Bubble>
								</MessageContent>
							</Message>
						</MessageScrollerItem>

						<MessageScrollerItem messageId="demo-assistant">
							<Message align="start" class="mt-6">
								<MessageContent>
									<details class="group/tools mb-2 w-full" open>
										<summary
											class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs transition-colors"
										>
											<span class:shimmer={demoStatus === 'working'}>{activeDemo.tool}</span>
											<ChevronDown
												class="size-3 transition-transform group-open/tools:rotate-180"
											/>
										</summary>
										<div class="bg-muted/40 mt-1.5 flex flex-col gap-2.5 rounded-lg px-2.5 py-2">
											<div class="flex flex-col gap-0.5">
												<div class="text-muted-foreground flex items-center gap-2 text-xs">
													{#if demoStatus === 'working'}
														<LoaderCircle class="size-3 shrink-0 animate-spin" />
													{:else}
														<activeDemo.icon class="size-3 shrink-0" />
													{/if}
													<span>{activeDemo.tool}</span>
												</div>
												<p class="text-muted-foreground/80 pl-5 text-xs">{activeDemo.detail}</p>
											</div>
											<div class="text-muted-foreground flex items-center gap-2 text-xs">
												{#if demoStatus === 'working'}
													<LoaderCircle class="size-3 animate-spin" />
													<span class="shimmer">Working…</span>
												{:else}
													<Check class="size-3" /> Done
												{/if}
											</div>
										</div>
									</details>
									{#if demoStatus === 'complete'}
										<div class="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
											<Bubble variant="ghost">
												<BubbleContent class="px-0">{activeDemo.response}</BubbleContent>
											</Bubble>
											<MessageFooter>
												<Button
													variant="ghost"
													size="icon-sm"
													class="size-7"
													aria-label="Copy response"
												>
													<Copy />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													class="size-7"
													aria-label="Retry response"
												>
													<RefreshCw />
												</Button>
											</MessageFooter>
										</div>
									{/if}
								</MessageContent>
							</Message>
						</MessageScrollerItem>
					{/if}
				</MessageScrollerContent>
			</MessageScrollerViewport>
			<MessageScrollerButton />
		</MessageScroller>
	</MessageScrollerProvider>

	<div
		class="from-background via-background shrink-0 bg-linear-to-t to-transparent px-3 pt-2 pb-3 sm:px-6 sm:pb-5"
	>
		<form
			class="bg-background focus-within:border-ring focus-within:ring-ring/20 mx-auto max-w-3xl rounded-2xl border p-2 shadow-lg transition-shadow focus-within:ring-3"
			onsubmit={(event) => event.preventDefault()}
		>
			<Textarea
				bind:value={input}
				rows={1}
				placeholder="Ask about your content..."
				class="max-h-40 min-h-11 resize-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
			/>
			<div class="flex items-center justify-between px-1 pt-1">
				<div class="text-muted-foreground flex items-center gap-1.5 text-[11px]">
					<Database class="size-3" /><span>Uses tools allowed by your role</span>
				</div>
				<Button type="submit" size="icon-sm" disabled={!input.trim()} aria-label="Send message">
					<Send />
				</Button>
			</div>
		</form>
		<p class="text-muted-foreground mx-auto mt-2 max-w-3xl text-center text-[10px]">
			AI can make mistakes. Review content changes before publishing.
		</p>
	</div>
</div>
