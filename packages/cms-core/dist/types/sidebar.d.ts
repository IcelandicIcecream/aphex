export interface SidebarUser {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role?: string;
}
export interface SidebarNavItem {
    href: string;
    label: string;
    icon?: string;
    badge?: string | number;
}
export interface SidebarBranding {
    title?: string;
    logo?: string;
}
export interface SidebarData {
    user: SidebarUser;
    branding?: SidebarBranding;
    navItems?: SidebarNavItem[];
}
//# sourceMappingURL=sidebar.d.ts.map