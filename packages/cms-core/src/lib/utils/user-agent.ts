// Order matters: Edge and Opera also say Chrome, and everything says Safari.
const BROWSERS: Array<[RegExp, string]> = [
	[/Edg(A|iOS)?\//, 'Edge'],
	[/OPR\//, 'Opera'],
	[/Firefox\/|FxiOS\//, 'Firefox'],
	[/Chrome\/|CriOS\//, 'Chrome'],
	[/Safari\//, 'Safari']
];
const SYSTEMS: Array<[RegExp, string]> = [
	[/iPhone/, 'iPhone'],
	[/iPad/, 'iPad'],
	[/Android/, 'Android'],
	[/CrOS/, 'ChromeOS'],
	[/Windows/, 'Windows'],
	[/Mac OS X|Macintosh/, 'macOS'],
	[/Linux/, 'Linux']
];

/** "Chrome on macOS", for a person to recognise. Null when it says nothing useful. */
export function describeDevice(userAgent: string | null | undefined): string | null {
	if (!userAgent) return null;
	const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
	const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
	if (browser && system) return `${browser} on ${system}`;
	return browser ?? system ?? null;
}
