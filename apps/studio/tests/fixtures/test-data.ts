/**
 * Test fixture data for seeding
 * Edit this file to change what gets seeded
 */
import type { Page, Catalog, Movie } from '../../src/lib/generated-types';

// Omit the id and _meta fields since those are generated
type PageInput = Omit<Page, 'id' | '_meta'>;
type CatalogInput = Omit<Catalog, 'id' | '_meta'>;
type MovieInput = Omit<Movie, 'id' | '_meta'>;

export interface SeedData {
	pages: Array<{ data: PageInput; publish?: boolean }>;
	catalogs: Array<{ data: CatalogInput; publish?: boolean }>;
	movies: Array<{ data: MovieInput; publish?: boolean }>;
}

export const testData: SeedData = {
	pages: [
		{
			data: {
				title: 'Home',
				slug: 'home',
				hero: {
					heading: 'Welcome to Our Site',
					subheading: 'The best place for amazing content',
					ctaText: 'Get Started',
					ctaUrl: '/get-started'
				},
				published: true
			},
			publish: true
		},
		{
			data: {
				title: 'About',
				slug: 'about',
				hero: {
					heading: 'About Our Company',
					subheading: 'Learn more about what we do'
				},
				published: true
			},
			publish: true
		},
		{
			data: {
				title: 'Contact',
				slug: 'contact',
				hero: {
					heading: 'Get in Touch',
					subheading: 'We would love to hear from you'
				},
				published: false
			},
			publish: false
		},
		{
			data: {
				title: 'Test Page One',
				slug: 'test-page-1',
				hero: {
					heading: 'Welcome to Test Page 1'
				},
				published: false
			},
			publish: false
		},
		{
			data: {
				title: 'Test Page Two',
				slug: 'test-page-2',
				hero: {
					heading: 'Another Test Page'
				},
				published: false
			},
			publish: false
		},
		{
			data: {
				title: 'Blog',
				slug: 'blog',
				hero: {
					heading: 'Our Blog',
					subheading: 'Latest news and updates'
				},
				published: true
			},
			publish: true
		}
	],

	catalogs: [
		{
			data: {
				title: 'Product Catalog',
				description: 'Our amazing products',
				items: [
					{
						title: 'Product 1',
						shortDescription: 'First product',
						price: 99.99
					},
					{
						title: 'Product 2',
						shortDescription: 'Second product',
						price: 149.99
					},
					{
						title: 'Product 3',
						shortDescription: 'Third product',
						price: 199.99
					}
				],
				published: true
			},
			publish: true
		},
		{
			data: {
				title: 'Services Catalog',
				description: 'Professional services we offer',
				items: [
					{
						title: 'Consulting',
						shortDescription: 'Expert consulting services',
						price: 299.99
					},
					{
						title: 'Training',
						shortDescription: 'Professional training programs',
						price: 499.99
					}
				],
				published: false
			},
			publish: false
		}
	],

	movies: [
		{
			data: {
				title: 'The Test Movie',
				releaseDate: '2024-01-01',
				director: 'Test Director',
				synopsis: 'A thrilling test movie about testing'
			}
		},
		{
			data: {
				title: 'Another Movie',
				releaseDate: '2024-06-15',
				director: 'Another Director',
				synopsis: 'An epic tale of software development'
			}
		}
	]
};
