<script lang="ts">
  import type { CMSConfig } from '../config.js';
  
  interface Props {
    config: CMSConfig;
  }
  
  let { config }: Props = $props();
  
  // This will be the main admin app component that replaces your current admin routes
  // It will contain all the admin UI logic
</script>

<div class="aphex-cms-admin">
  <h1>Aphex CMS Admin</h1>
  <p>Configuration loaded for: {config.customization?.branding?.title || 'Aphex CMS'}</p>
  
  <!-- This will contain your entire admin interface -->
  <!-- For now it's a placeholder -->
  
  <div class="text-sm text-muted-foreground">
    <p>Schemas: {Object.keys(config.schemas).length}</p>
    <p>Database: {config.database.adapter}</p>
    <p>Storage: {config.storage.adapter}</p>
  </div>
</div>

<style>
  .aphex-cms-admin {
    min-height: 100vh;
    padding: 2rem;
  }
</style>