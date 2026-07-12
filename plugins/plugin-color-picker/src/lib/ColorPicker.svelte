<script lang="ts">
	import { cn } from '@aphexcms/ui/utils';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { ChevronDown } from '@lucide/svelte';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import * as ButtonGroup from '@aphexcms/ui/shadcn/button-group';
	import { Input } from '@aphexcms/ui/shadcn/input';

	type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

	let {
		value = $bindable('#000000'),
		class: className,
		allowOpacity = false,
		defaultFormat = 'hex',
		formats = ['hex', 'rgb', 'hsl', 'oklch'],
		onChange
	}: {
		value?: string;
		class?: string;
		allowOpacity?: boolean;
		defaultFormat?: ColorFormat;
		formats?: ColorFormat[];
		onChange?: (value: string) => void;
	} = $props();

	let h = $state(0);
	let s = $state(0);
	let v = $state(0);
	let a = $state(1);
	// svelte-ignore state_referenced_locally -- intentional: seed from the initial prop value
	let activeFormat = $state<ColorFormat>(defaultFormat);
	let isDragging = $state(false);

	let sbRef: HTMLDivElement | undefined = $state();
	let hueRef: HTMLDivElement | undefined = $state();
	let alphaRef: HTMLDivElement | undefined = $state();
	let formatOpen = $state(false);

	$effect(() => {
		if (!isDragging) {
			const parsed = parseColor(value);
			if (parsed) {
				const currentStr = formatOutput(h, s, v, a, activeFormat);
				const parsedStr = formatOutput(parsed.h, parsed.s, parsed.v, parsed.a, activeFormat);

				if (currentStr !== parsedStr) {
					h = parsed.h;
					s = parsed.s;
					v = parsed.v;
					a = parsed.a;
					if (value.startsWith('rgb')) activeFormat = 'rgb';
					else if (value.startsWith('hsl')) activeFormat = 'hsl';
					else if (value.startsWith('oklch')) activeFormat = 'oklch';
					else activeFormat = 'hex';
				}
			}
		}
	});

	function updateExternal() {
		value = formatOutput(h, s, v, a, activeFormat);
		onChange?.(value);
	}

	function setFormat(fmt: ColorFormat) {
		activeFormat = fmt;
		updateExternal();
		formatOpen = false;
	}

	function parseColor(str: string) {
		str = str.trim().toLowerCase();
		if (str.startsWith('#')) {
			const hex = str.replace('#', '');
			let r = 0,
				g = 0,
				b = 0,
				alpha = 1;
			if (hex.length === 3) {
				r = parseInt(hex.slice(0, 1).repeat(2), 16);
				g = parseInt(hex.slice(1, 2).repeat(2), 16);
				b = parseInt(hex.slice(2, 3).repeat(2), 16);
			} else if (hex.length === 6) {
				r = parseInt(hex.substring(0, 2), 16);
				g = parseInt(hex.substring(2, 4), 16);
				b = parseInt(hex.substring(4, 6), 16);
			} else if (hex.length === 8) {
				r = parseInt(hex.substring(0, 2), 16);
				g = parseInt(hex.substring(2, 4), 16);
				b = parseInt(hex.substring(4, 6), 16);
				alpha = parseInt(hex.substring(6, 8), 16) / 255;
			} else {
				return null;
			}
			return { ...rgbToHsv(r, g, b), a: alpha };
		}
		if (str.startsWith('rgb')) {
			const values = str.match(/[\d.]+/g)?.map(Number);
			if (values && values.length >= 3) {
				const [r = 0, g = 0, b = 0, alpha = 1] = values;
				return { ...rgbToHsv(r, g, b), a: alpha };
			}
		}
		if (str.startsWith('hsl')) {
			const values = str.match(/[\d.]+/g)?.map(Number);
			if (values && values.length >= 3) {
				const [hue = 0, sat = 0, light = 0, alpha = 1] = values;
				const sNorm = sat / 100,
					lNorm = light / 100;
				const vNorm = lNorm + sNorm * Math.min(lNorm, 1 - lNorm);
				const sHsv = vNorm === 0 ? 0 : 2 * (1 - lNorm / vNorm);
				return { h: hue, s: sHsv * 100, v: vNorm * 100, a: alpha };
			}
		}
		if (str.startsWith('oklch')) {
			const values = str
				.match(/[\d.%]+/g)
				?.map((s) => (s.includes('%') ? parseFloat(s) / 100 : parseFloat(s)));
			if (values && values.length >= 3) {
				const [l = 0, c = 0, hue = 0, alpha = 1] = values;
				const rgb = oklchToRgb(l, c, hue);
				return { ...rgbToHsv(rgb.r, rgb.g, rgb.b), a: alpha };
			}
		}
		return null;
	}

	function formatOutput(h: number, s: number, v: number, a: number, format: ColorFormat): string {
		if (format === 'hex') return hsvToHex(h, s, v, a);
		if (format === 'rgb') return hsvToRgbString(h, s, v, a);
		if (format === 'hsl') return hsvToHslString(h, s, v, a);
		if (format === 'oklch') return hsvToOklchString(h, s, v, a);
		return '';
	}

	function rgbToHsv(r: number, g: number, b: number) {
		r /= 255;
		g /= 255;
		b /= 255;
		const max = Math.max(r, g, b),
			min = Math.min(r, g, b);
		let h = 0,
			s = 0,
			v = max;
		const d = max - min;
		s = max === 0 ? 0 : d / max;
		if (max !== min) {
			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}
			h /= 6;
		}
		return { h: h * 360, s: s * 100, v: v * 100 };
	}

	function hsvToRgb(h: number, s: number, v: number) {
		let sNorm = s / 100,
			vNorm = v / 100;
		let r = 0,
			g = 0,
			b = 0;
		const i = Math.floor(h / 60),
			f = h / 60 - i,
			p = vNorm * (1 - sNorm),
			q = vNorm * (1 - f * sNorm),
			t = vNorm * (1 - (1 - f) * sNorm);
		switch (i % 6) {
			case 0:
				r = vNorm;
				g = t;
				b = p;
				break;
			case 1:
				r = q;
				g = vNorm;
				b = p;
				break;
			case 2:
				r = p;
				g = vNorm;
				b = t;
				break;
			case 3:
				r = p;
				g = q;
				b = vNorm;
				break;
			case 4:
				r = t;
				g = p;
				b = vNorm;
				break;
			case 5:
				r = vNorm;
				g = p;
				b = q;
				break;
		}
		return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
	}

	function hsvToOklchString(h: number, s: number, v: number, a: number) {
		const rgb = hsvToRgb(h, s, v);
		const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
		const L = (oklch.l * 100).toFixed(1) + '%';
		const C = oklch.c.toFixed(3);
		const H = (oklch.h || 0).toFixed(1);

		if (allowOpacity && a < 1) return `oklch(${L} ${C} ${H} / ${parseFloat(a.toFixed(2))})`;
		return `oklch(${L} ${C} ${H})`;
	}

	function rgbToOklch(r: number, g: number, b: number) {
		r /= 255;
		g /= 255;
		b /= 255;
		r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
		g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
		b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

		const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
		const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
		const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

		const l_ = Math.cbrt(l),
			m_ = Math.cbrt(m),
			s_ = Math.cbrt(s);

		const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
		const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
		const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

		const C = Math.sqrt(A * A + B * B);
		let H = (Math.atan2(B, A) * 180) / Math.PI;
		if (H < 0) H += 360;

		return { l: L, c: C, h: H };
	}

	function oklchToRgb(l: number, c: number, h: number) {
		const hRad = h * (Math.PI / 180);
		const A = c * Math.cos(hRad);
		const B = c * Math.sin(hRad);
		const L = l;

		const l_ = L + 0.3963377774 * A + 0.2158037573 * B;
		const m_ = L - 0.1055613458 * A - 0.0638541728 * B;
		const s_ = L - 0.0894841775 * A - 1.291485548 * B;

		const lLin = l_ * l_ * l_;
		const mLin = m_ * m_ * m_;
		const sLin = s_ * s_ * s_;

		let r = +4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
		let g = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
		let b = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;

		r = r >= 0.0031308 ? 1.055 * Math.pow(r, 1.0 / 2.4) - 0.055 : 12.92 * r;
		g = g >= 0.0031308 ? 1.055 * Math.pow(g, 1.0 / 2.4) - 0.055 : 12.92 * g;
		b = b >= 0.0031308 ? 1.055 * Math.pow(b, 1.0 / 2.4) - 0.055 : 12.92 * b;

		r = Math.min(Math.max(0, r), 1) * 255;
		g = Math.min(Math.max(0, g), 1) * 255;
		b = Math.min(Math.max(0, b), 1) * 255;
		return { r, g, b };
	}

	function hsvToHex(h: number, s: number, v: number, a: number) {
		const { r, g, b } = hsvToRgb(h, s, v);
		const toHex = (x: number) => {
			const hex = x.toString(16);
			return hex.length === 1 ? '0' + hex : hex;
		};
		let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
		if (allowOpacity && a < 1) hex += toHex(Math.round(a * 255));
		return hex.toUpperCase();
	}

	function hsvToRgbString(h: number, s: number, v: number, a: number) {
		const { r, g, b } = hsvToRgb(h, s, v);
		if (allowOpacity && a < 1) return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(2))})`;
		return `rgb(${r}, ${g}, ${b})`;
	}

	function hsvToHslString(h: number, s: number, v: number, a: number) {
		const sNorm = s / 100,
			vNorm = v / 100;
		let l = ((2 - sNorm) * vNorm) / 2;
		let sHsl = l && l < 1 ? (sNorm * vNorm) / (l < 0.5 ? l * 2 : 2 - l * 2) : sNorm;
		if (allowOpacity && a < 1)
			return `hsla(${Math.round(h)}, ${Math.round(sHsl * 100)}%, ${Math.round(l * 100)}%, ${parseFloat(a.toFixed(2))})`;
		return `hsl(${Math.round(h)}, ${Math.round(sHsl * 100)}%, ${Math.round(l * 100)}%)`;
	}

	function handleDragStart(e: MouseEvent | TouchEvent, fn: (e: MouseEvent | TouchEvent) => void) {
		isDragging = true;
		fn(e);
		const move = (e: MouseEvent | TouchEvent) => fn(e);
		const stop = () => {
			isDragging = false;
			window.removeEventListener('mousemove', move);
			window.removeEventListener('touchmove', move);
			window.removeEventListener('mouseup', stop);
			window.removeEventListener('touchend', stop);
		};
		window.addEventListener('mousemove', move);
		window.addEventListener('touchmove', move);
		window.addEventListener('mouseup', stop);
		window.addEventListener('touchend', stop);
	}

	/** Pointer coordinates from a mouse or touch event, or null if unavailable. */
	function pointerXY(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
		if ('touches' in e) {
			const touch = e.touches[0];
			return touch ? { x: touch.clientX, y: touch.clientY } : null;
		}
		return { x: e.clientX, y: e.clientY };
	}

	function handleSbChange(e: MouseEvent | TouchEvent) {
		if (!sbRef) return;
		const pt = pointerXY(e);
		if (!pt) return;
		const rect = sbRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (pt.x - rect.left) / rect.width));
		const y = Math.max(0, Math.min(1, (pt.y - rect.top) / rect.height));
		s = x * 100;
		v = (1 - y) * 100;
		updateExternal();
	}

	function handleHueChange(e: MouseEvent | TouchEvent) {
		if (!hueRef) return;
		const pt = pointerXY(e);
		if (!pt) return;
		const rect = hueRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (pt.x - rect.left) / rect.width));
		h = x * 360;
		updateExternal();
	}

	function handleAlphaChange(e: MouseEvent | TouchEvent) {
		if (!alphaRef) return;
		const pt = pointerXY(e);
		if (!pt) return;
		const rect = alphaRef.getBoundingClientRect();
		const x = Math.max(0, Math.min(1, (pt.x - rect.left) / rect.width));
		a = Math.round(x * 100) / 100;
		updateExternal();
	}

	function handleAlphaInput(e: Event & { currentTarget: HTMLInputElement }) {
		let val = parseInt(e.currentTarget.value);
		if (isNaN(val)) return;
		val = Math.max(0, Math.min(100, val));
		a = val / 100;
		updateExternal();
	}
</script>

<div
	class={cn('bg-popover flex w-[350px] flex-col gap-3 rounded-lg border p-3 shadow-sm', className)}
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={sbRef}
		class="relative h-56 w-full cursor-crosshair touch-none rounded-md shadow-sm"
		style:background-color={`hsl(${h}, 100%, 50%)`}
		role="slider"
		aria-label="Saturation and brightness"
		aria-valuenow={s}
		tabindex="0"
		onmousedown={(e) => handleDragStart(e, handleSbChange)}
		ontouchstart={(e) => handleDragStart(e, handleSbChange)}
	>
		<div class="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
			<div class="absolute inset-0 bg-gradient-to-r from-white to-transparent"></div>
			<div class="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
		</div>
		<svg
			class="pointer-events-none absolute inset-0 z-10 h-full w-full"
			style:overflow="visible"
			aria-hidden="true"
		>
			<circle cx={`${s}%`} cy={`${100 - v}%`} r="6" fill="none" stroke="rgba(0, 0, 0, 0.25)" />
			<circle cx={`${s}%`} cy={`${100 - v}%`} r="5" fill="none" stroke="white" stroke-width="2" />
		</svg>
	</div>

	<div class="flex items-center gap-3">
		<div
			class="relative mt-1 h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] shadow-sm"
		>
			<div class="absolute inset-0" style:background-color={hsvToHex(h, s, v, a)}></div>
		</div>

		<div class="flex flex-1 flex-col justify-center gap-3">
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div
				bind:this={hueRef}
				class="relative h-3 w-full cursor-pointer touch-none rounded-full shadow-sm ring-1 ring-black/5"
				style:background={'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'}
				role="slider"
				aria-label="Hue"
				aria-valuenow={h}
				tabindex="0"
				onmousedown={(e) => handleDragStart(e, handleHueChange)}
				ontouchstart={(e) => handleDragStart(e, handleHueChange)}
			>
				<div
					class="pointer-events-none absolute top-1/2 z-10 h-3 w-3 rounded-full bg-white"
					style:left={`min(max(6px, ${(h / 360) * 100}%), calc(100% - 6px))`}
					style:transform="translate(-50%, -50%)"
				></div>
			</div>

			{#if allowOpacity}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					bind:this={alphaRef}
					class="relative h-3 w-full cursor-pointer touch-none rounded-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==')] shadow-sm ring-1 ring-black/5"
					role="slider"
					aria-label="Opacity"
					aria-valuenow={a}
					tabindex="0"
					onmousedown={(e) => handleDragStart(e, handleAlphaChange)}
					ontouchstart={(e) => handleDragStart(e, handleAlphaChange)}
				>
					<div
						class="absolute inset-0 rounded-full"
						style:background={`linear-gradient(to right, transparent, ${hsvToHex(h, s, v, 1)})`}
					></div>
					<div
						class="pointer-events-none absolute top-1/2 z-10 h-3 w-3 rounded-full bg-white"
						style:left={`min(max(6px, ${a * 100}%), calc(100% - 6px))`}
						style:transform="translate(-50%, -50%)"
					></div>
				</div>
			{/if}
		</div>
	</div>

	<ButtonGroup.Root class="w-full">
		{#if formats.length > 1}
			<Popover.Root bind:open={formatOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="h-9 max-w-[5rem] justify-between px-2 text-[10px]"
						>
							{activeFormat.toUpperCase()}
							<ChevronDown class="h-3 w-3 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-[4.5rem] p-0" align="start">
					<Command.Root>
						<Command.List>
							<Command.Group>
								{#each formats as fmt}
									<Command.Item
										value={fmt}
										onSelect={() => setFormat(fmt)}
										class="flex h-7 justify-center text-[10px]"
									>
										{fmt.toUpperCase()}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		{:else}
			<Button variant="outline" class="h-9 max-w-[5rem] justify-between px-2 text-[10px]">
				{activeFormat.toUpperCase()}
			</Button>
		{/if}
		<Input
			class="h-9 flex-1 font-mono text-[10px] uppercase"
			{value}
			oninput={(e) => {
				const parsed = parseColor(e.currentTarget.value);
				if (parsed) {
					h = parsed.h;
					s = parsed.s;
					v = parsed.v;
					a = parsed.a;
					updateExternal();
				}
			}}
		/>

		{#if allowOpacity}
			<Input
				class="h-9 max-w-[4.2rem] text-right font-mono text-[10px]"
				value={Math.round(a * 100) + '%'}
				oninput={handleAlphaInput}
				maxlength={3}
			/>
		{/if}
	</ButtonGroup.Root>
</div>
