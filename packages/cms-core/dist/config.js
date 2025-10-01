// Aphex CMS Configuration System
export function createCMSConfig(config) {
    return {
        // Default configuration
        database: {
            adapter: 'postgresql',
            ...config.database
        },
        storage: {
            adapter: 'local',
            basePath: './static/uploads',
            baseUrl: '/uploads',
            ...config.storage
        },
        customization: {
            branding: {
                title: 'Aphex CMS',
                ...config.customization?.branding
            },
            ...config.customization
        },
        plugins: [],
        // User overrides
        ...config
    };
}
