import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { File, Folder, Files } from 'fumadocs-ui/components/files';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Banner } from 'fumadocs-ui/components/banner';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import type { MDXComponents } from 'mdx/types';

/**
 * Components registered here are available in any MDX file without importing.
 * Keep it tight — only add components that make sense as prose-level primitives.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		Tabs,
		Tab,
		Steps,
		Step,
		Files,
		File,
		Folder,
		TypeTable,
		Accordion,
		Accordions,
		Callout,
		Banner,
		InlineTOC,
		...components
	};
}
