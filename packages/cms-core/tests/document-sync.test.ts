import { describe, expect, it, vi } from 'vitest';
import { reconcile } from '../src/lib/components/admin/document-merge';
import { documentSync, type SyncSnapshot } from '../src/lib/components/admin/document-sync';

type Data = Record<string, unknown>;

/** An editor with a document open at `revision`, and a server holding `server`. */
function setup(options: { revision?: number; base?: Data; local?: Data; busy?: boolean } = {}) {
	const editor: SyncSnapshot = {
		id: 'page-1',
		revision: options.revision ?? 3,
		base: options.base ?? { title: 'Home', intro: 'Hello' },
		local: options.local ?? options.base ?? { title: 'Home', intro: 'Hello' },
		busy: options.busy ?? false
	};
	const server = { revision: editor.revision!, data: { ...editor.base } as Data };
	const applied: Array<{ kind: string; data: Data; revision: number | undefined }> = [];
	const deps = {
		getMeta: vi.fn(async (id: string) => ({
			success: true,
			data: { id, _meta: { revision: server.revision } }
		})),
		getById: vi.fn(async (id: string) => ({
			success: true,
			data: { id, ...server.data, _meta: { revision: server.revision } } as Data
		})),
		read: vi.fn((): SyncSnapshot | null => ({ ...editor })),
		apply: vi.fn((action: { kind: string; data: Data }, document: Data) => {
			applied.push({
				kind: action.kind,
				data: action.data,
				revision: (document._meta as { revision: number }).revision
			});
		})
	};
	return { editor, server, applied, deps, sync: documentSync(deps) };
}

/** Someone else saves: the server moves on a revision. */
const saveElsewhere = (server: { revision: number; data: Data }, change: Data) => {
	server.revision += 1;
	server.data = { ...server.data, ...change };
};

describe('documentSync: noticing', () => {
	it('asks only for the revision while nothing changed', async () => {
		const { sync, deps } = setup();
		expect(await sync.check()).toBe('same');
		expect(deps.getMeta).toHaveBeenCalledTimes(1);
		expect(deps.getById).not.toHaveBeenCalled();
		expect(deps.apply).not.toHaveBeenCalled();
	});

	it('shows theirs when nothing is unsaved here', async () => {
		const { sync, server, applied } = setup();
		saveElsewhere(server, { intro: 'Fresh bread daily' });
		expect(await sync.check()).toBe('take');
		expect(applied).toEqual([
			{ kind: 'take', data: { title: 'Home', intro: 'Fresh bread daily' }, revision: 4 }
		]);
	});

	it('merges theirs with unsaved edits to other fields', async () => {
		const { sync, server, applied } = setup({ local: { title: 'My title', intro: 'Hello' } });
		saveElsewhere(server, { intro: 'Fresh bread daily' });
		expect(await sync.check()).toBe('merge');
		expect(applied[0]).toEqual({
			kind: 'merge',
			data: { title: 'My title', intro: 'Fresh bread daily' },
			revision: 4
		});
	});

	it('says which field both changed, and replaces nothing on its own', async () => {
		const { sync, server, deps } = setup({ local: { title: 'Mine', intro: 'Hello' } });
		saveElsewhere(server, { title: 'Theirs' });
		expect(await sync.check()).toBe('conflict');
		const [action] = deps.apply.mock.calls[0];
		expect(action).toMatchObject({ kind: 'conflict', conflicts: ['title'] });
	});
});

describe('documentSync: timing', () => {
	it('waits while a save is in flight: its answer moves the revision', async () => {
		const { sync, server, deps } = setup({ busy: true });
		saveElsewhere(server, { intro: 'x' });
		expect(await sync.check()).toBe('skipped');
		expect(deps.getMeta).not.toHaveBeenCalled();
	});

	it('does nothing when this editor’s own save landed while it asked', async () => {
		const { sync, server, editor, deps } = setup();
		// The revision moved because of our save, which the editor has already recorded.
		saveElsewhere(server, {});
		deps.read.mockImplementation(() => ({ ...editor, revision: server.revision }));
		expect(await sync.check()).toBe('same');
		expect(deps.apply).not.toHaveBeenCalled();
	});

	it('does nothing when a save starts between the two requests', async () => {
		const { sync, server, editor, deps } = setup();
		saveElsewhere(server, { intro: 'x' });
		let calls = 0;
		deps.read.mockImplementation(() => ({ ...editor, busy: ++calls > 2 }));
		expect(await sync.check()).toBe('skipped');
		expect(deps.apply).not.toHaveBeenCalled();
	});

	it('drops the answer when another document was opened meanwhile', async () => {
		const { sync, server, editor, deps } = setup();
		saveElsewhere(server, { intro: 'x' });
		let calls = 0;
		deps.read.mockImplementation(() => ({ ...editor, id: ++calls > 1 ? 'page-2' : 'page-1' }));
		expect(await sync.check()).toBe('skipped');
		expect(deps.apply).not.toHaveBeenCalled();
	});

	it('runs one check at a time', async () => {
		const { sync, server } = setup();
		saveElsewhere(server, { intro: 'x' });
		const [first, second] = await Promise.all([sync.check(), sync.check()]);
		expect([first, second].sort()).toEqual(['skipped', 'take']);
	});

	it('skips an editor that doesn’t sync (a new document, a preview)', async () => {
		const { sync, deps } = setup();
		deps.read.mockReturnValue(null);
		expect(await sync.check()).toBe('skipped');
		expect(deps.getMeta).not.toHaveBeenCalled();
	});

	it('shrugs off a failed request and tries again next time', async () => {
		const { sync, server, deps } = setup();
		saveElsewhere(server, { intro: 'x' });
		deps.getMeta.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		expect(await sync.check()).toBe('skipped');
		expect(await sync.check()).toBe('take');
	});
});

describe('reconcile', () => {
	it('takes theirs only when nothing here differs from where both started', () => {
		expect(reconcile({ a: 1 }, { a: 1 }, { a: 2 })).toEqual({ kind: 'take', data: { a: 2 } });
		expect(reconcile({ a: 1, b: 1 }, { a: 1, b: 5 }, { a: 2, b: 1 })).toEqual({
			kind: 'merge',
			data: { a: 2, b: 5 }
		});
		expect(reconcile({ a: 1 }, { a: 3 }, { a: 2 })).toEqual({
			kind: 'conflict',
			data: { a: 3 },
			conflicts: ['a']
		});
	});
});
