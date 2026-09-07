/**
 * First-run seed for the website template.
 *
 * `seedOnFirstRun(locals)` is wired into `hooks.server.ts`. It runs once per
 * process, and only when the site is completely untouched: the first
 * organization exists and holds no page, post or category. That makes it safe to
 * leave enabled — it can populate exactly one moment in a site's life, right
 * after the first signup, and can never stomp anything a person made. There's
 * also a manual re-run at `POST /api/seed` (see that route).
 *
 * ## What it creates, and why it isn't about the CMS
 *
 * A demo site whose every article explains the CMS tells you nothing about
 * whether the CMS is any good — the content ends up doing the arguing. So the
 * articles here belong to a straight-faced Digital World field agency, not documentation:
 * four categories, three pieces with real photographs, a marketing home page, an
 * about page, and a contact page with a working form. Payload's website template
 * makes the same call for the same reason. You're evaluating a template, so it
 * has to look like a site.
 *
 * Every block type is exercised at least once between the two pages, so opening
 * the site is also how you check the renderers work.
 *
 * Kill switch without deleting anything: `APHEX_SEED=false`.
 */
import { env } from '$env/dynamic/private';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { LocalAPIContext, SingletonCollection } from '@aphexcms/cms-core/server';
import { photo, mark, heroArt, wordmark, type SeedFile } from './images';
import {
	resetKeys,
	p,
	h2,
	h3,
	quote,
	bullet,
	link,
	span,
	image,
	ref,
	internalLink,
	externalLink
} from './content';

type AphexServices = App.Locals['aphexCMS'];

/** Content whose presence proves the site has moved beyond its automatic empty singletons. */
export const SEEDED_TYPES = ['page', 'post', 'category'] as const;

/**
 * Create the example site.
 *
 * Order matters and isn't arbitrary: categories exist before the posts that
 * reference them, posts before the pages that link to them, and pages before the
 * header and footer that point at those pages. A reference can only be written
 * once its target has an id.
 */
