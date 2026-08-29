// Variant reading/selection only — pure, browser-safe, no Sharp.
//
// `./generate` is deliberately NOT re-exported here: it imports Sharp, and a
// barrel that pulled it in would drag a native image library into any chunk
// that touched this module, including the one `<Image>` ships to the browser.
// Server callers import it by path.
export * from './variants';
