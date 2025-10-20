function createActiveTab() {
	let activeTab = $state<'structure' | 'vision'>('structure');

	return {
		get value() {
			return activeTab;
		},
		set value(val: 'structure' | 'vision') {
			activeTab = val;
		}
	};
}

export const activeTabState = createActiveTab();
