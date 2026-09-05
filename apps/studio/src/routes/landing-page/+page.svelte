<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Activity,
		ArrowLeft,
		ArrowRight,
		ArrowUpRight,
		BookOpen,
		CalendarClock,
		Check,
		ChevronDown,
		Copy,
		Database,
		FileText,
		Github,
		LayoutGrid,
		Mail,
		MapPin,
		Maximize2,
		Minus,
		Monitor,
		MoreHorizontal,
		PanelLeft,
		Pencil,
		Plus,
		RefreshCw,
		Search,
		Send,
		Settings,
		Smartphone,
		Sparkles,
		Sun,
		Tablet,
		Tag,
		Trash2,
		Utensils,
		UserRound,
		X
	} from '@lucide/svelte';
	import Logo from '$lib/components/Logo.svelte';
	import AgentChatDemo from './AgentChatDemo.svelte';

	let activeEditorBenefit = $state<0 | 1 | 2 | 3>(0);
	let activeExtensionSurface = $state(0);
	let editorBenefitTimer: ReturnType<typeof setInterval> | undefined;

	function startEditorBenefitTimer() {
		editorBenefitTimer = setInterval(() => navigateEditorBenefit(1, false), 5000);
	}

	function resetEditorBenefitTimer() {
		if (!editorBenefitTimer) return;

		clearInterval(editorBenefitTimer);
		startEditorBenefitTimer();
	}

	function navigateEditorBenefit(direction: -1 | 1, restartTimer = true) {
		activeEditorBenefit = ((activeEditorBenefit + direction + 4) % 4) as typeof activeEditorBenefit;
		if (restartTimer) resetEditorBenefitTimer();
	}

	function selectEditorBenefit(benefit: typeof activeEditorBenefit) {
		activeEditorBenefit = benefit;
		resetEditorBenefitTimer();
	}

	onMount(() => {
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		startEditorBenefitTimer();
		return () => clearInterval(editorBenefitTimer);
	});

	const interfaces = [
		{
			name: 'Local API',
			detail: 'Fully typed',
			icon: 'local',
			iconSrc: '/icons/Code.svg',
			docsUrl: 'https://docs.getaphex.com/local-api',
			description: 'Query your content directly, without a network hop.',
			route: 'collections.menuItem.find()',
			result: 'FindResult<MenuItem>'
		},
		{
			name: 'HTTP API',
			detail: 'Ready to consume',
			icon: 'http',
			iconSrc: '/icons/Globe.svg',
			docsUrl: 'https://docs.getaphex.com/http-api',
			description: 'Use predictable endpoints from any frontend or service.',
			route: 'GET /api/documents?type=menuItem',
			result: '200 OK · application/json'
		},
		{
			name: 'GraphQL',
			detail: 'Generated schema',
			icon: 'graphql',
			iconSrc: '/icons/GraphQL.svg',
			docsUrl: 'https://docs.getaphex.com/graphql',
			description: 'Ask for exactly the fields each customer surface needs.',
			route: 'query { allMenuItem { name } }',
			result: 'data.allMenuItem'
		},
		{
			name: 'Admin UI',
			detail: 'Ready to edit',
			icon: 'admin',
			iconSrc: '/icons/Window.svg',
			docsUrl: 'https://docs.getaphex.com/getting-started',
			description: 'Give content teams a complete editor from the same model.',
			route: 'Content / Menu Items',
			result: '3 documents'
		}
	];

	const assistantBenefits = [
		'Built-in Assistant plus MCP for external AI clients',
		'Grounded in your schemas, documents, and editor context',
		'Role-scoped tools with reviewable draft changes',
		'Auditable changes with undo and deliberate publishing'
	];

	const technologies = [
		{ name: 'PostgreSQL', use: 'Database', logo: 'https://cdn.simpleicons.org/postgresql' },
		{ name: 'SQLite', use: 'Database', logo: 'https://cdn.simpleicons.org/sqlite' },
		{ name: 'Turso', use: 'Hosted SQLite', logo: 'https://cdn.simpleicons.org/turso' },
		{
			name: 'Amazon S3',
			use: 'Object storage',
			logo: 'https://api.iconify.design/logos/aws-s3.svg'
		},
		{
			name: 'Cloudflare R2',
			use: 'Object storage',
			logo: 'https://cdn.simpleicons.org/cloudflare'
		},
		{ name: 'MinIO', use: 'Object storage', logo: 'https://cdn.simpleicons.org/minio' },
		{
			name: 'Better Auth',
			use: 'Authentication',
			logo: 'https://cdn.simpleicons.org/betterauth/000000'
		},
		{ name: 'Resend', use: 'Email', logo: 'https://cdn.simpleicons.org/resend' },
		{ name: 'SMTP', use: 'Email', logo: null },
		{ name: 'Anthropic', use: 'AI provider', logo: 'https://cdn.simpleicons.org/anthropic' },
		{
			name: 'OpenAI',
			use: 'AI provider',
			// Simple Icons dropped the OpenAI mark; Iconify still serves it.
			logo: 'https://api.iconify.design/simple-icons/openai.svg?color=%23000000'
		},
		{ name: 'Ollama', use: 'Local AI', logo: 'https://cdn.simpleicons.org/ollama' }
	];

	const extensionSurfaces = [
		{
			index: 'A',
			title: 'Extend schemas and write behavior',
			copy: 'Contribute new schemas, transform the resolved content model, and normalize writes with typed schema hooks that run before validation.',
			parts: ['Schema parts', 'Schema transforms', 'Schema hooks']
		},
		{
			index: 'B',
			title: 'Change the editing experience',
			copy: 'Drop in Svelte field inputs, document actions, or complete tools that live inside the Studio.',
			parts: ['Field components', 'Document actions', 'Admin tools']
		},
		{
			index: 'C',
			title: 'Add protected APIs and agent tools',
			copy: 'Mount server routes with explicit access rules, expose capability-gated agent tools, and add permissions that appear in the roles UI.',
			parts: ['Server routes', 'Agent tools', 'Role capabilities']
		},
		{
			index: 'D',
			title: 'React with durable events and jobs',
			copy: 'Subscribe to immutable domain events. A transactional outbox creates database-backed delivery jobs with leases, retries, backoff, and dead-lettering, all inspectable in Activity.',
			parts: ['Event consumers', 'Transactional outbox', 'Durable jobs', 'Activity + retry']
		}
	];

	const sponsors = [
		{
			name: 'White Raven Brands',
			handle: '@whiteravenbrands',
			logo: 'https://avatars.githubusercontent.com/u/189678619?v=4',
			url: 'https://github.com/whiteravenbrands'
		}
	];

	const seoTitle = 'AphexCMS — The Open-Source CMS That Runs in Your App';
	const seoDescription =
		'An open-source CMS that runs inside your SvelteKit app, on your own database — schema-as-code, typed APIs, visual editing, and a Studio your clients can run themselves.';
	const softwareApplicationSchema = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'AphexCMS',
		applicationCategory: 'Content Management System',
		operatingSystem: 'Cross-platform',
		description: seoDescription,
		isAccessibleForFree: true,
		license: 'https://opensource.org/license/mit',
		sameAs: 'https://github.com/IcelandicIcecream/aphex',
		softwareRequirements: 'SvelteKit',
		featureList: [
			'TypeScript schema-as-code',
			'Typed Local, HTTP, and GraphQL APIs',
			'Visual editing for SvelteKit',
			'PostgreSQL and SQLite database adapters',
			'MIT-licensed open-source CMS'
		],
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		}
	};
</script>

<svelte:head>
	<title>{seoTitle}</title>
	<meta name="description" content={seoDescription} />
	<meta name="robots" content="index, follow" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="AphexCMS" />
	<meta property="og:title" content={seoTitle} />
	<meta property="og:description" content={seoDescription} />
	<meta name="twitter:card" content="summary" />
	<meta name="twitter:title" content={seoTitle} />
	<meta name="twitter:description" content={seoDescription} />
	{@html `<script type="application/ld+json">${JSON.stringify(softwareApplicationSchema)}<\/script>`}
</svelte:head>

