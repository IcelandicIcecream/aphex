import { describe, expect, it } from 'vitest';
import {
	ancestors,
	matchRedirect,
	normalizePath,
	normalizeTarget,
	type RedirectRule
} from '../src/lib/paths';

describe('normalizePath', () => {
	it('keeps a site path, without the query, fragment or trailing slash', () => {
		expect(normalizePath('/about-us/')).toBe('/about-us');
		expect(normalizePath('about-us?ref=1#team')).toBe('/about-us');
		expect(normalizePath('/')).toBe('/');
	});
	it('takes the path from a whole URL on an old site', () => {
		expect(normalizePath('https://old-site.com/2019/05/our-story/')).toBe('/2019/05/our-story');
	});
	it('refuses what is not a path', () => {
		expect(normalizePath('')).toBeNull();
		expect(normalizePath('//evil.com')).toBeNull();
		expect(normalizePath('/a b')).toBeNull();
	});
});

describe('normalizeTarget', () => {
	it('takes a path or a whole https link', () => {
		expect(normalizeTarget('/about/')).toBe('/about');
		expect(normalizeTarget('https://book.example.com/x')).toBe('https://book.example.com/x');
		expect(normalizeTarget('javascript:alert(1)')).toBe('/javascript:alert(1)');
	});
});

describe('matchRedirect', () => {
	const rules: RedirectRule[] = [
		{ fromPath: '/about-us', toPath: '/about', prefix: false },
		{ fromPath: '/blog', toPath: '/news', prefix: true },
		{ fromPath: '/blog/old-post', toPath: '/news/new-post', prefix: false }
	];
	it('follows an exact one', () => {
		expect(matchRedirect(rules, '/about-us')?.target).toBe('/about');
	});
	it('carries the rest of the path under a prefix', () => {
		expect(matchRedirect(rules, '/blog')?.target).toBe('/news');
		expect(matchRedirect(rules, '/blog/spring-menu')?.target).toBe('/news/spring-menu');
	});
	it('prefers the exact rule to the prefix', () => {
		expect(matchRedirect(rules, '/blog/old-post')?.target).toBe('/news/new-post');
	});
	it('leaves near misses alone', () => {
		expect(matchRedirect(rules, '/blogging')).toBeNull();
		expect(matchRedirect(rules, '/about-us/team')).toBeNull();
	});
});

describe('ancestors', () => {
	it('lists a path and every address above it, nearest first', () => {
		expect(ancestors('/blog/a/b')).toEqual(['/blog/a/b', '/blog/a', '/blog', '/']);
		expect(ancestors('/')).toEqual(['/']);
	});
});
