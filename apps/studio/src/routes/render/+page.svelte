<script lang="ts">
    let { data } = $props()
    import { urlFor } from '$lib/utils/imageBuilder.js';
</script>

<div>
    <img alt="pageRender" src={urlFor(data.pageRender?.hero.backgroundImage.asset)}/>
</div>
