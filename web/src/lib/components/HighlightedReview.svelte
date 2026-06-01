<script lang="ts">
	interface Props {
		text: string;
		onTagClick?: (tag: string) => void;
	}

	let { text, onTagClick }: Props = $props();

	// Split text by tags, preserving the tags
	const parts = text.split(/(#[\w_\p{L}\p{N}]+)/gu).filter(Boolean);
</script>

<span class="break-words">
	{#each parts as part}
		{#if part.startsWith('#')}
			<button
				type="button"
				class="cursor-pointer rounded px-1 font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
				onclick={() => onTagClick?.(part.slice(1))}
			>
				{part}
			</button>
		{:else}
			{part}
		{/if}
	{/each}
</span>
