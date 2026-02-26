export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, none: 4 };

// Default based on environment; overridden by CMSConfig.logLevel via setLogLevel()
let currentLevel: LogLevel =
	typeof process !== 'undefined' && process.env?.NODE_ENV === 'production' ? 'warn' : 'debug';

export function setLogLevel(level: LogLevel) {
	currentLevel = level;
}

function createMethod(level: LogLevel, consoleFn: (...args: any[]) => void) {
	return (...args: any[]) => {
		if (LEVELS[currentLevel] > LEVELS[level]) return;
		if (
			args.length > 0 &&
			typeof args[0] === 'object' &&
			args[0] !== null &&
			!(args[0] instanceof Error)
		) {
			const ctx = args[0];
			const rest = args.slice(1);
			consoleFn(`[${level.toUpperCase()}]`, ...rest, ctx);
		} else {
			consoleFn(`[${level.toUpperCase()}]`, ...args);
		}
	};
}

export const cmsLogger = {
	debug: createMethod('debug', console.log),
	info: createMethod('info', console.log),
	warn: createMethod('warn', console.warn),
	error: createMethod('error', console.error)
};
