import type { AdminArea } from '@aphexcms/cms-core/client';

function createActiveTab() {
	let activeTab = $state<AdminArea>('structure');

	return {
		get value() {
			return activeTab;
		},
		set value(val: AdminArea) {
			activeTab = val;
		}
	};
}

export const activeTabState = createActiveTab();
