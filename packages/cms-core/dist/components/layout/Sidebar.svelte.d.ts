import { Sidebar } from '../ui/sidebar';
import type { SidebarData } from '../../types/sidebar.js';
type Props = {
    data?: SidebarData;
    onSignOut?: () => void | Promise<void>;
    children: any;
};
declare const Sidebar: import("svelte").Component<Props, {}, "">;
type Sidebar = ReturnType<typeof Sidebar>;
export default Sidebar;
//# sourceMappingURL=Sidebar.svelte.d.ts.map