export async function seedContent(
	aphex: Pick<AphexServices, 'localAPI' | 'assetService'>,
	context: LocalAPIContext
): Promise<{ pages: number; posts: number; categories: number; forms: number }> {
	resetKeys();
	const { collections } = aphex.localAPI;
	const localAPI = aphex.localAPI;

	const upload = async (file: SeedFile | null, alt: string): Promise<string | null> => {
		if (!file) return null;
		try {
			const asset = await aphex.assetService.uploadAsset(context.organizationId, {
				buffer: file.buffer,
				originalFilename: file.originalFilename,
				mimeType: file.mimeType,
				size: file.buffer.length,
				alt
			});
			return asset.id;
		} catch (error) {
			// A failed upload shouldn't abort the seed. Every image field below is
			// optional or guarded, so the site still comes up — just plainer.
			console.warn(`[seed] Could not upload ${file.originalFilename}:`, error);
			return null;
		}
	};

	// Fetched and uploaded together: these are the seed's only network calls, and
	// none of them depends on another.
	const [faviconId, logoId, heroId, post1Id, post2Id, post3Id, aboutId] = await Promise.all([
		mark().then((file) => upload(file, 'Aphex Field Office')),
		wordmark().then((file) => upload(file, 'Aphex Field Office')),
		heroArt().then((file) =>
			upload(file, 'A distortion event opening above the boundary of the Digital World')
		),
		photo('partner-operations', 1600, 900).then((file) =>
			upload(file, 'The partner operations room before first deployment')
		),
		photo('evolution-strategy', 1600, 900).then((file) =>
			upload(file, 'Field notes and a Digivice prepared for an evolution review')
		),
		photo('numemon-incident', 1600, 900).then((file) =>
			upload(file, 'The Shibuya incident perimeter seen from the response unit')
		),
		photo('field-office', 1600, 900).then((file) =>
			upload(file, 'The Aphex partner intake room between deployments')
		)
	]);

	// --- categories -----------------------------------------------------------

	const categories: Record<string, string> = {};
	for (const [title, slug] of [
		['Field Reports', 'field-reports'],
		['Partner Operations', 'partner-operations'],
		['Evolution Strategy', 'evolution-strategy'],
		['Digital Culture', 'digital-culture']
	]) {
		const { document } = await collections.category.create(
			context,
			{ title, slug },
			{ publish: true }
		);
		categories[slug] = document.id;
	}

	// --- posts ----------------------------------------------------------------

	const { document: postHorizons } = await collections.post.create(
		context,
		{
			title: 'Your partner reached Champion. Now what?',
			slug: 'your-partner-reached-champion',
			excerpt:
				'Evolution is not a promotion. It is a temporary operational state with a large appetite and very little respect for load-bearing walls.',
			heroImage: image(post1Id, 'The partner operations room before first deployment'),
			categories: [ref(categories['partner-operations']), ref(categories['digital-culture'])],
			content: [
				p(
					'The first Champion evolution is usually remembered as a burst of light, a heroic silhouette, and the moment everything finally made sense. Our incident forms describe the same event as “unexpected structural damage, source unclear.” Both accounts are accurate.'
				),
				h2('Stabilize before you celebrate'),
				p(
					'A newly evolved partner is stronger, louder, and often convinced that every nearby object is part of the mission. Give them space. Confirm their name and disposition. Move civilians behind something that is not flammable. Only then may anyone take the commemorative photo.'
				),
				p(
					'Most partners return to Rookie once the immediate threat passes. This is expected. It is not a failed evolution, a confidence problem, or grounds for a motivational montage.'
				),
				{
					_type: 'banner',
					_key: 'seed-post1-banner',
					style: 'info',
					content:
						'Field note: if the Digivice begins displaying symbols nobody recognizes, do not restart it. Photograph the screen and call the office. We collect those.'
				},
				h2('The first twenty minutes'),
				p(
					'Champion-level incidents become manageable when the human partner has a short checklist and the Digimon partner has a snack. The order matters less than you think.'
				),
				bullet([
					span('Establish a perimeter.', ['strong']),
					span(' “Behind Agumon” is not a perimeter.')
				]),
				bullet([
					span('Log the trigger.', ['strong']),
					span(' Courage is useful data, but “we believed really hard” is not a timestamp.')
				]),
				bullet([
					span('Pack for devolution.', ['strong']),
					span(' Rookie partners get hungry before the debrief and during the debrief.')
				]),
				quote(
					'The bond is the strategy. The giant dinosaur is how the strategy expresses urgency.'
				),
				p(
					'If this sounds procedural, good. Wonder is easier to preserve when somebody else has already reserved the recovery vehicle.'
				)
			],
			seo: {
				metaTitle: 'Your partner reached Champion: an operational guide',
				metaDescription:
					'What human and Digimon partners should do immediately after a first Champion evolution.'
			}
		},
		{ publish: true }
	);

	const { document: postCraft } = await collections.post.create(
		context,
		{
			title: 'Evolution strategy without the prophecy deck',
			slug: 'evolution-strategy-without-the-prophecy-deck',
			excerpt:
				'You cannot roadmap a Mega evolution, but you can stop treating every emotional breakthrough as an infrastructure plan.',
			heroImage: image(post2Id, 'Field notes and a Digivice prepared for an evolution review'),
			categories: [ref(categories['evolution-strategy'])],
			relatedPosts: [ref(postHorizons.id)],
			content: [
				p(
					'Every organization eventually asks the same question: can we guarantee Ultimate by the third quarter? The short answer is no. The billable answer is still no, followed by a useful workshop.'
				),
				h2('A bond is not a delivery schedule'),
				p(
					'Digivolution responds to trust, pressure, environment, and factors researchers continue to label “other.” It does not respond to a calendar invitation titled Final_Final_Evolution_Readiness.'
				),
				p(
					'The practical work is less cinematic: train communication under stress, learn the partner’s actual limits, and agree on retreat conditions before a Shellmon is standing on the transport.'
				),
				h3('Three questions before deployment'),
				bullet('Does the partner understand the objective, or only that everyone started running?'),
				bullet('What happens if evolution stops one level earlier than expected?'),
				bullet('Who has food, first aid, and the return-gate coordinates?'),
				h2('Leave room for the impossible'),
				p(
					'Preparation does not make the bond mechanical. It makes sure the miraculous part is not immediately followed by an avoidable administrative emergency.'
				),
				link(
					'For species-specific handling notes, consult the ',
					'Digimon reference archive',
					'https://digimon.net/reference_en/',
					' before accepting advice from a forum signature.'
				)
			],
			seo: {
				metaTitle: 'Practical Digivolution strategy for partner teams',
				metaDescription:
					'Plan safer partner deployments without pretending Digivolution follows a quarterly roadmap.'
			}
		},
		{ publish: true }
	);

	const { document: postFridays } = await collections.post.create(
		context,
		{
			title: 'Incident 024: the vending machine was a Numemon',
			slug: 'incident-024-vending-machine-numemon',
			excerpt:
				'A routine appliance haunting became a sanitation event, a traffic closure, and a useful reminder to verify the species before offering coins.',
			heroImage: image(post3Id, 'The Shibuya incident perimeter seen from the response unit'),
			categories: [ref(categories['field-reports'])],
			content: [
				p(
					'At 06:42, the office received twelve reports of a vending machine returning coins, insulting customers, and emitting what witnesses described as “a damp modem noise.” Initial classification was Hagurumon. Initial classification was optimistic.'
				),
				h2('Timeline'),
				p(
					'The assigned partner team isolated the unit, disconnected municipal power, and attempted verbal contact. At 06:51 the machine stood up. At 06:52 the team amended the ticket from “device anomaly” to “Numemon, irritated.”'
				),
				{
					_type: 'code',
					_key: 'seed-post3-code',
					language: 'bash',
					code: `06:42  SIGNAL       unknown / vending sector B
06:47  CLASSIFY     probable Hagurumon
06:51  MOVEMENT     vending unit now ambulatory
06:52  RECLASSIFY   Numemon
06:53  NOTE         stop inserting coins`
				},
				h2('Resolution'),
				p(
					'The Numemon had occupied the machine after following a corrupted payment packet through a minor gate. It accepted six melon breads, a route back to the Digital World, and a written assurance that nobody would describe it as an appliance in the final report.'
				),
				quote(
					'When an object starts arguing about classification, classify the argument first and the object second.'
				)
			],
			seo: {
				metaTitle: 'Incident 024: Numemon vending-machine event',
				metaDescription:
					'Field report from the containment and peaceful return of a Numemon occupying a vending machine.'
			}
		},
		{ publish: true }
	);

	// --- pages ----------------------------------------------------------------

	const { document: aboutPage } = await collections.page.create(
		context,
		{
			title: 'Agency',
			slug: 'about',
			hero: {
				variant: 'mediumImpact',
				richText: [
					{ ...h2('The agency between worlds.'), style: 'h1' },
					p(
						'Aphex coordinates human–Digimon partnerships, field response, and the paperwork nobody remembers during the evolution sequence.'
					)
				],
				media: image(aboutId, 'The Aphex partner intake room between deployments')
			},
			layout: [
				{
					_type: 'content',
					_key: 'seed-about-content',
					columns: [
						{
							_type: 'column',
							_key: 'seed-about-col-1',
							size: 'half',
							richText: [
								h3('What we handle'),
								p(
									'Partner matching, evolution readiness, gate recovery, field logistics, and quiet containment when a “smart appliance issue” develops opinions.'
								)
							]
						},
						{
							_type: 'column',
							_key: 'seed-about-col-2',
							size: 'half',
							richText: [
								h3('How we work'),
								p(
									'Every case gets a human lead, a species-aware plan, and an exit route. We do not guarantee Mega. Anyone who does is selling a crest-shaped PowerPoint.'
								)
							]
						}
					]
				},
				{
					_type: 'cta',
					_key: 'seed-about-cta',
					richText: [
						h2('Something crossed over?'),
						p('Tell us what happened, what it called itself, and whether it is currently on fire.')
					],
					links: [externalLink('Contact field operations', '/contact', 'default')]
				}
			],
			seo: {
				metaTitle: 'About Aphex Field Office',
				metaDescription:
					'Partner operations, Digivolution strategy, and Digital World incident response.'
			}
		},
		{ publish: true }
	);

	await collections.page.create(
		context,
		{
			title: 'Home',
			slug: 'home',
			hero: {
				variant: 'highImpact',
				richText: [
					{ ...h2('Your Digital World problem has a partner.'), style: 'h1' },
					p(
						'Partner placement, evolution strategy, and field response for organizations operating on either side of the gate.'
					)
				],
				links: [
					internalLink('Read the field guide', postHorizons.id, 'default'),
					internalLink('Meet the agency', aboutPage.id, 'outline')
				],
				media: image(heroId, '')
			},
			layout: [
				{
					_type: 'content',
					_key: 'seed-home-content',
					columns: [
						{
							_type: 'column',
							_key: 'seed-home-col-1',
							size: 'oneThird',
							richText: [
								h3('Partner operations'),
								p(
									'Matching humans and Digimon without relying on destiny, vibes, or matching goggles.'
								)
							],
							enableLink: true,
							linkType: 'custom',
							label: 'Partner field notes',
							url: '/posts?category=partner-operations'
						},
						{
							_type: 'column',
							_key: 'seed-home-col-2',
							size: 'oneThird',
							richText: [
								h3('Evolution strategy'),
								p(
									'Readiness plans for teams who know courage matters and procurement still wants a date.'
								)
							],
							enableLink: true,
							linkType: 'custom',
							label: 'Plan the next level',
							url: '/posts?category=evolution-strategy'
						},
						{
							_type: 'column',
							_key: 'seed-home-col-3',
							size: 'oneThird',
							richText: [
								h3('Incident response'),
								p(
									'Gate anomalies, rogue signals, and the occasional municipal object with a second form.'
								)
							],
							enableLink: true,
							linkType: 'custom',
							label: 'Read field reports',
							url: '/posts?category=field-reports'
						}
					]
				},
				{
					_type: 'archive',
					_key: 'seed-home-archive',
					introContent: [h2('Latest from the field')],
					populateBy: 'collection',
					limit: 3
				},
				{
					_type: 'cta',
					_key: 'seed-home-cta',
					richText: [
						h2('Not sure if it is a Digimon?'),
						p(
							'Send a description before touching it. If it has already introduced itself, use the name it gave you.'
						)
					],
					links: [externalLink('Open a case', '/contact', 'default')]
				}
			],
			seo: {
				metaTitle: 'Aphex Field Office — Digital World partner agency',
				metaDescription:
					'Partner placement, Digivolution strategy, and incident response across the human and Digital Worlds.'
			}
		},
		{ publish: true }
	);

	// --- form -----------------------------------------------------------------
	//
	// Contributed by `@aphexcms/plugin-forms`, so it isn't in the generated
	// `collections` map and is reached by name. Guarded rather than assumed: the
	// seed has to keep working for anyone who removes the plugin.
	//
	// Published deliberately. The submit endpoint only accepts published forms —
	// a draft form is one an editor hasn't finished — so a draft-only seed would
	// render a contact page whose every submission is rejected.
	const formsCollection = localAPI.getCollection<{ id: string }>('form');
	let contactFormId: string | null = null;

	if (formsCollection) {
		const { document: contactForm } = await formsCollection.create(
			context,
			{
				title: 'Open a case',
				submitButtonLabel: 'Submit field report',
				fields: [
					{
						_type: 'formText',
						_key: 'seed-form-name',
						name: 'name',
						label: 'Human contact',
						required: true,
						width: 'half'
					},
					{
						_type: 'formEmail',
						_key: 'seed-form-email',
						name: 'email',
						label: 'Return-channel email',
						required: true,
						width: 'half'
					},
					{
						_type: 'formSelect',
						_key: 'seed-form-subject',
						name: 'subject',
						label: 'Case classification',
						required: true,
						width: 'full',
						options: [
							{
								_type: 'option',
								_key: 'o-1',
								label: 'Partner placement',
								value: 'partner'
							},
							{
								_type: 'option',
								_key: 'o-2',
								label: 'Evolution planning',
								value: 'evolution'
							},
							{
								_type: 'option',
								_key: 'o-3',
								label: 'Active gate or Digimon incident',
								value: 'incident'
							},
							{
								_type: 'option',
								_key: 'o-4',
								label: 'Probably not a Digimon',
								value: 'probably-not'
							}
						]
					},
					{
						_type: 'formTextarea',
						_key: 'seed-form-message',
						name: 'message',
						label: 'What happened?',
						placeholder:
							'Include location, time, species if known, and current level of property damage.',
						required: true,
						width: 'full',
						rows: 5
					},
					{
						_type: 'formCheckbox',
						_key: 'seed-form-consent',
						name: 'consent',
						label: 'Aphex may contact me before opening a gate at this location.',
						required: true,
						width: 'full'
					}
				],
				confirmationType: 'message',
				confirmationMessage: [
					{ ...h2('Case received.'), style: 'h3' },
					p(
						'Field operations will review the signal. If the situation evolves before we reply, move to a safe distance and do not delete the evidence.'
					)
				],
				// No `to` address that could actually receive mail: a seeded form that
				// silently emails a real inbox is a nasty surprise. `{{allFields}}` and
				// `{{name}}` show the templating so it's obvious what to edit.
				emails: [
					{
						_type: 'notification',
						_key: 'seed-form-email-1',
						to: 'dispatch@example.com',
						subject: 'New {{subject}} case from {{name}}',
						message: 'A new field report entered the queue:\n\n{{allFields}}'
					}
				]
			},
			{ publish: true }
		);
		contactFormId = contactForm.id;
	}

	const { document: contactPage } = await collections.page.create(
		context,
		{
			title: 'Contact',
			slug: 'contact',
			hero: {
				variant: 'lowImpact',
				align: 'center',
				richText: [
					{ ...h2('Open a case'), style: 'h1' },
					p('Routine inquiry, partner request, or something in the alley making dial-up noises.')
				]
			},
			layout: contactFormId
				? [
						{
							_type: 'formBlock',
							_key: 'seed-contact-form',
							form: ref(contactFormId),
							introContent: [
								p(
									'For active incidents, include the last known location and whether the subject has evolved. “Large” is useful. “Like, really large” is also accepted.'
								)
							]
						}
					]
				: []
		},
		{ publish: true }
	);

	// --- singletons -----------------------------------------------------------
	//
	// `get()` lazy-creates the singleton's deterministic row, then `update()`
	// fills it. Publishing matters: the public layout reads the published
	// perspective, so a draft-only header renders as no navigation at all.

	await publishSingleton(collections.siteSettings, context, {
		title: 'Aphex Field Office',
		description: 'Partner operations, evolution strategy, and incident response between worlds.',
		// Always set explicitly, never omitted: `update` MERGES into the stored
		// document (`{ ...existing, ...data }`), so leaving the key out preserves
		// whatever was already there — which is how a re-seed kept resurrecting a
		// logo that had been removed.
		logo: image(logoId, 'Aphex Field Office'),
		favicon: image(faviconId, 'Aphex Field Office'),
		logoHeight: 26
	});

	await publishSingleton(collections.header, context, {
		navItems: [
			externalLink('Field reports', '/posts'),
			externalLink('Partner ops', '/posts?category=partner-operations'),
			internalLink('Agency', aboutPage.id),
			internalLink('Contact', contactPage.id)
		]
	});

	await publishSingleton(collections.footer, context, {
		navItems: [
			externalLink('Field reports', '/posts'),
			internalLink('Agency', aboutPage.id),
			internalLink('Contact', contactPage.id),
			externalLink('Species search', '/search')
		],
		note: 'Independent inter-world operator. No prophecy required. Goggles optional.'
	});

	// Reachable through the archive and /posts; named here only so each `create`
	// above reads as deliberate rather than fire-and-forget.
	void postCraft;
	void postFridays;

	return {
		pages: 3,
		posts: 3,
		categories: Object.keys(categories).length,
		forms: contactFormId ? 1 : 0
	};
}

