import type { SchemaType } from '@aphexcms/cms-core';

/**
 * Stress-test schema: every nested object contains its OWN array, so
 * editing an object opens a modal with another array inside, which opens
 * another modal, and so on. Built specifically to exercise the modal-stack
 * click-outside / z-index logic and the panel scroll behaviour.
 */
export const richContentBlock: SchemaType = {
	type: 'object',
	name: 'richContentBlock',
	title: 'Rich Content Block',
	description: 'Heavyweight block — every nested object contains another array',
	fields: [
		{ name: 'heading', type: 'string', title: 'Heading' },
		{ name: 'eyebrow', type: 'string', title: 'Eyebrow' },
		{ name: 'body', type: 'text', title: 'Body Copy', rows: 4 },

		{
			name: 'sections',
			type: 'array',
			title: 'Sections',
			description: 'Each section opens a modal containing its own arrays',
			of: [
				{
					type: 'object',
					name: 'section',
					title: 'Section',
					fields: [
						{
							name: 'title',
							type: 'string',
							title: 'Section Title',
							validation: (Rule) => Rule.required()
						},
						{ name: 'subtitle', type: 'string', title: 'Section Subtitle' },
						{ name: 'intro', type: 'text', title: 'Intro', rows: 3 },

						{
							name: 'columns',
							type: 'array',
							title: 'Columns',
							description: 'Each column opens another modal',
							of: [
								{
									type: 'object',
									name: 'column',
									title: 'Column',
									fields: [
										{ name: 'heading', type: 'string', title: 'Column Heading' },
										{ name: 'body', type: 'text', title: 'Column Body', rows: 3 },
										{ name: 'image', type: 'image', title: 'Column Image' },
										{
											name: 'relatedPage',
											type: 'reference',
											title: 'Related Page',
											description: 'Link this column to another page',
											to: [{ type: 'page' }]
										},
										{
											name: 'featuredProduct',
											type: 'reference',
											title: 'Featured Product',
											description: 'Pick a product to spotlight',
											to: [{ type: 'testProduct' }]
										},

										{
											name: 'links',
											type: 'array',
											title: 'Links',
											description: 'Each link opens yet another modal',
											of: [
												{
													type: 'object',
													name: 'link',
													title: 'Link',
													fields: [
														{
															name: 'label',
															type: 'string',
															title: 'Label',
															validation: (Rule) => Rule.required()
														},
														{ name: 'url', type: 'string', title: 'URL' },
														{ name: 'openInNewTab', type: 'boolean', title: 'Open in New Tab' },

														{
															name: 'tracking',
															type: 'object',
															title: 'Tracking',
															fields: [
																{ name: 'campaign', type: 'string', title: 'UTM Campaign' },
																{ name: 'source', type: 'string', title: 'UTM Source' },
																{ name: 'medium', type: 'string', title: 'UTM Medium' },
																{
																	name: 'tags',
																	type: 'array',
																	title: 'Tags',
																	of: [
																		{
																			type: 'object',
																			name: 'tag',
																			title: 'Tag',
																			fields: [
																				{ name: 'key', type: 'string', title: 'Key' },
																				{ name: 'value', type: 'string', title: 'Value' }
																			]
																		}
																	]
																}
															]
														}
													]
												}
											]
										},

										{
											name: 'features',
											type: 'array',
											title: 'Features',
											description: 'Each feature opens its own modal',
											of: [
												{
													type: 'object',
													name: 'feature',
													title: 'Feature',
													fields: [
														{ name: 'name', type: 'string', title: 'Name' },
														{ name: 'description', type: 'text', title: 'Description', rows: 2 },
														{ name: 'icon', type: 'string', title: 'Icon' },
														{
															name: 'badges',
															type: 'array',
															title: 'Badges',
															of: [
																{
																	type: 'object',
																	name: 'badge',
																	title: 'Badge',
																	fields: [
																		{ name: 'label', type: 'string', title: 'Label' },
																		{ name: 'tone', type: 'string', title: 'Tone' }
																	]
																}
															]
														}
													]
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		},

		{
			name: 'gallery',
			type: 'object',
			title: 'Gallery',
			description: 'Object that contains an array — editing it opens a modal with the array inside',
			fields: [
				{ name: 'title', type: 'string', title: 'Gallery Title' },
				{ name: 'caption', type: 'string', title: 'Caption' },
				{
					name: 'images',
					type: 'array',
					title: 'Images',
					of: [
						{
							type: 'object',
							name: 'galleryImage',
							title: 'Gallery Image',
							fields: [
								{ name: 'image', type: 'image', title: 'Image' },
								{ name: 'altText', type: 'string', title: 'Alt Text' },
								{ name: 'caption', type: 'string', title: 'Caption' },
								{
									name: 'credit',
									type: 'object',
									title: 'Credit',
									fields: [
										{ name: 'name', type: 'string', title: 'Photographer' },
										{ name: 'url', type: 'string', title: 'URL' },
										{
											name: 'links',
											type: 'array',
											title: 'Profile Links',
											of: [
												{
													type: 'object',
													name: 'profileLink',
													title: 'Profile Link',
													fields: [
														{ name: 'platform', type: 'string', title: 'Platform' },
														{ name: 'url', type: 'string', title: 'URL' }
													]
												}
											]
										}
									]
								}
							]
						}
					]
				}
			]
		},

		{
			name: 'seo',
			type: 'object',
			title: 'SEO',
			fields: [
				{ name: 'metaTitle', type: 'string', title: 'Meta Title' },
				{ name: 'metaDescription', type: 'text', title: 'Meta Description', rows: 3 },
				{
					name: 'keywords',
					type: 'array',
					title: 'Keywords',
					of: [
						{
							type: 'object',
							name: 'keyword',
							title: 'Keyword',
							fields: [
								{ name: 'term', type: 'string', title: 'Term' },
								{ name: 'weight', type: 'number', title: 'Weight' }
							]
						}
					]
				},
				{
					name: 'openGraph',
					type: 'object',
					title: 'Open Graph',
					fields: [
						{ name: 'title', type: 'string', title: 'OG Title' },
						{ name: 'image', type: 'image', title: 'OG Image' },
						{
							name: 'alternates',
							type: 'array',
							title: 'Alternate Locales',
							of: [
								{
									type: 'object',
									name: 'altLocale',
									title: 'Alternate Locale',
									fields: [
										{ name: 'locale', type: 'string', title: 'Locale' },
										{ name: 'title', type: 'string', title: 'Title' },
										{ name: 'image', type: 'image', title: 'Image' }
									]
								}
							]
						}
					]
				}
			]
		}
	]
};

export default richContentBlock;
