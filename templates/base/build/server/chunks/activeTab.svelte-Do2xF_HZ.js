function createActiveTab() {
  let activeTab = "structure";
  return {
    get value() {
      return activeTab;
    },
    set value(val) {
      activeTab = val;
    }
  };
}
const activeTabState = createActiveTab();

export { activeTabState as a };
//# sourceMappingURL=activeTab.svelte-Do2xF_HZ.js.map