/**
 * Fill a singleton and publish it in one step.
 *
 * Generic over the document type so each call is checked against that
 * singleton's own fields — a typo in `navItems` is a compile error, not a
 * silently ignored key.
 */
async function publishSingleton<T>(
	collection: SingletonCollection<T>,
	context: LocalAPIContext,
	data: Parameters<SingletonCollection<T>['update']>[2]
): Promise<void> {
	await collection.get(context, { perspective: 'draft' });
	const id = collection.getSingletonId(context);
	if (!id) return;
	await collection.update(context, id, data, { publish: true });
}

// --- first-run trigger --------------------------------------------------------

/**
 * Per-process latch. `'done'` means "decided" — either we seeded, or the site was
 * already touched. A pending promise dedupes concurrent first requests. `null`
 * means "no organization yet, check again next request" (pre-signup; signup
 * creates the org mid-request, so the decision lands on the request after it).
 */
let seedState: Promise<void> | 'done' | null = null;

/** Seed example content the first time the app runs against an untouched site. */
export function seedOnFirstRun(locals: App.Locals): Promise<void> {
	if (seedState === 'done') return Promise.resolve();
	if (seedState) return seedState;

	const attempt = (async () => {
		const { databaseAdapter } = locals.aphexCMS;
		const orgs = await databaseAdapter.findAllOrganizations();
		const org = orgs[0];
		if (!org) {
			seedState = null; // nothing to seed into yet — re-check next request
			return;
		}

		// Singleton `get()` calls lazy-create empty header/footer/settings drafts,
		// including when Admin first opens. Those system-created rows are not
		// evidence that a person has added content, so only real content types
		// block seeding.
		const counts = await databaseAdapter.getDocCountsByType(org.id);
		const touched = SEEDED_TYPES.some((type) => (counts[type] ?? 0) > 0);
		if (touched) {
			seedState = 'done';
			return;
		}

		console.log('[seed] Fresh site detected — creating example content…');
		const created = await seedContent(locals.aphexCMS, systemContext(org.id));
		console.log(
			`[seed] Done: ${created.pages} pages, ${created.posts} posts, ${created.categories} categories.`
		);
		seedState = 'done';
	})().catch((error) => {
		// Never let seeding take a request down. A partial seed leaves rows behind,
		// so the counts check above keeps a retry from duplicating anything.
		console.error('[seed] Failed to seed example content:', error);
		seedState = 'done';
	});

	seedState = attempt;
	return attempt;
}

/** Whether the first-run seed is enabled (kill switch: `APHEX_SEED=false`). */
export function seedEnabled(): boolean {
	return env.APHEX_SEED !== 'false';
}