<div class="landing">
	<header class="site-header">
		<a class="brand" href="/" aria-label="AphexCMS home">
			<Logo variant="mark" class="brand-mark" />
			<span>aphex</span>
		</a>

		<nav aria-label="Main navigation">
			<a href="#product">Product</a>
			<a href="#developers">Developers</a>
			<a href="#customize">Customize</a>
			<a href="#open-source">Open source</a>
		</nav>

		<div class="header-actions">
			<a
				class="text-link"
				href="https://github.com/IcelandicIcecream/aphex"
				target="_blank"
				rel="noreferrer"
			>
				GitHub <ArrowUpRight size={14} strokeWidth={1.8} />
			</a>
			<a class="button button-dark button-small" href="/admin">
				Open Studio <ArrowRight size={15} strokeWidth={1.8} />
			</a>
		</div>
	</header>

	<main>
		<section class="hero">
			<div class="hero-copy">
				<div class="hero-logo-display"><Logo variant="mark" class="hero-display-logo" /></div>
				<h1>Content infrastructure<br />for the modern web</h1>
				<p class="hero-lede">
					Aphex is built on and for SvelteKit, with content stored in your own database. Developers
					get schema-as-code and typed APIs. Editors get a polished Studio. Nobody gets an invoice
					for reading their own content.
				</p>

				<div class="hero-actions">
					<div class="install-command">
						<span>$</span><code>pnpm create aphex</code><button
							type="button"
							aria-label="Copy install command"
							title="Copy install command"
							onclick={() => navigator.clipboard.writeText('pnpm create aphex')}
						>
							<Copy size={14} strokeWidth={1.8} />
						</button>
					</div>
					<a class="button button-lime" href="/admin">
						Try the demo <ArrowRight size={17} strokeWidth={1.8} />
					</a>
				</div>
			</div>

			<div class="hero-art" aria-label="Preview of the Aphex content editor">
				<div class="hero-database-note">
					<Database size={19} strokeWidth={1.8} />
					<span><b>Your database.</b><small>Your infrastructure. Your content.</small></span>
				</div>
				<div class="orbit orbit-one"></div>
				<div class="orbit orbit-two"></div>
				<div class="editor-window">
					<div class="editor-shell">
						<div class="editor-bar">
							<div class="editor-brand"><PanelLeft size={13} strokeWidth={1.8} /></div>
							<div class="studio-switcher">
								<strong>Structure</strong><span>Vision</span><span>Media</span>
							</div>
							<div class="editor-controls">
								<button aria-label="Theme"><Sun size={13} /></button>
							</div>
						</div>
						<div class="editor-body">
							<div class="document-list">
								<div class="list-heading"><strong>Content</strong></div>
								<div class="type-item"><MapPin size={10} /> Locations</div>
								<div class="type-item"><BookOpen size={10} /> Menus <b>›</b></div>
								<div class="type-item active-type"><Utensils size={10} /> Menu Items</div>
								<div class="type-item"><Tag size={10} /> Dietary Tags</div>
								<div class="nav-title website-types">Website</div>
								<div class="type-item"><FileText size={10} /> Pages</div>
								<div class="type-item"><BookOpen size={10} /> Blog Posts</div>
								<div class="type-item"><UserRound size={10} /> Authors</div>
								<div class="nav-title type-settings">Settings</div>
								<div class="type-item"><Settings size={10} /> Business Settings</div>
							</div>

							<div class="record-list">
								<div class="list-heading">
									<div><strong>Menu Items</strong><small>3 documents</small></div>
									<div class="list-actions">
										<Search size={10} /><Plus size={11} /><MoreHorizontal size={11} />
									</div>
								</div>
								<div class="record active-record">
									<Utensils size={10} />
									<div><strong>Truffle Rigatoni</strong><small>Pasta / $24</small></div>
									<time>Today</time><i></i>
								</div>
								<div class="record">
									<Utensils size={10} />
									<div><strong>Charred Carrots</strong><small>Small plates / $14</small></div>
									<time>Yesterday</time><i></i>
								</div>
								<div class="record">
									<Utensils size={10} />
									<div><strong>Basque Cheesecake</strong><small>Dessert / $12</small></div>
									<time>28 Aug</time><i></i>
								</div>
							</div>

							<div class="document-editor">
								<div class="editor-heading">
									<div class="editor-heading-top">
										<span>MENU ITEM</span>
										<div class="editor-statuses">
											<div class="autosave"><i></i> Auto-saved</div>
											<div class="status draft"><i></i> Draft</div>
											<div class="status published"><i></i> Published · 2h</div>
											<MoreHorizontal size={11} /><Monitor size={11} /><Maximize2 size={11} />
											<X size={11} />
										</div>
									</div>
									<h2>Truffle Rigatoni</h2>
								</div>
								<div class="field-scroll">
									<div class="field-group">
										<span class="field-label">Name <b>*</b></span>
										<div class="input focused-input">Truffle Rigatoni</div>
									</div>
									<div class="field-group">
										<span class="field-label">Short Description</span>
										<div class="input description-input">
											Brown butter, wild mushrooms, parmesan and black truffle.
										</div>
									</div>
									<div class="field-group">
										<span class="field-label">Price <b>*</b></span>
										<div class="input">24</div>
									</div>
									<div class="field-group hero-image-group">
										<span class="field-label">Dish Image</span>
										<div class="hero-dish-field">
											<img src="/images/aphex-diner-rigatoni.jpg" alt="A plated rigatoni dish" />
											<button aria-label="Dish image options"><MoreHorizontal size={10} /></button>
										</div>
									</div>
								</div>
								<div class="publish-bar">
									<span></span>
									<div>
										<CalendarClock size={11} /><button>Publish Changes</button><Trash2 size={11} />
									</div>
								</div>
							</div>
						</div>
						<button class="editor-assistant-fab" aria-label="Open Aphex Assistant">
							<Sparkles size={13} strokeWidth={1.8} />
						</button>
					</div>
				</div>
			</div>
		</section>

		<section class="interface-section" aria-labelledby="interfaces-title">
			<div class="interface-heading">
				<div>
					<h2 class="section-title" id="interfaces-title">
						One definition<br />Multiple interfaces
					</h2>
				</div>
				<p class="section-subtitle">
					Define a TypeScript content schema once. Aphex turns it into a typed Local API, HTTP
					endpoints, GraphQL, and a complete editing interface for your headless CMS.
				</p>
			</div>

			<div class="interface-flow">
				<div class="schema-card">
					<div class="flow-card-top"><span>01 / DEFINITION</span><b>menu-item.ts</b></div>
					<pre><code
							><span class="purple">defineType</span>(&#123;
  type: <span class="green">'document'</span>,
  name: <span class="green">'menuItem'</span>,
  title: <span class="green">'Menu Item'</span>,
  fields: [
    &#123; name: <span class="green">'name'</span>, type: <span class="green">'string'</span
							>, title: <span class="green">'Name'</span> &#125;,
    &#123; name: <span class="green">'price'</span>, type: <span class="green">'number'</span
							>, title: <span class="green">'Price'</span> &#125;,
    &#123; name: <span class="green">'image'</span>, type: <span class="green">'image'</span
							>, title: <span class="green">'Image'</span> &#125;
  ]
&#125;)</code
						></pre>
				</div>

				<div class="flow-arrow" aria-hidden="true"><span></span><ArrowRight size={22} /></div>

				<div class="interface-cards">
					{#each interfaces as item, index}
						<article>
							<div class="interface-card-header">
								<div class="interface-card-brand">
									<span class="interface-icon">
										<img src={item.iconSrc} alt="" />
									</span>
									<h3>{item.name}</h3>
								</div>
								<span>0{index + 2}</span>
							</div>
							<div class="interface-card-body">
								<b>{item.detail}</b>
								<p>{item.description}</p>
								<code>{item.route}</code>
								{#if item.icon === 'admin'}
									<div class="admin-card-preview">
										<div>
											<Utensils size={9} /><span
												><strong>Truffle Rigatoni</strong><small>Pasta / $24</small></span
											><i></i>
										</div>
										<div>
											<Utensils size={9} /><span
												><strong>Charred Carrots</strong><small>Small plates / $14</small></span
											><i></i>
										</div>
									</div>
								{:else}
									<div class="interface-result"><Check size={10} /><span>{item.result}</span></div>
								{/if}
								<a
									class="interface-doc-link"
									href={item.docsUrl}
									target="_blank"
									rel="noreferrer"
									aria-label={`Read the ${item.name} documentation`}
									>View docs <ArrowUpRight size={12} strokeWidth={1.8} /></a
								>
							</div>
						</article>
					{/each}
				</div>
			</div>
		</section>

		<section class="capabilities" id="product">
			<div class="section-heading">
				<div>
					<h2 class="section-title">Built for the people<br />who run the site</h2>
				</div>
				<div class="section-heading-support">
					<p class="section-subtitle">
						Give content teams a Studio shaped around the business, with clear publishing states,
						safe history, and visual editing when page context matters.
					</p>
				</div>
			</div>

			<div class="editor-benefit-showcase">
				<div class="editor-benefit-list">
					<button
						class:active={activeEditorBenefit === 0}
						type="button"
						onclick={() => selectEditorBenefit(0)}
						aria-pressed={activeEditorBenefit === 0}
					>
						<span class="benefit-list-icon"><LayoutGrid size={17} strokeWidth={1.6} /></span>
						<div>
							<strong>Business-shaped content</strong>
							<p>Clear forms built around the concepts your team already knows.</p>
						</div>
					</button>
					<button
						class:active={activeEditorBenefit === 1}
						type="button"
						onclick={() => selectEditorBenefit(1)}
						aria-pressed={activeEditorBenefit === 1}
					>
						<span class="benefit-list-icon"><CalendarClock size={17} strokeWidth={1.6} /></span>
						<div>
							<strong>Publishing with intent</strong>
							<p>Clear perspectives, deliberate publishing, and scheduling when you need it.</p>
						</div>
					</button>
					<button
						class:active={activeEditorBenefit === 2}
						type="button"
						onclick={() => selectEditorBenefit(2)}
						aria-pressed={activeEditorBenefit === 2}
					>
						<span class="benefit-list-icon"><RefreshCw size={17} strokeWidth={1.6} /></span>
						<div>
							<strong>Safe history</strong>
							<p>Preview and restore versions without turning mistakes into emergencies.</p>
						</div>
					</button>
					<button
						class:active={activeEditorBenefit === 3}
						type="button"
						onclick={() => selectEditorBenefit(3)}
						aria-pressed={activeEditorBenefit === 3}
					>
						<span class="benefit-list-icon"><Monitor size={17} strokeWidth={1.6} /></span>
						<div>
							<strong>Visual editing</strong>
							<p>Edit in page context when it helps, without making it the only workflow.</p>
						</div>
					</button>
				</div>

				<div class="editor-benefit-visual">
					<div class="benefit-meta"><span>0{activeEditorBenefit + 1}</span><b>STUDIO</b></div>

					{#if activeEditorBenefit === 0}
						<div
							class="studio-fragment models-fragment"
							role="img"
							aria-label="Content models in Aphex Studio"
						>
							<div class="fragment-header">
								<div><small>Content</small><strong>Models shaped around your site</strong></div>
								<span>5 document types</span>
							</div>
							<div class="model-grid">
								<div>
									<i><BookOpen size={15} /></i><strong>Blog Post</strong><small
										>Title · Author → · Tags → · Content</small
									>
								</div>
								<div>
									<i><FileText size={15} /></i><strong>Page</strong><small
										>Title · Slug · Content · SEO</small
									>
								</div>
								<div>
									<i><UserRound size={15} /></i><strong>Author</strong><small
										>Name · Image · Bio</small
									>
								</div>
								<div><i><Tag size={15} /></i><strong>Tag</strong><small>Title · Slug</small></div>
								<div class="model-wide">
									<i><Settings size={15} /></i><strong>Site Settings</strong><small
										>General · Home · Navigation · Design</small
									>
								</div>
							</div>
						</div>
					{:else if activeEditorBenefit === 1}
						<div
							class="studio-fragment workflow-fragment"
							role="img"
							aria-label="Publishing validation and scheduling in Aphex Studio"
						>
							<div class="fragment-header">
								<div><small>Blog Post</small><strong>Autumn dinner menu</strong></div>
								<span><i class="unsaved"></i> Unsaved</span>
							</div>
							<div class="publishing-canvas">
								<div class="validation-card">
									<strong>Fix 2 fields to publish</strong>
									<div><span>Cover Image</span><b>Required</b></div>
									<div><span>Tags</span><b>1 unpublished reference</b></div>
									<small>Publish the referenced documents first, then try again.</small>
								</div>
								<div class="schedule-dialog">
									<strong>Schedule Publish</strong>
									<p>Select when this document should be published.</p>
									<div class="fragment-field">
										<span>Schedule on</span><i>Sep 1, 2026&nbsp;&nbsp; 10:00 AM</i>
									</div>
									<div>
										<button type="button" tabindex="-1">Cancel</button><button
											type="button"
											tabindex="-1">Schedule</button
										>
									</div>
								</div>
							</div>
							<div class="publishing-footer">
								<span>Auto-saved</span>
								<div><CalendarClock size={13} /><b>Publish Changes</b></div>
							</div>
						</div>
					{:else if activeEditorBenefit === 2}
						<div
							class="studio-fragment history-fragment"
							role="img"
							aria-label="Document History panel in Aphex Studio"
						>
							<div class="revision-preview">
								<div class="fragment-header">
									<div><small>Blog Post</small><strong>Autumn dinner menu</strong></div>
								</div>
								<div class="revision-field"><span>Title</span><i>Autumn dinner menu</i></div>
								<div class="revision-footer">
									<span>Revision from Aug 28, 2026, 4:42 PM</span><b>Restore</b>
								</div>
							</div>
							<aside>
								<strong>History</strong>
								<div class="history-tabs"><b>All</b><span>Published</span><span>Drafts</span></div>
								<button class="selected" type="button" tabindex="-1"
									><span>Aug 28, 4:42 PM</span><b>draft</b><small>Elena Marín</small></button
								>
								<button type="button" tabindex="-1"
									><span>Aug 27, 11:08 AM</span><b>publish</b><small>Elena Marín</small></button
								>
								<button type="button" tabindex="-1"
									><span>Aug 26, 3:16 PM</span><b>draft</b><small>Marcus Lee</small></button
								>
							</aside>
						</div>
					{:else}
						<div
							class="studio-fragment present-fragment"
							role="img"
							aria-label="Visual editing in Aphex Studio"
						>
							<div class="present-fields">
								<strong>Autumn dinner menu</strong>
								<div class="fragment-field"><span>Title</span><i>Autumn dinner menu</i></div>
								<div class="fragment-field"><span>Cover Image</span><i>rigatoni.jpg</i></div>
							</div>
							<div class="present-preview">
								<div class="present-toolbar">
									<b><span class="present-toggle"></span> Edit</b>
									<span class="present-refresh"><RefreshCw size={10} /></span>
									<span class="present-url">localhost:5173/blog/autumn-dinner-menu</span>
									<span class="present-viewports">
										<span class="vp on"><Monitor size={10} /></span>
										<span class="vp"><Tablet size={10} /></span>
										<span class="vp"><Smartphone size={10} /></span>
									</span>
								</div>
								<div class="present-page">
									<div><small>SEASONAL MENU</small><strong>Autumn dinner<br />menu</strong></div>
									<figure>
										<img src="/images/aphex-diner-rigatoni.jpg" alt="Rigatoni dish preview" /><span
											>Cover Image</span
										>
									</figure>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>
			<div class="benefit-navigation" aria-label="Navigate Studio benefits">
				<span>0{activeEditorBenefit + 1} / 04</span>
				<div>
					<button
						type="button"
						onclick={() => navigateEditorBenefit(-1)}
						aria-label="Previous Studio benefit"><ArrowLeft size={18} strokeWidth={1.7} /></button
					>
					<button
						type="button"
						onclick={() => navigateEditorBenefit(1)}
						aria-label="Next Studio benefit"><ArrowRight size={18} strokeWidth={1.7} /></button
					>
				</div>
			</div>
		</section>

		<section class="assistant-section" aria-labelledby="assistant-title">
			<div class="assistant-copy">
				<h2 class="section-title" id="assistant-title">First Class AI Support</h2>
				<p class="section-subtitle">
					The built-in Assistant helps editors work in context. MCP gives AI clients and coding
					agents a governed way to understand schemas, inspect content, and prepare changes through
					the same CMS.
				</p>
				<ul>
					{#each assistantBenefits as item}<li><Check size={14} /> {item}</li>{/each}
				</ul>
			</div>

			<div class="assistant-demo" aria-label="Preview of Aphex Assistant in the Studio">
				<AgentChatDemo />
			</div>
		</section>

		<section class="developer-section" id="developers">
			<div class="developer-intro">
				<h2 class="section-title">Bring the stack<br />you already run</h2>
				<p class="section-subtitle">
					Set up the adapters for your environment, then reference them in your CMS config. Aphex
					keeps database, storage, auth, and email boundaries explicit, so infrastructure changes
					don't require redesigning your schemas or editor experience.
				</p>
				<a
					class="text-link"
					href="https://docs.getaphex.com/configuration"
					target="_blank"
					rel="noreferrer"
				>
					Configuration docs <ArrowUpRight size={14} strokeWidth={1.8} />
				</a>
			</div>

			<div class="developer-proof">
				<div class="technology-support">
					<div class="technology-ledger" aria-label="Supported technologies">
						<div class="technology-ledger-head">
							<span>First-party adapters</span><b>{technologies.length} supported technologies</b>
						</div>
						<div class="technology-list">
							{#each technologies as technology}
								<div class="technology-row">
									<i>
										{#if technology.logo}
											<img src={technology.logo} alt={`${technology.name} logo`} />
										{:else}
											<Mail size={14} />
										{/if}
									</i><strong>{technology.name}</strong><span>{technology.use}</span><b
										>Supported <Check size={12} /></b
									>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</section>

		<section class="extensions" id="customize">
			<div class="extensions-main">
				<div class="extension-visual">
					<div class="layer-stage" aria-label="Interactive extension architecture layers">
						{#each extensionSurfaces as surface, surfaceIndex}
							<button
								type="button"
								class:active={activeExtensionSurface === surfaceIndex}
								onclick={() => (activeExtensionSurface = surfaceIndex)}
								aria-label={`Select layer ${surface.index}: ${surface.title}`}
								aria-pressed={activeExtensionSurface === surfaceIndex}
							>
								<span class="layer-content">
									<span class="layer-index">{surface.index}</span>
									{#if surfaceIndex === 0}
										<LayoutGrid size={21} strokeWidth={1.6} />
									{:else if surfaceIndex === 1}
										<Pencil size={21} strokeWidth={1.6} />
									{:else if surfaceIndex === 2}
										<PanelLeft size={21} strokeWidth={1.6} />
									{:else}
										<Activity size={21} strokeWidth={1.6} />
									{/if}
								</span>
							</button>
						{/each}
					</div>
					<p class="visual-caption">
						One typed manifest connects schemas, Studio UI, protected APIs, and durable automation
					</p>
				</div>

				<div class="extensions-copy">
					<h2 class="section-title">Extendable by design</h2>
					<p class="section-subtitle">
						Typed plugins extend schemas, UI, APIs, agent tools, and durable automation without
						forking the core.
					</p>
					<div class="extension-accordion">
						{#each extensionSurfaces as surface, surfaceIndex}
							<div class:active={activeExtensionSurface === surfaceIndex} class="accordion-row">
								<button
									type="button"
									onclick={() => (activeExtensionSurface = surfaceIndex)}
									aria-expanded={activeExtensionSurface === surfaceIndex}
									aria-controls={`extension-panel-${surface.index}`}
								>
									<span>{surface.index}</span>
									<strong>{surface.title}</strong>
									<i>
										{#if activeExtensionSurface === surfaceIndex}
											<Minus size={16} />
										{:else}
											<Plus size={16} />
										{/if}
									</i>
								</button>
								{#if activeExtensionSurface === surfaceIndex}
									<div class="accordion-panel" id={`extension-panel-${surface.index}`}>
										<p>{surface.copy}</p>
										<div class="part-list">
											{#each surface.parts as part}<span>{part}</span>{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>

			<div class="manifest-strip">
				<span class="manifest-file">my-plugin.ts</span>
				<code
					><span class="purple">export default</span> <span class="blue">definePlugin</span>(&#123;
					name: <span class="green">'@aphex-diner/operations'</span>, parts: [...] &#125;)</code
				>
				<span class="manifest-status"><i></i> Typed manifest</span>
			</div>

			<div class="extension-footer">
				<p>
					<strong>Your plugin stays self-contained.</strong> Schemas, UI, routes, permissions, encrypted
					settings, event consumers, and job handlers ship together as one package.
				</p>
				<a href="https://github.com/IcelandicIcecream/aphex" target="_blank" rel="noreferrer">
					Explore the plugin architecture <ArrowUpRight size={16} strokeWidth={1.7} />
				</a>
			</div>
		</section>

		<section class="sponsor-section" id="sponsor" aria-labelledby="sponsor-title">
			<div class="sponsor-heading">
				<div>
					<h2 class="section-title" id="sponsor-title">Made possible by our sponsors.</h2>
				</div>
				<div class="sponsor-intro">
					<p>
						These people and organizations fund the ongoing development of Aphex and help keep the
						entire CMS open source.
					</p>
					<a href="https://github.com/sponsors/IcelandicIcecream" target="_blank" rel="noreferrer">
						Become a sponsor <ArrowUpRight size={15} strokeWidth={1.8} />
					</a>
				</div>
			</div>

			<div class="sponsor-showcase">
				{#each sponsors as sponsor}
					<a href={sponsor.url} target="_blank" rel="noreferrer" class="sponsor-card">
						<img src={sponsor.logo} alt={`${sponsor.name} logo`} />
						<span
							><small>Featured sponsor</small><strong>{sponsor.name}</strong><i>{sponsor.handle}</i
							></span
						>
						<ArrowUpRight size={22} strokeWidth={1.5} />
					</a>
				{/each}
			</div>
		</section>

		<section class="open-source" id="open-source">
			<div class="source-mark"><Logo variant="mark" class="source-logo" /></div>
			<div class="source-copy">
				<h2 class="section-title">Open source<br />The whole thing</h2>
				<p class="section-subtitle">
					Aphex is fully MIT licensed from Studio to server, not just an open-source editing shell.
					The editor, content engine, APIs, adapters, and job system are free to fork, extend, and
					deploy for every client, team, and website.
				</p>
				<a
					class="button button-lime"
					href="https://github.com/IcelandicIcecream/aphex"
					target="_blank"
					rel="noreferrer"
				>
					<Github size={17} strokeWidth={1.8} /> Explore the repository
				</a>
			</div>
			<div class="source-stats">
				<div><strong>100%</strong><span>Open source</span></div>
				<div><strong>MIT</strong><span>Licensed</span></div>
				<div><strong>0</strong><span>Content lock-in</span></div>
			</div>
		</section>
	</main>

	<footer>
		<div class="footer-main">
			<div class="footer-brand"><Logo variant="mark" class="footer-logo" /><span>aphex</span></div>
			<p>Built for the people who make websites.<br />And the people who run them.</p>
			<div class="footer-links">
				<div>
					<strong>Product</strong><a href="#product">Overview</a><a href="/admin">Studio</a><a
						href="#developers">Developers</a
					>
				</div>
				<div>
					<strong>Resources</strong><a href="/blog">Blog</a><a
						href="https://github.com/IcelandicIcecream/aphex">GitHub</a
					><a href="#sponsor">Sponsors</a><a
						href="https://github.com/IcelandicIcecream/aphex/issues">Support</a
					>
				</div>
			</div>
		</div>
		<div class="footer-bottom">
			<span>AphexCMS</span><span>Built in the open.</span><a href="#top"
				>Back to top <ChevronDown class="up-arrow" size={14} /></a
			>
		</div>
	</footer>
</div>

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
	:global(body) {
		margin: 0;
		background: #f8f5ef;
	}
	:global(*) {
		box-sizing: border-box;
	}

	.landing {
		--brand-accent: #ff7a22;
		--tangerine: #ffb27a;
		--sand: #f8f5ef;
		--stone: #e5e1d9;
		--ink: #111111;
		--slate: #1e1e1e;
		--charcoal: #2b2b2b;
		--smoke: #6b6b6b;
		--mist: #bdbdbd;
		--paper: #fffefb;
		--success: #22c55e;
		--info: #3b82f6;
		--warning: #f59e0b;
		--danger: #ef4444;
		--apex-gradient: linear-gradient(135deg, var(--brand-accent), var(--tangerine));
		--ink-gradient: linear-gradient(135deg, var(--ink), var(--smoke));
		--line: color-mix(in srgb, var(--ink) 18%, transparent);
		--radius-card: 18px;
		--radius-panel: 12px;
		--page-gutter: clamp(1.2rem, 3.25vw, 3.25rem);
		--container-gutter: max(var(--page-gutter), calc((100vw - 1320px) / 2));
		--font-sans:
			'Neue Haas Grotesk Display Pro', 'Neue Haas Grotesk Text Pro', 'Neue Haas Grotesk',
			'Helvetica Neue', Helvetica, Arial, sans-serif;
		min-height: 100vh;
		background: var(--sand);
		color: var(--ink);
		font-family: var(--font-sans);
		font-size: 16px;
		font-feature-settings:
			'kern' 1,
			'liga' 1;
		font-kerning: normal;
		letter-spacing: 0;
		text-rendering: optimizeLegibility;
	}

	.editor-window,
	.schema-card,
	.assistant-demo,
	.technology-support {
		border-radius: var(--radius-card);
	}
	.editor-window,
	.schema-card,
	.assistant-demo,
	.interface-cards article,
	.technology-ledger {
		overflow: hidden;
	}
	.interface-cards article,
	.technology-ledger {
		border-radius: var(--radius-panel);
	}

	.site-header {
		height: 76px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		padding: 0 var(--container-gutter);
		border-bottom: 1px solid var(--line);
		position: relative;
		z-index: 20;
	}

	.brand,
	.footer-brand {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		color: inherit;
		text-decoration: none;
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.02em;
	}
	:global(.brand-mark) {
		width: 27px;
		height: 27px;
	}
	.site-header nav {
		display: flex;
		align-items: center;
		gap: 2.2rem;
	}
	.site-header nav a,
	.text-link {
		color: inherit;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 600;
	}
	.site-header nav a:hover,
	.text-link:hover {
		opacity: 0.55;
	}
	.header-actions {
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.text-link {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.button {
		min-height: 50px;
		padding: 0 1.4rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		border: 1px solid var(--ink);
		color: var(--ink);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 700;
		transition:
			transform 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}
	.button:hover {
		transform: translateY(-2px);
	}
	.button-small {
		min-height: 39px;
		padding: 0 1rem;
	}
	.button-dark {
		background: var(--ink);
		color: var(--paper);
	}
	.button-dark:hover {
		background: var(--charcoal);
	}
	.button-lime {
		background: var(--brand-accent);
	}
	.button-lime:hover {
		background: color-mix(in srgb, var(--brand-accent) 86%, var(--ink));
	}
	.hero {
		min-height: 780px;
		display: grid;
		grid-template-columns: 46% 54%;
		overflow: hidden;
		border-bottom: 1px solid var(--line);
	}
	.hero-copy {
		padding: clamp(5rem, 9vw, 9rem) clamp(2rem, 4vw, 5rem) 6rem min(var(--container-gutter), 8rem);
		position: relative;
		z-index: 2;
	}
	.hero h1 {
		max-width: 690px;
		margin: 0;
		font-family: var(--font-sans);
		font-size: clamp(4rem, 5.2vw, 6.2rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.88;
	}
	.hero-lede {
		max-width: 31rem;
		margin: 2.8rem 0 0;
		color: var(--smoke);
		font-size: clamp(1rem, 1.4vw, 1.2rem);
		line-height: 1.55;
	}
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 2.4rem;
	}
	.install-command {
		min-height: 50px;
		padding: 0 0.9rem;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		border: 1px solid var(--line);
		background: color-mix(in srgb, var(--paper) 48%, transparent);
		font-size: 0.82rem;
	}
	.install-command span {
		color: var(--brand-accent);
		font-weight: 800;
	}
	.install-command code {
		font-family: 'SFMono-Regular', Consolas, monospace;
	}
	.install-command button {
		margin-left: 0.35rem;
		padding: 4px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--smoke);
		cursor: pointer;
	}
	.install-command button:hover {
		background: color-mix(in srgb, var(--ink) 8%, transparent);
		color: var(--ink);
	}

	.hero-art {
		min-width: 0;
		position: relative;
		background: var(--apex-gradient);
		overflow: hidden;
	}
	.hero-art::before {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(color-mix(in srgb, var(--ink) 9%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--ink) 9%, transparent) 1px, transparent 1px);
		background-size: 38px 38px;
		mask-image: linear-gradient(to bottom right, transparent, black 25%, black);
	}
	.hero-database-note {
		position: absolute;
		left: 29%;
		top: 77px;
		z-index: 4;
		padding: 13px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		border: 1px solid var(--ink);
		background: var(--paper);
		box-shadow: 4px 5px 0 color-mix(in srgb, var(--ink) 16%, transparent);
		transform: rotate(1.5deg);
	}
	.hero-database-note > span {
		display: grid;
		gap: 3px;
	}
	.hero-database-note b {
		font-size: 14px;
		line-height: 1.1;
	}
	.hero-database-note small {
		color: var(--smoke);
		font-size: 10px;
		font-weight: 600;
		white-space: nowrap;
	}
	.hero-database-note::after {
		content: '';
		width: 1px;
		height: 24px;
		position: absolute;
		left: 50%;
		top: 100%;
		background: var(--ink);
	}
	.hero-logo-display {
		width: 100px;
		height: 100px;
		position: absolute;
		right: 2rem;
		top: 2rem;
		z-index: 2;
		display: grid;
		place-items: center;
	}
	:global(.hero-display-logo) {
		width: 82px;
		height: 82px;
		color: var(--brand-accent);
		opacity: 0.48;
	}
	.orbit {
		position: absolute;
		border: 1px solid color-mix(in srgb, var(--ink) 35%, transparent);
		border-radius: 50%;
	}
	.orbit-one {
		width: 680px;
		height: 680px;
		right: -260px;
		top: -210px;
	}
	.orbit-two {
		width: 440px;
		height: 440px;
		left: -230px;
		bottom: -210px;
	}
	.editor-window {
		width: min(870px, 91%);
		height: 555px;
		position: absolute;
		left: 50%;
		top: 130px;
		border: 1px solid var(--ink);
		overflow: hidden;
		background: var(--paper);
		box-shadow: 22px 25px 0 color-mix(in srgb, var(--ink) 16%, transparent);
		transform: translateX(-50%) rotate(-1.2deg);
	}
	.editor-shell {
		height: 100%;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.editor-bar {
		height: 48px;
		padding: 0 0.85rem;
		display: grid;
		grid-template-columns: 1fr 1.4fr 1fr;
		align-items: center;
		border-bottom: 1px solid var(--stone);
		font-size: 10px;
	}
	.editor-brand {
		display: flex;
		align-items: center;
		gap: 5px;
		font-weight: 700;
	}
	:global(.editor-logo) {
		width: 17px;
		height: 17px;
	}
	.studio-switcher {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 3px;
		width: fit-content;
		margin: 0 auto;
		padding: 3px;
		border-radius: 8px;
		background: var(--stone);
		color: var(--smoke);
	}
	.studio-switcher span,
	.studio-switcher strong {
		padding: 5px 8px;
	}
	.studio-switcher strong {
		border-radius: 6px;
		background: var(--paper);
		box-shadow: 0 1px 3px color-mix(in srgb, var(--ink) 15%, transparent);
		color: var(--ink);
	}
	.editor-controls {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 10px;
		color: var(--smoke);
	}
	.editor-controls button {
		width: 27px;
		height: 27px;
		padding: 0;
		border: 1px solid var(--stone);
		border-radius: 6px;
		background: var(--paper);
		color: var(--charcoal);
		font: inherit;
	}
	.editor-body {
		height: calc(100% - 48px);
		display: grid;
		grid-template-columns: 145px 170px minmax(275px, 1fr);
		font-size: 10px;
	}
	.nav-title {
		margin: 0 8px 9px;
		color: var(--smoke);
		font-size: 8px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.document-list {
		border-right: 1px solid var(--stone);
		overflow: hidden;
		background: var(--paper);
	}
	.list-heading {
		height: 45px;
		padding: 0 14px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid var(--stone);
		font-size: 12px;
	}
	.list-heading small {
		display: block;
		margin-top: 2px;
		color: var(--smoke);
		font-size: 7px;
		font-weight: 400;
	}
	.list-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--smoke);
	}
	.type-item {
		margin: 3px 7px;
		padding: 8px;
		display: flex;
		align-items: center;
		gap: 7px;
		border-radius: 5px;
		color: var(--charcoal);
	}
	.type-item b {
		margin-left: auto;
		font-size: 12px;
	}
	.active-type {
		background: var(--stone);
	}
	.type-settings {
		margin-top: 17px;
	}
	.website-types {
		margin-top: 17px;
	}
	.record-list {
		border-right: 1px solid var(--stone);
		background: var(--paper);
	}
	.record {
		min-height: 54px;
		padding: 10px 8px;
		display: grid;
		grid-template-columns: 12px minmax(0, 1fr) auto 5px;
		align-items: center;
		gap: 6px;
		border-bottom: 1px solid var(--stone);
	}
	.record div {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.record strong {
		overflow: hidden;
		font-size: 9px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.record small,
	.record time {
		color: var(--smoke);
		font-size: 7px;
	}
	.record > i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--success);
	}
	.active-record {
		background: var(--stone);
	}
	.document-editor {
		position: relative;
		padding: 0;
		overflow: hidden;
		background: var(--paper);
	}
	.editor-heading {
		padding: 16px 15px 15px;
	}
	.editor-heading-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 13px;
	}
	.editor-heading-top > span {
		color: var(--smoke);
		font-size: 7px;
		letter-spacing: 0.1em;
	}
	.editor-heading h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}
	.editor-statuses {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--smoke);
	}
	.autosave {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--smoke);
		font-size: 6px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.autosave i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--smoke);
	}
	.status {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 7px;
		border: 1px solid var(--stone);
		border-radius: 10px;
		color: var(--smoke);
		font-size: 6px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		white-space: nowrap;
	}
	.status.draft {
		border-color: var(--brand-accent);
		background: var(--brand-accent);
		color: var(--ink);
		text-transform: uppercase;
	}
	.status i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--brand-accent);
	}
	.status.draft i {
		background: var(--ink);
	}
	/* Only the dot goes green in the real editor — the inactive perspective pill
	   keeps a neutral border. */
	.status.published i {
		background: var(--success);
	}
	.field-scroll {
		padding: 4px 15px 58px;
	}
	.field-group {
		margin-top: 19px;
	}
	.field-label {
		display: block;
		margin: 0 0 7px;
		color: var(--smoke);
		font-weight: 700;
	}
	.field-label b {
		color: var(--brand-accent);
	}
	.input {
		padding: 9px 10px;
		border: 1px solid var(--stone);
		border-radius: 5px;
		background: var(--paper);
		box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 4%, transparent);
		font-size: 11px;
	}
	.focused-input {
		border-color: var(--brand-accent);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand-accent) 22%, transparent);
	}
	.description-input {
		min-height: 48px;
		line-height: 1.45;
	}
	.hero-dish-field {
		aspect-ratio: 2.75 / 1;
		position: relative;
		overflow: hidden;
		border: 1px solid var(--stone);
		border-radius: 6px;
		background: var(--stone);
	}
	.hero-dish-field img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
		object-position: center 55%;
	}
	.hero-dish-field button {
		width: 22px;
		height: 22px;
		position: absolute;
		right: 7px;
		top: 7px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--ink) 14%, transparent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--paper) 88%, transparent);
		color: var(--smoke);
	}
	.publish-bar {
		height: 42px;
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 0 12px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--stone);
		background: color-mix(in srgb, var(--paper) 96%, transparent);
		color: var(--smoke);
	}
	.publish-bar > div {
		display: flex;
		align-items: center;
		gap: 7px;
	}
	.publish-bar button {
		padding: 6px 10px;
		border: 0;
		border-radius: 6px;
		background: var(--brand-accent);
		color: var(--ink);
		font: inherit;
		font-weight: 700;
	}
	.editor-assistant-fab {
		width: 34px;
		height: 34px;
		position: absolute;
		right: 12px;
		bottom: 54px;
		z-index: 5;
		display: grid;
		place-items: center;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--brand-accent) 55%, var(--paper));
		border-radius: 50%;
		background: var(--brand-accent);
		color: var(--ink);
		box-shadow: 0 4px 12px color-mix(in srgb, var(--ink) 20%, transparent);
	}

	.interface-section {
		padding: 7.5rem var(--container-gutter) 8rem;
		background: var(--paper);
	}
	.interface-heading {
		display: grid;
		/* The heading sets the floor here: its font-size is viewport-based, not
		   column-based, so the left track has to stay wide enough for "Multiple
		   interfaces" on one line. 0.65fr is about as much as the subtitle can
		   take before the heading wraps to three lines. */
		grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.65fr);
		align-items: end;
		gap: 4rem;
	}
	.interface-heading h2 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: clamp(3.4rem, 6.5vw, 7rem);
		font-weight: 700;
		letter-spacing: -0.04em;
		line-height: 0.87;
	}
	.interface-heading > p {
		/* No max-width: the grid track above is the constraint. The 34rem that
		   used to sit here never applied — `.landing .section-subtitle` (38rem)
		   outranks it on specificity. */
		margin: 0;
		color: var(--smoke);
		line-height: 1.65;
	}
	.interface-flow {
		display: grid;
		grid-template-columns: minmax(380px, 0.95fr) 70px minmax(0, 1.45fr);
		align-items: center;
		margin-top: 5.5rem;
	}
	.schema-card,
	.interface-cards article {
		border: 1px solid var(--ink);
		background: var(--paper);
	}
	.schema-card {
		min-width: 0;
		box-shadow: 9px 10px 0 var(--brand-accent);
	}
	.flow-card-top {
		min-height: 40px;
		padding: 0 0.85rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
		font-size: 0.68rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}
	.flow-card-top span {
		color: var(--smoke);
	}
	.flow-card-top b {
		font-weight: 700;
	}
	.schema-card pre {
		margin: 0;
		padding: 1.7rem;
		overflow-x: auto;
		background: var(--slate);
		color: var(--stone);
		font:
			clamp(11px, 0.86vw, 13px)/1.8 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.flow-arrow {
		display: flex;
		align-items: center;
		padding-left: 1rem;
		color: var(--smoke);
	}
	.flow-arrow span {
		width: 100%;
		height: 1px;
		background: currentColor;
	}
	.interface-cards {
		min-width: 0;
		height: 400px;
		position: relative;
	}
	.interface-cards article {
		width: 33%;
		min-height: 320px;
		position: absolute;
		overflow: hidden;
		background: var(--paper);
		box-shadow:
			0 0 0 7px color-mix(in srgb, var(--paper) 52%, transparent),
			0 14px 28px color-mix(in srgb, var(--ink) 12%, transparent);
		transition:
			transform 220ms ease,
			opacity 220ms ease,
			box-shadow 220ms ease;
	}
	.interface-cards article::before,
	.interface-cards article::after {
		content: '';
		width: 4px;
		height: 4px;
		position: absolute;
		z-index: 4;
		background: var(--ink);
	}
	.interface-cards article::before {
		left: 8px;
		bottom: 8px;
	}
	.interface-cards article::after {
		right: 8px;
		bottom: 8px;
	}
	.interface-cards article:nth-child(1) {
		left: 0;
		top: 65px;
		z-index: 1;
		transform: rotate(-5deg);
	}
	.interface-cards article:nth-child(2) {
		left: 22%;
		top: 5px;
		z-index: 2;
		transform: rotate(-1.5deg);
	}
	.interface-cards article:nth-child(3) {
		left: 44%;
		top: 75px;
		z-index: 3;
		transform: rotate(2.5deg);
	}
	.interface-cards article:nth-child(4) {
		right: 0;
		top: 18px;
		z-index: 4;
		transform: rotate(4deg);
	}
	.interface-cards:hover article:not(:hover) {
		opacity: 0.68;
	}
	.interface-cards article:hover {
		z-index: 10;
		box-shadow:
			0 0 0 7px color-mix(in srgb, var(--paper) 76%, transparent),
			0 24px 45px color-mix(in srgb, var(--ink) 20%, transparent);
	}
	.interface-cards article:nth-child(1):hover {
		transform: translate(-18px, -22px) rotate(-2deg) scale(1.04);
	}
	.interface-cards article:nth-child(2):hover {
		transform: translate(0, -28px) rotate(0deg) scale(1.04);
	}
	.interface-cards article:nth-child(3):hover {
		transform: translate(0, -25px) rotate(0deg) scale(1.04);
	}
	.interface-cards article:nth-child(4):hover {
		transform: translate(18px, -24px) rotate(1deg) scale(1.04);
	}
	.interface-cards article:nth-child(2) .interface-icon {
		background: var(--sand);
	}
	.interface-cards article:nth-child(3) .interface-icon {
		background: color-mix(in srgb, #7c3aed 24%, var(--paper));
	}
	.interface-cards article:nth-child(4) .interface-icon {
		background: color-mix(in srgb, var(--info) 20%, var(--paper));
	}
	.interface-card-header {
		min-height: 78px;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
	}
	.interface-card-header > span {
		color: var(--smoke);
		font-size: 0.65rem;
		font-weight: 700;
	}
	.interface-doc-link {
		width: 104px;
		margin-top: 0.85rem;
		padding: 0.45rem 0.7rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.35rem;
		border: 1px solid color-mix(in srgb, var(--ink) 34%, transparent);
		border-radius: 999px;
		background: transparent;
		color: var(--ink);
		font-size: 0.68rem;
		font-weight: 700;
		text-decoration: none;
		transition: 160ms ease;
	}
	.interface-doc-link:hover {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--paper);
	}
	.interface-doc-link:focus-visible {
		outline: 2px solid var(--brand-accent);
		outline-offset: 3px;
	}
	.interface-card-brand {
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.interface-icon {
		width: 40px;
		height: 40px;
		flex: 0 0 auto;
		display: grid;
		place-items: center;
		border: 1px solid var(--ink);
		border-radius: 50%;
		background: var(--brand-accent);
		color: var(--ink);
		font:
			700 0.7rem 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.interface-icon img {
		width: 24px;
		height: 24px;
		display: block;
		object-fit: contain;
	}
	.interface-cards article:nth-child(1) .interface-icon img {
		width: 34px;
		height: 34px;
	}
	.interface-cards article:nth-child(3) .interface-icon img {
		width: 29px;
		height: 29px;
	}
	.interface-card-brand h3 {
		margin: 0;
		overflow: hidden;
		font-size: clamp(0.88rem, 1.1vw, 1.15rem);
		letter-spacing: -0.02em;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.interface-card-body {
		padding: 1.35rem 1rem 1.5rem;
	}
	.interface-card-body > b {
		display: block;
		color: var(--smoke);
		font-size: 0.65rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.interface-card-body > p {
		min-height: 54px;
		margin: 0.75rem 0 1rem;
		color: var(--smoke);
		font-size: clamp(0.75rem, 0.82vw, 0.84rem);
		line-height: 1.45;
	}
	.interface-card-body > code {
		display: block;
		min-height: 48px;
		padding: 0.7rem;
		border: 1px solid var(--stone);
		border-radius: 4px;
		background: var(--stone);
		color: var(--charcoal);
		font-size: clamp(10px, 0.7vw, 12px);
		line-height: 1.55;
		word-break: break-word;
	}
	.interface-result {
		margin-top: 0.8rem;
		padding-top: 0.7rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		border-top: 1px solid var(--stone);
		color: var(--smoke);
		font:
			0.65rem 'SFMono-Regular',
			Consolas,
			monospace;
	}
	.interface-result :global(svg) {
		padding: 1px;
		border-radius: 50%;
		background: var(--success);
		color: var(--ink);
	}
	.admin-card-preview {
		margin-top: 0.7rem;
		border: 1px solid var(--stone);
		border-radius: 4px;
		background: var(--paper);
	}
	.admin-card-preview > div {
		min-height: 39px;
		padding: 0.45rem;
		display: grid;
		grid-template-columns: 10px minmax(0, 1fr) 5px;
		align-items: center;
		gap: 0.4rem;
		border-bottom: 1px solid var(--stone);
	}
	.admin-card-preview > div:last-child {
		border-bottom: 0;
	}
	.admin-card-preview span {
		min-width: 0;
		display: grid;
		gap: 2px;
	}
	.admin-card-preview strong {
		overflow: hidden;
		font-size: 0.65rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.admin-card-preview small {
		color: var(--smoke);
		font-size: 0.56rem;
	}
	.admin-card-preview i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--success);
	}

	.capabilities {
		--studio-primary: oklch(0.7446 0.1716 50.67);
		--studio-primary-foreground: #fff;
		position: relative;
		padding: 9rem var(--container-gutter);
		background: var(--paper);
	}
	.capabilities::before {
		content: '';
		height: 1px;
		position: absolute;
		top: 0;
		right: var(--container-gutter);
		left: var(--container-gutter);
		background: var(--line);
	}
	.section-heading {
		display: grid;
		grid-template-columns: 2fr 1fr;
		align-items: end;
		gap: 3rem;
	}
	.section-heading h2,
	.developer-intro h2 {
		margin: 0;
		font-family: var(--font-sans);
		font-size: clamp(3rem, 5.6vw, 6.2rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.92;
	}
	.section-heading-support > p {
		max-width: 31rem;
		margin: 0;
		color: var(--smoke);
		line-height: 1.65;
	}
	.benefit-navigation {
		width: fit-content;
		margin: 2.5rem auto 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.25rem;
	}
	.benefit-navigation > span {
		color: var(--smoke);
		font:
			0.75rem 'SFMono-Regular',
			Consolas,
			monospace;
		letter-spacing: 0.12em;
	}
	.benefit-navigation > div {
		display: flex;
	}
	.benefit-navigation button {
		width: 44px;
		height: 40px;
		padding: 0;
		display: grid;
		place-items: center;
		border: 1px solid var(--ink);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition: 160ms ease;
	}
	.benefit-navigation button:first-child {
		border-radius: 999px 0 0 999px;
	}
	.benefit-navigation button:last-child {
		margin-left: -1px;
		border-radius: 0 999px 999px 0;
	}
	.benefit-navigation button:hover {
		z-index: 1;
		border-color: var(--studio-primary);
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
	}
	.benefit-navigation button:focus-visible {
		z-index: 2;
		outline: 2px solid var(--brand-accent);
		outline-offset: 3px;
	}
	.editor-benefit-showcase {
		display: grid;
		grid-template-columns: minmax(310px, 0.72fr) minmax(0, 1.28fr);
		margin-top: 6.5rem;
		overflow: hidden;
		border: 1px solid var(--ink);
		border-radius: var(--radius-card);
		background: color-mix(in srgb, var(--stone) 88%, var(--ink));
	}
	.editor-benefit-list {
		display: grid;
		grid-template-rows: repeat(4, 1fr);
		border-right: 1px solid var(--stone);
		background: var(--paper);
	}
	.editor-benefit-list button {
		min-height: 130px;
		/* The 3px active indicator is reserved here as a transparent border rather
		   than added on .active. Adding it there meant border-style flipped
		   none <-> solid, which is not animatable: on deactivate the 3px vanished
		   in one frame while padding-left eased back over 160ms, so the text
		   jumped left and slid back. Reserving the space makes activating a pure
		   colour change. */
		padding: 1.4rem 1.5rem 1.4rem calc(1.5rem - 3px);
		display: grid;
		grid-template-columns: 38px minmax(0, 1fr);
		align-items: center;
		gap: 0.8rem;
		border: 0;
		border-bottom: 1px solid var(--stone);
		border-left: 3px solid transparent;
		background: transparent;
		color: var(--smoke);
		font: inherit;
		text-align: left;
		cursor: pointer;
		/* Named properties only — `transition: 160ms ease` also animated padding
		   and border-width, which is what made the shift visible. */
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			color 160ms ease;
	}
	.editor-benefit-list button:last-child {
		border-bottom: 0;
	}
	.editor-benefit-list button:hover {
		background: var(--sand);
		color: var(--ink);
	}
	.editor-benefit-list button.active {
		border-left-color: var(--brand-accent);
		background: color-mix(in srgb, var(--tangerine) 18%, var(--paper));
		color: var(--ink);
	}
	.editor-benefit-list .benefit-list-icon {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
		border-radius: 50%;
		background: var(--paper);
		color: var(--smoke);
	}
	.editor-benefit-list button.active .benefit-list-icon {
		border-color: var(--studio-primary);
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
	}
	.editor-benefit-list button > div {
		min-width: 0;
	}
	.editor-benefit-list strong {
		display: block;
		font-size: 1.1rem;
	}
	.editor-benefit-list p {
		margin: 0.45rem 0 0;
		color: var(--smoke);
		font-size: 0.82rem;
		line-height: 1.5;
	}
	.editor-benefit-visual {
		min-height: 520px;
		padding: clamp(2rem, 4vw, 4rem);
		display: flex;
		flex-direction: column;
		justify-content: center;
		background-color: var(--stone);
		background-image:
			linear-gradient(color-mix(in srgb, var(--ink) 4.5%, transparent) 1px, transparent 1px),
			linear-gradient(90deg, color-mix(in srgb, var(--ink) 4.5%, transparent) 1px, transparent 1px);
		background-size: 56px 56px;
	}
	.benefit-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		color: var(--smoke);
		font:
			0.68rem 'SFMono-Regular',
			Consolas,
			monospace;
		letter-spacing: 0.1em;
	}
	.benefit-meta b {
		color: var(--brand-accent);
	}
	.studio-fragment {
		width: min(100%, 620px);
		height: 350px;
		margin: 2rem auto 0;
		position: relative;
		overflow: hidden;
		border: 1px solid color-mix(in srgb, var(--ink) 42%, transparent);
		border-radius: var(--radius-panel);
		background: var(--paper);
		box-shadow: 10px 12px 0 color-mix(in srgb, var(--brand-accent) 38%, transparent);
		font-size: 0.75rem;
		pointer-events: none;
		user-select: none;
	}
	.fragment-header {
		min-height: 64px;
		padding: 0 1.25rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid var(--stone);
	}
	.fragment-header > div {
		display: grid;
		gap: 0.15rem;
	}
	.fragment-header small {
		color: var(--smoke);
		font-size: 0.65rem;
	}
	.fragment-header strong {
		font-size: 0.85rem;
	}
	.fragment-header > span {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--smoke);
		font-size: 0.68rem;
	}
	.fragment-header > span i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--success);
	}
	.fragment-header > span i.unsaved {
		background: var(--warning);
	}
	.model-grid {
		padding: 1rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.65rem;
	}
	.model-grid > div {
		min-width: 0;
		min-height: 72px;
		padding: 0.8rem;
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		align-content: center;
		align-items: center;
		gap: 0.2rem 0.55rem;
		border: 1px solid var(--stone);
		border-radius: 6px;
		background: white;
	}
	.model-grid > div.model-wide {
		grid-column: 1 / -1;
		min-height: 58px;
	}
	.model-grid i {
		grid-row: 1 / 3;
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		border-radius: 5px;
		background: color-mix(in srgb, var(--brand-accent) 14%, var(--paper));
		color: var(--brand-accent);
		font-style: normal;
	}
	.model-grid strong {
		font-size: 0.76rem;
	}
	.model-grid small {
		overflow: hidden;
		color: var(--smoke);
		font-size: 0.62rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.fragment-field {
		display: grid;
		gap: 0.4rem;
		font-weight: 700;
	}
	.fragment-field i,
	.revision-field i {
		min-height: 36px;
		padding: 0 0.7rem;
		display: flex;
		align-items: center;
		border: 1px solid var(--mist);
		border-radius: 5px;
		background: white;
		color: var(--charcoal);
		font-size: 0.7rem;
		font-style: normal;
		font-weight: 400;
	}
	.workflow-fragment {
		background: color-mix(in srgb, var(--stone) 62%, var(--paper));
	}
	.publishing-canvas {
		height: 236px;
		padding: 1rem;
		display: grid;
		grid-template-columns: 0.9fr 1.1fr;
		align-items: center;
		gap: 0.8rem;
	}
	.validation-card {
		padding: 1rem;
		border: 1px solid color-mix(in srgb, var(--danger) 32%, var(--stone));
		border-radius: 7px;
		background: var(--paper);
	}
	.validation-card > strong {
		display: block;
		margin-bottom: 0.75rem;
		color: var(--danger);
		font-size: 0.8rem;
	}
	.validation-card > div {
		padding: 0.55rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		border-top: 1px solid var(--stone);
		font-size: 0.65rem;
	}
	.validation-card > div b {
		color: var(--danger);
		font-size: 0.6rem;
		text-align: right;
	}
	.validation-card small {
		display: block;
		margin-top: 0.65rem;
		color: var(--smoke);
		font-size: 0.6rem;
		line-height: 1.4;
	}
	.schedule-dialog {
		width: min(72%, 390px);
		margin: 1.25rem auto 0;
		padding: 1.15rem;
		border: 1px solid var(--mist);
		border-radius: 8px;
		background: var(--paper);
		box-shadow: 0 16px 35px color-mix(in srgb, var(--ink) 13%, transparent);
	}
	.schedule-dialog > strong {
		font-size: 0.88rem;
	}
	.schedule-dialog p {
		margin: 0.35rem 0 1rem;
		color: var(--smoke);
		font-size: 0.68rem;
	}
	.schedule-dialog > div:last-child {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
	.schedule-dialog button {
		padding: 0.45rem 0.75rem;
		border: 1px solid var(--mist);
		border-radius: 5px;
		background: var(--paper);
		font: inherit;
	}
	.schedule-dialog button:last-child {
		border-color: var(--studio-primary);
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
	}
	.publishing-canvas .schedule-dialog {
		width: auto;
		margin: 0;
		padding: 1rem;
	}
	.publishing-footer {
		height: 50px;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-top: 1px solid var(--stone);
		background: var(--paper);
		color: var(--smoke);
		font-size: 0.66rem;
	}
	.publishing-footer > div {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		color: var(--ink);
	}
	.publishing-footer b {
		padding: 0.45rem 0.65rem;
		border-radius: 5px;
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
	}
	.history-fragment {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
	}
	.revision-preview {
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--stone) 42%, var(--paper));
	}
	.revision-field {
		margin: 2rem 1.25rem;
		display: grid;
		gap: 0.4rem;
		font-weight: 700;
	}
	.revision-footer {
		min-height: 52px;
		margin-top: auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		border-top: 1px solid var(--stone);
		background: var(--paper);
		font-size: 0.65rem;
	}
	.revision-footer b {
		padding: 0.4rem 0.65rem;
		border-radius: 5px;
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
	}
	.history-fragment aside {
		padding: 1rem;
		border-left: 1px solid var(--stone);
		background: var(--paper);
	}
	.history-tabs {
		display: flex;
		gap: 0.8rem;
		margin: 0.8rem 0;
		color: var(--smoke);
		font-size: 0.64rem;
	}
	.history-tabs b {
		color: var(--ink);
	}
	.history-fragment aside button {
		width: 100%;
		padding: 0.65rem;
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.25rem;
		border: 0;
		border-bottom: 1px solid var(--stone);
		background: transparent;
		font: inherit;
		text-align: left;
	}
	.history-fragment aside button.selected {
		border-radius: 5px;
		background: var(--sand);
	}
	.history-fragment aside button b {
		color: var(--brand-accent);
		font-size: 0.6rem;
	}
	.history-fragment aside button small {
		grid-column: 1 / -1;
		color: var(--smoke);
		font-size: 0.6rem;
	}
	.present-fragment {
		display: grid;
		grid-template-columns: 180px minmax(0, 1fr);
	}
	.present-fields {
		padding: 1.15rem;
		display: grid;
		align-content: start;
		gap: 1rem;
		border-right: 1px solid var(--stone);
	}
	.present-preview {
		min-width: 0;
		padding: 0.7rem;
		background: var(--stone);
	}
	/* Mirrors the real presentation-mode toolbar in DocumentEditor.svelte:
	   Edit toggle · refresh · centred monospace URL · icon-only viewport group. */
	.present-toolbar {
		height: 32px;
		padding: 0 0.5rem;
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.4rem;
		border-radius: 5px 5px 0 0;
		background: var(--paper);
		font-size: 0.6rem;
	}
	.present-toolbar b {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-style: normal;
	}
	/* The real control is a sliding switch, not a pencil. */
	.present-toggle {
		position: relative;
		width: 15px;
		height: 9px;
		border-radius: 999px;
		background: var(--brand-accent);
	}
	.present-toggle::after {
		content: '';
		position: absolute;
		top: 1.5px;
		left: 7.5px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #fff;
	}
	.present-refresh {
		display: flex;
		align-items: center;
		color: var(--smoke);
	}
	.present-url {
		overflow: hidden;
		padding: 2px 0.25rem;
		border-radius: 3px;
		background: color-mix(in srgb, var(--ink) 6%, transparent);
		color: var(--smoke);
		font-family: 'SFMono-Regular', Consolas, monospace;
		text-align: center;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.present-viewports {
		display: flex;
		align-items: center;
		gap: 1px;
		padding: 1.5px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--ink) 6%, transparent);
	}
	.vp {
		display: grid;
		place-items: center;
		padding: 2px;
		border-radius: 2px;
		color: var(--smoke);
	}
	.vp.on {
		background: var(--paper);
		color: var(--ink);
		box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 15%, transparent);
	}
	.present-page {
		height: calc(100% - 32px);
		padding: 1.25rem;
		display: grid;
		grid-template-columns: 0.8fr 1.2fr;
		align-items: center;
		gap: 1rem;
		background: var(--paper);
	}
	.present-page small {
		color: var(--brand-accent);
		font-size: 0.58rem;
		font-weight: 800;
		letter-spacing: 0.1em;
	}
	.present-page strong {
		display: block;
		margin-top: 0.5rem;
		font-size: clamp(1.3rem, 2.3vw, 2.2rem);
		letter-spacing: -0.035em;
		line-height: 0.95;
	}
	.present-page figure {
		height: 190px;
		position: relative;
		margin: 0;
		outline: 2px solid var(--brand-accent);
		outline-offset: 2px;
	}
	.present-page img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}
	.present-page figure span {
		position: absolute;
		left: 0;
		top: 0;
		padding: 0.3rem 0.45rem;
		background: var(--studio-primary);
		color: var(--studio-primary-foreground);
		font-size: 0.62rem;
		font-weight: 700;
	}
	.assistant-section {
		display: grid;
		grid-template-columns: minmax(300px, 1fr) minmax(420px, 580px);
		align-items: center;
		gap: clamp(4rem, 7vw, 9rem);
		padding: 10rem var(--container-gutter);
		border-bottom: 1px solid var(--line);
		background: var(--stone);
	}
	.assistant-copy h2 {
		margin: 0 0 2rem;
		font-family: var(--font-sans);
		font-size: clamp(3.4rem, 5.5vw, 6rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.9;
	}
	.assistant-copy > p {
		max-width: 35rem;
		margin: 0;
		color: var(--smoke);
		line-height: 1.7;
	}
	.assistant-copy ul {
		display: grid;
		gap: 0.9rem;
		margin: 2.75rem 0 0;
		padding: 2rem 0 0;
		border-top: 1px solid var(--line);
		list-style: none;
	}
	.assistant-copy li {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 0.9rem;
		font-weight: 600;
		line-height: 1.4;
	}
	.assistant-copy li :global(svg) {
		flex: 0 0 auto;
		padding: 2px;
		border-radius: 50%;
		background: var(--success);
		color: var(--ink);
	}
	.assistant-demo {
		width: 100%;
		max-width: 580px;
		min-width: 0;
		height: 610px;
		justify-self: end;
		overflow: hidden;
		border: 1px solid var(--ink);
		background: var(--paper);
		box-shadow: 15px 17px 0 var(--brand-accent);
		font-size: 10px;
	}
	.developer-section {
		display: grid;
		grid-template-columns: minmax(340px, 520px) minmax(500px, 600px);
		align-items: start;
		justify-content: space-between;
		gap: clamp(4rem, 7vw, 9rem);
		padding: 10rem var(--container-gutter);
		background: var(--paper);
	}
	.developer-intro {
		max-width: 950px;
	}
	.developer-intro > .text-link {
		margin-top: 1.75rem;
	}
	.developer-intro > p {
		max-width: 570px;
		margin: 2rem 0 0;
		color: var(--smoke);
		font-size: 1.05rem;
		line-height: 1.65;
	}
	.developer-proof {
		min-width: 0;
	}
	.purple {
		color: var(--tangerine);
	}
	.blue {
		color: var(--info);
	}
	.green {
		color: var(--success);
	}
	.technology-support {
		width: 100%;
		max-width: 600px;
		justify-self: end;
		display: grid;
		grid-template-columns: 1fr;
		align-items: center;
		gap: clamp(4rem, 8vw, 10rem);
		/* Enough padding that the dotted ground actually reads around the ledger —
		   it's the frame, not a texture hidden behind an opaque card. */
		padding: clamp(0.8rem, 1.2vw, 1.25rem);
		border: 1px solid var(--line);
		background-image: radial-gradient(var(--mist) 0.7px, transparent 0.7px);
		background-size: 7px 7px;
	}
	.technology-ledger {
		border: 1px solid var(--mist);
		background: color-mix(in srgb, var(--paper) 94%, transparent);
		box-shadow:
			12px 14px 0 color-mix(in srgb, var(--ink) 6%, transparent),
			0 18px 45px color-mix(in srgb, var(--ink) 12%, transparent);
		transform: rotate(-1deg);
	}
	.technology-ledger-head,
	.technology-row {
		display: grid;
		align-items: center;
	}
	.technology-ledger-head {
		grid-template-columns: 1fr 1fr;
		padding: 0.85rem 1rem 0.7rem;
		border-bottom: 1px solid var(--stone);
		color: var(--smoke);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.09em;
		text-transform: uppercase;
	}
	.technology-ledger-head b {
		text-align: right;
	}
	.technology-list {
		display: grid;
		grid-template-columns: 1fr;
	}
	.technology-row {
		grid-template-columns: 34px minmax(100px, 1fr) minmax(90px, 0.75fr) 84px;
		padding: 0.8rem 0.9rem;
		border-bottom: 1px solid var(--stone);
		font-size: 0.78rem;
	}
	.technology-row:nth-child(odd) {
		border-right: 1px solid var(--stone);
	}
	.technology-row i {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		color: var(--smoke);
		font-style: normal;
	}
	.technology-row i img {
		width: 21px;
		height: 21px;
		display: block;
		object-fit: contain;
	}
	.technology-row strong {
		font-size: 0.82rem;
	}
	.technology-row > span {
		color: var(--smoke);
		font-size: 0.72rem;
	}
	.technology-row > b {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.35rem;
		color: var(--smoke);
		font-size: 0.68rem;
		font-weight: 500;
	}
	.technology-row > b :global(svg) {
		padding: 2px;
		border-radius: 3px;
		background: var(--success);
		color: var(--ink);
	}

	.extensions {
		padding: 10rem var(--container-gutter);
		border-top: 1px solid var(--line);
		background: var(--stone);
	}
	.extensions-main {
		display: grid;
		grid-template-columns: minmax(360px, 0.92fr) minmax(460px, 1.08fr);
		align-items: center;
		gap: clamp(4rem, 8vw, 8rem);
	}
	.extension-visual {
		min-width: 0;
	}
	.layer-stage {
		height: 520px;
		position: relative;
		isolation: isolate;
	}
	.layer-stage::before {
		content: '';
		width: 64%;
		height: 22%;
		position: absolute;
		left: 18%;
		bottom: 2%;
		border-radius: 50%;
		background: color-mix(in srgb, var(--ink) 6%, transparent);
		filter: blur(15px);
		transform: scaleY(0.42);
	}
	.layer-stage button {
		width: clamp(300px, 27vw, 410px);
		height: clamp(200px, 18vw, 270px);
		padding: 0;
		border: 0;
		position: absolute;
		left: 50%;
		clip-path: polygon(50% 0, 100% 28%, 100% 43%, 50% 71%, 0 43%, 0 28%);
		background: transparent;
		color: var(--ink);
		filter: drop-shadow(0 11px 15px color-mix(in srgb, var(--ink) 7%, transparent));
		transform: translateX(-50%);
		transition:
			filter 180ms ease,
			transform 180ms ease;
		cursor: pointer;
	}
	.layer-stage button::before,
	.layer-stage button::after {
		content: '';
		position: absolute;
		inset: 0;
		transition: background 180ms ease;
	}
	.layer-stage button::before {
		z-index: 1;
		background: color-mix(in srgb, var(--paper) 88%, transparent);
		clip-path: polygon(50% 0, 100% 28%, 50% 56%, 0 28%);
	}
	.layer-stage button::after {
		z-index: 0;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--smoke) 24%, var(--paper)) 0 50%,
			color-mix(in srgb, var(--smoke) 34%, var(--paper)) 50% 100%
		);
		clip-path: polygon(0 28%, 50% 56%, 100% 28%, 100% 43%, 50% 71%, 0 43%);
	}
	.layer-stage button:nth-child(1) {
		top: 4%;
		z-index: 4;
	}
	.layer-stage button:nth-child(2) {
		top: 20%;
		z-index: 3;
	}
	.layer-stage button:nth-child(2)::before {
		background: color-mix(in srgb, var(--sand) 88%, transparent);
	}
	.layer-stage button:nth-child(3) {
		top: 36%;
		z-index: 2;
	}
	.layer-stage button:nth-child(3)::before {
		background: color-mix(in srgb, var(--stone) 90%, transparent);
	}
	.layer-stage button:nth-child(4) {
		top: 52%;
		z-index: 1;
	}
	.layer-stage button.active {
		filter: drop-shadow(0 13px 16px color-mix(in srgb, var(--brand-accent) 16%, transparent));
		transform: translateX(-50%) translateY(-4px);
	}
	.layer-stage button.active::before {
		background: var(--apex-gradient);
	}
	.layer-stage button.active::after {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--brand-accent) 58%, var(--paper)) 0 50%,
			color-mix(in srgb, var(--brand-accent) 70%, var(--paper)) 50% 100%
		);
	}
	.layer-stage button:focus-visible,
	.extension-accordion button:focus-visible {
		outline: 2px solid var(--brand-accent);
		outline-offset: 4px;
	}
	.layer-content {
		z-index: 2;
		width: 100%;
		top: 28%;
		left: 0;
		display: grid;
		place-content: center;
		gap: 0.65rem;
		position: absolute;
		transform: translateY(-50%);
	}
	.layer-index {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.08em;
	}
	.visual-caption {
		max-width: 24rem;
		margin: 0 auto 0.25rem;
		color: var(--smoke);
		font-size: 0.82rem;
		line-height: 1.5;
		text-align: center;
	}
	.extensions-copy {
		min-width: 0;
	}
	.extensions-copy h2 {
		margin: 0;
	}
	.extensions-copy > p {
		max-width: 34rem;
		margin: 1.6rem 0 2.75rem;
		color: var(--smoke);
		line-height: 1.65;
	}
	.extension-accordion {
		border-top: 1px solid var(--ink);
	}
	.accordion-row {
		border-bottom: 1px solid color-mix(in srgb, var(--ink) 28%, transparent);
	}
	.accordion-row > button {
		width: 100%;
		min-height: 72px;
		display: grid;
		grid-template-columns: 30px 1fr 34px;
		align-items: center;
		gap: 0.75rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.accordion-row > button > span {
		color: var(--smoke);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.08em;
	}
	.accordion-row > button strong {
		font-size: clamp(1rem, 1.5vw, 1.25rem);
		letter-spacing: -0.015em;
	}
	.accordion-row > button i {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border: 1px solid color-mix(in srgb, var(--ink) 35%, transparent);
		border-radius: 50%;
		font-style: normal;
	}
	.accordion-row.active > button i {
		border-color: var(--brand-accent);
		background: var(--brand-accent);
	}
	.accordion-panel {
		padding: 0 2.75rem 1.5rem;
	}
	.accordion-panel p {
		max-width: 36rem;
		margin: 0;
		color: var(--smoke);
		font-size: 0.92rem;
		line-height: 1.6;
	}
	.part-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding-top: 1rem;
	}
	.part-list span {
		padding: 0.38rem 0.55rem;
		border: 1px solid color-mix(in srgb, var(--ink) 22%, transparent);
		border-radius: 999px;
		background: color-mix(in srgb, var(--paper) 55%, transparent);
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.025em;
		text-transform: uppercase;
	}
	.manifest-strip {
		min-width: 0;
		height: 58px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 1.5rem;
		margin-top: 4rem;
		padding: 0 1.25rem;
		border-radius: var(--radius-panel);
		background: var(--ink);
		color: var(--stone);
		font:
			12px 'SFMono-Regular',
			Consolas,
			monospace;
		overflow: hidden;
	}
	.manifest-file {
		padding-right: 1.5rem;
		border-right: 1px solid color-mix(in srgb, var(--paper) 18%, transparent);
		color: var(--paper);
	}
	.manifest-strip code {
		min-width: 0;
		padding: 1rem 0;
		overflow-x: auto;
		white-space: nowrap;
	}
	.manifest-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--success);
		white-space: nowrap;
	}
	.manifest-status i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--success);
	}
	.extension-footer {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 3rem;
		padding-top: 2rem;
	}
	.extension-footer p {
		max-width: 52rem;
		margin: 0;
		color: var(--smoke);
		font-size: 0.9rem;
		line-height: 1.55;
	}
	.extension-footer p strong {
		color: var(--ink);
	}
	.extension-footer a {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--ink);
		color: inherit;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 700;
	}

	.sponsor-section {
		padding: 8rem var(--container-gutter);
		border-top: 1px solid var(--line);
		background: var(--paper);
	}
	.sponsor-heading {
		display: grid;
		grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr);
		align-items: end;
		gap: clamp(3rem, 8vw, 8rem);
	}
	.sponsor-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		margin-bottom: 1.5rem;
		color: var(--brand-accent);
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.sponsor-eyebrow::before {
		content: '';
		width: 28px;
		height: 2px;
		background: currentColor;
	}
	.sponsor-heading h2 {
		max-width: 750px;
		margin: 0;
		font-size: clamp(3.2rem, 5vw, 5.8rem);
		line-height: 0.92;
	}
	.sponsor-intro p {
		margin: 0 0 1.5rem;
		color: var(--smoke);
		line-height: 1.65;
	}
	.sponsor-intro a {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--ink);
		color: var(--ink);
		font-size: 0.875rem;
		font-weight: 700;
		text-decoration: none;
	}
	.sponsor-showcase {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		margin-top: 4.5rem;
		border-top: 1px solid var(--ink);
		border-left: 1px solid var(--ink);
	}
	.sponsor-card {
		min-height: 220px;
		display: grid;
		grid-template-columns: 112px 1fr auto;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		border-right: 1px solid var(--ink);
		border-bottom: 1px solid var(--ink);
		background: var(--sand);
		color: var(--ink);
		text-decoration: none;
		transition:
			background 180ms ease,
			transform 180ms ease;
	}
	.sponsor-card:hover {
		background: color-mix(in srgb, var(--brand-accent) 12%, var(--paper));
	}
	.sponsor-card img {
		width: 112px;
		height: 112px;
		border: 1px solid var(--line);
		border-radius: 50%;
		background: white;
		object-fit: cover;
	}
	.sponsor-card > span {
		display: grid;
		gap: 0.4rem;
	}
	.sponsor-card small {
		color: var(--brand-accent);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.sponsor-card strong {
		font-size: clamp(1.45rem, 2.4vw, 2.25rem);
		letter-spacing: -0.025em;
	}
	.sponsor-card i {
		color: var(--smoke);
		font-size: 0.8rem;
		font-style: normal;
	}

	.open-source {
		min-height: 640px;
		display: grid;
		grid-template-columns: 0.75fr 1.25fr 0.65fr;
		align-items: center;
		gap: 5vw;
		padding: 7rem 5vw;
		background: var(--ink);
		color: var(--paper);
	}
	.source-mark {
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: 1px solid var(--smoke);
		border-radius: 50%;
		position: relative;
	}
	.source-mark::before,
	.source-mark::after {
		content: '';
		position: absolute;
		border: 1px solid var(--charcoal);
		border-radius: 50%;
	}
	.source-mark::before {
		inset: 13%;
	}
	.source-mark::after {
		inset: 27%;
	}
	:global(.source-logo) {
		width: 36%;
		height: 36%;
		color: var(--brand-accent);
		position: relative;
		z-index: 2;
	}
	.source-copy h2 {
		margin: 0 0 2rem;
		font-family: var(--font-sans);
		font-size: clamp(3rem, 5.3vw, 6rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.9;
	}
	.source-copy p {
		max-width: 550px;
		margin: 0 0 2.2rem;
		color: var(--mist);
		line-height: 1.65;
	}
	.source-stats {
		border-top: 1px solid var(--smoke);
	}
	.source-stats div {
		display: grid;
		gap: 0.4rem;
		padding: 1.5rem 0;
		border-bottom: 1px solid var(--smoke);
	}
	.source-stats strong {
		font-family: var(--font-sans);
		font-size: 2rem;
		font-weight: 700;
	}
	.source-stats span {
		color: var(--mist);
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	footer {
		padding: 4rem var(--container-gutter) 1.5rem;
		/* Same ink as `.open-source` above it, so the two read as one block with no
		   seam. Every colour below is inverted to match — a dark background with the
		   old light-background text values is unreadable, not just off. */
		background: var(--ink);
		color: var(--paper);
	}
	.footer-main {
		display: grid;
		grid-template-columns: 1fr 1fr 1.2fr;
		min-height: 230px;
	}
	:global(.footer-logo) {
		width: 30px;
		height: 30px;
	}
	.footer-main > p {
		margin: 0;
		color: color-mix(in srgb, var(--paper) 62%, transparent);
		line-height: 1.55;
	}
	.footer-links {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.footer-links div {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.footer-links strong {
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.footer-links a {
		color: color-mix(in srgb, var(--paper) 62%, transparent);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.18s ease;
	}
	.footer-links a:hover {
		color: var(--paper);
	}
	.footer-bottom {
		min-height: 55px;
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		align-items: end;
		/* `--line` is a dark rule meant for the paper sections; it disappears here. */
		border-top: 1px solid color-mix(in srgb, var(--paper) 16%, transparent);
		color: color-mix(in srgb, var(--paper) 50%, transparent);
		font-size: 0.75rem;
	}
	.footer-bottom span:nth-child(2) {
		text-align: center;
	}
	.footer-bottom a {
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 5px;
		color: inherit;
		text-decoration: none;
	}
	:global(.up-arrow) {
		transform: rotate(180deg);
	}
	.landing .section-title {
		margin-top: 0;
		font-family: var(--font-sans);
		font-size: clamp(2.75rem, 4.5vw, 5rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 0.94;
	}
	.landing .section-subtitle {
		max-width: 38rem;
		color: var(--smoke);
		font-size: clamp(1.08rem, 1.3vw, 1.25rem);
		font-weight: 400;
		line-height: 1.6;
	}

	@media (max-width: 1050px) {
		.site-header {
			grid-template-columns: 1fr auto;
		}
		.site-header nav {
			display: none;
		}
		.hero {
			grid-template-columns: 1fr;
		}
		.hero-copy {
			padding-bottom: 10rem;
		}
		.hero-art {
			min-height: 650px;
		}
		.editor-window {
			top: 80px;
		}
		.hero-database-note {
			top: 27px;
		}
		.technology-support {
			grid-template-columns: 1fr;
			gap: 3rem;
		}
		.developer-section {
			grid-template-columns: 1fr;
			gap: 4.5rem;
		}
		.assistant-section {
			grid-template-columns: 1fr;
			gap: 5rem;
		}
		.assistant-copy {
			max-width: 720px;
		}
		.assistant-demo {
			justify-self: start;
		}
		.interface-flow {
			grid-template-columns: minmax(300px, 0.85fr) 50px minmax(0, 1.15fr);
		}
		.interface-cards {
			height: auto;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 0.75rem;
		}
		.interface-cards article {
			width: auto;
			position: relative;
			inset: auto !important;
			margin: 0;
			background: var(--paper);
			transform: none !important;
		}
		.extensions-main {
			grid-template-columns: 1fr;
			gap: 4rem;
		}
		.extension-visual {
			width: min(100%, 660px);
			justify-self: center;
		}
		.open-source {
			grid-template-columns: 0.65fr 1.35fr;
		}
		.sponsor-section {
			padding-top: 7rem;
			padding-bottom: 7rem;
		}
		.source-stats {
			grid-column: 1 / -1;
			display: grid;
			grid-template-columns: repeat(3, 1fr);
		}
		.source-stats div {
			padding-right: 2rem;
		}
	}

	@media (max-width: 720px) {
		.site-header {
			height: 66px;
			padding: 0 1.2rem;
		}
		.header-actions .text-link {
			display: none;
		}
		.hero {
			min-height: auto;
		}
		.hero-copy {
			padding: 8rem 1.2rem 9rem;
		}
		.hero h1 {
			font-size: clamp(3.4rem, 15vw, 5rem);
		}
		.hero-lede {
			margin-top: 2rem;
		}
		.hero-actions {
			display: grid;
		}
		.hero-art {
			min-height: 490px;
		}
		.editor-window {
			width: calc(100% - 2.4rem);
			height: 410px;
			left: 1.2rem;
			top: 50px;
			transform: rotate(-1.2deg);
		}
		.hero-logo-display {
			width: 90px;
			height: 90px;
			right: 1.2rem;
			top: 1.2rem;
		}
		.hero-database-note {
			right: 1rem;
			left: auto;
			top: 7px;
		}
		.hero-database-note::after {
			height: 12px;
		}
		:global(.hero-display-logo) {
			width: 78px;
			height: 78px;
		}
		.editor-body {
			grid-template-columns: 1fr;
		}
		.document-list,
		.record-list {
			display: none;
		}
		.document-editor {
			padding: 0;
		}
		.interface-section,
		.capabilities,
		.assistant-section,
		.developer-section,
		.extensions,
		.sponsor-section {
			padding: 5rem 1.2rem;
		}
		.interface-heading {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.interface-heading h2 {
			font-size: clamp(3.2rem, 15vw, 5.2rem);
		}
		.interface-flow {
			grid-template-columns: 1fr;
			gap: 2.5rem;
			margin-top: 3.5rem;
		}
		.flow-arrow {
			height: 50px;
			justify-content: center;
			padding: 0;
			transform: rotate(90deg);
		}
		.flow-arrow span {
			width: 45px;
		}
		.interface-cards {
			grid-template-columns: 1fr;
			gap: 0.65rem;
		}
		.interface-cards article {
			min-height: 0;
			margin: 0;
			transform: none !important;
		}
		.flow-card-top {
			min-height: 50px;
			padding: 0 1rem;
			font-size: 0.72rem;
		}
		.schema-card pre {
			padding: 1.25rem 1rem;
			font-size: 0.78rem;
			line-height: 1.75;
		}
		.interface-card-header {
			min-height: 76px;
			padding: 0 1.25rem;
		}
		.interface-card-header > span {
			font-size: 0.72rem;
		}
		.interface-card-brand h3 {
			font-size: 1.25rem;
		}
		.interface-card-body {
			padding: 1.4rem 1.25rem 1.6rem;
		}
		.interface-card-body > b {
			font-size: 0.72rem;
		}
		.interface-card-body > p {
			min-height: 0;
			font-size: 1rem;
			line-height: 1.55;
		}
		.interface-card-body > code {
			min-height: 0;
			padding: 0.9rem;
			font-size: 0.78rem;
		}
		.interface-result {
			font-size: 0.72rem;
		}
		.admin-card-preview strong {
			font-size: 0.78rem;
		}
		.admin-card-preview small {
			font-size: 0.68rem;
		}
		.section-heading {
			grid-template-columns: 1fr;
			align-items: start;
		}
		.section-heading h2,
		.developer-intro h2 {
			font-size: clamp(3rem, 14vw, 5rem);
		}
		.editor-benefit-showcase {
			grid-template-columns: 1fr;
			margin-top: 3rem;
		}
		.editor-benefit-list {
			border-right: 0;
			border-bottom: 1px solid var(--stone);
		}
		.editor-benefit-list button {
			min-height: 105px;
			/* Same reserved 3px as the desktop rule — see the comment there. */
			padding: 1rem 1rem 1rem calc(1rem - 3px);
		}
		.editor-benefit-visual {
			display: none;
		}
		.assistant-section {
			gap: 3.5rem;
		}
		.assistant-demo {
			height: 520px;
			box-shadow: 9px 10px 0 var(--brand-accent);
		}
		.technology-support {
			margin-top: 4rem;
			padding: 0.8rem;
		}
		.technology-list {
			grid-template-columns: 1fr;
		}
		.technology-row:nth-child(odd) {
			border-right: 0;
		}
		.technology-ledger {
			transform: none;
		}
		.extensions-main {
			gap: 3rem;
		}
		.extension-visual {
			width: 100%;
		}
		.layer-stage {
			height: 470px;
		}
		.layer-stage button {
			width: min(90vw, 360px);
			height: min(60vw, 240px);
		}
		.extensions-copy > p {
			margin-bottom: 2rem;
		}
		.accordion-row > button {
			grid-template-columns: 24px 1fr 32px;
		}
		.accordion-panel {
			padding-left: 2.25rem;
			padding-right: 0;
		}
		.manifest-strip {
			grid-template-columns: auto minmax(160px, 1fr) auto;
			gap: 1rem;
			margin-top: 2.5rem;
			padding: 0 1rem;
			overflow-x: auto;
		}
		.manifest-file {
			padding-right: 1rem;
		}
		.extension-footer {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
		.extension-footer a {
			width: fit-content;
		}
		.sponsor-section {
			padding-top: 5rem;
			padding-bottom: 5rem;
		}
		.sponsor-heading {
			grid-template-columns: 1fr;
			gap: 2rem;
		}
		.sponsor-showcase {
			margin-top: 3rem;
		}
		.sponsor-card {
			min-height: 180px;
			grid-template-columns: 76px 1fr auto;
			gap: 1rem;
			padding: 1.25rem;
		}
		.sponsor-card img {
			width: 76px;
			height: 76px;
		}
		.open-source {
			grid-template-columns: 1fr;
			padding: 5rem 1.2rem;
		}
		.source-mark {
			width: 220px;
		}
		.source-stats {
			grid-column: auto;
			grid-template-columns: 1fr;
		}
		footer {
			padding: 3.5rem 1.2rem 1.2rem;
		}
		.footer-main {
			grid-template-columns: 1fr 1fr;
			gap: 2.5rem;
		}
		.footer-main > p {
			display: none;
		}
		.footer-links {
			grid-column: 1 / -1;
		}
		.footer-bottom {
			grid-template-columns: 1fr 1fr;
			padding-top: 1rem;
		}
		.footer-bottom span:nth-child(2) {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			scroll-behavior: auto;
		}
		.button {
			transition: none;
		}
		.interface-cards article {
			transition: none;
		}
	}
</style>
