<script lang="ts">
  import { Sidebar } from "@aphex/cms-core";
  let { children } = $props();
</script>

<Sidebar>
    {@render children()}
</Sidebar>
