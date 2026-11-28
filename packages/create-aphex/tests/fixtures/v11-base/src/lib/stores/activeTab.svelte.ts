import type { AdminArea } from '@aphexcms/cms-core/client/ui';

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
