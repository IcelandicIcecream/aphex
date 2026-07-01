function createActiveTab() {
	let activeTab = $state<'structure' | 'vision' | 'media'>('structure');

	return {
		get value() {
			return activeTab;
		},
		set value(val: 'structure' | 'vision' | 'media') {
			activeTab = val;
		}
	};
}

export const activeTabState = createActiveTab();
