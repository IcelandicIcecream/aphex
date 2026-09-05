/**
 * The shape `<Image>` consumes: an image field value after asset injection.
 *
 * Declared here rather than imported from the admin types so this entrypoint
 * stays free of anything server- or admin-shaped — it is imported by public
 * marketing pages, and a stray import is how a barrel drags the admin bundle
 * onto them. The dependency runs the other way instead: `types/asset.ts` builds
 * its `ImageAsset` on top of {@link InjectedAsset}, so the set of fields
 * injection produces is declared exactly once and a document's own type can't
 * disagree with what `<Image>` reads off it.
 */
export interface InjectedAsset {
	_ref?: string;
	/** Populated by `injectAssetUrls`; absent means the ref didn't resolve. */
	url?: string;
	/** The asset's own default alt, shared across placements. */
	alt?: string;
	width?: number;
	height?: number;
	/** Pre-built responsive candidates. Absent when the pipeline is off. */
	srcset?: string;
}

export interface ImageValue {
	asset?: InjectedAsset;
	/** Per-placement alt override, which takes precedence over the asset's. */
	alt?: string;
}
