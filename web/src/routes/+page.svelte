<script lang="ts">
	import type { PageData } from './$types';
	import { formatAuthor } from '$lib/formatters/author';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');

	const filteredItems = $derived(() => {
		if (!searchQuery.trim()) return data.items;

		const query = searchQuery.toLowerCase();
		return data.items.filter((item) => {
			// Search in title
			if (item.title.toLowerCase().includes(query)) return true;
			// Search in author
			if (item.author.toLowerCase().includes(query)) return true;
			// Search in tags
			if (item.customInfo?.tags?.some((tag) => tag.toLowerCase().includes(query))) return true;
			// Search in review
			if (item.customInfo?.review?.toLowerCase().includes(query)) return true;
			return false;
		});
	});
</script>

<svelte:head>
	<title>Bibliography</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
	<header class="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
		<div class="mx-auto max-w-4xl px-6 py-8">
			<h1
				class="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text font-serif text-4xl font-bold tracking-tight text-transparent"
			>
				Bibliography
			</h1>
			<p class="mt-2 font-light tracking-wide text-slate-400">文献コレクション</p>

			<!-- Search input -->
			<div class="relative mt-6">
				<svg
					class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="タイトル、著者、タグで検索..."
					class="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-12 pr-4 text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={() => (searchQuery = '')}
						class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-6 py-12">
		<div class="space-y-8">
			{#each filteredItems() as item}
				<article
					class="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/50 p-8 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:shadow-amber-500/10"
				>
					<!-- Decorative gradient -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>

					<div class="relative">
						<!-- Book type badge -->
						<span
							class="mb-4 inline-block rounded-full bg-amber-500/10 px-3 py-1 font-mono text-xs tracking-wider text-amber-400 uppercase"
						>
							{item.type}
						</span>

						<!-- Title -->
						<h2
							class="mb-3 font-serif text-2xl leading-relaxed font-medium text-slate-100 transition-colors group-hover:text-amber-100"
						>
							{item.title}
						</h2>

						<!-- Author & Year -->
						<div class="mb-6 flex flex-wrap items-center gap-4 text-sm text-slate-400">
							<span class="flex items-center gap-2">
								<svg
									class="h-4 w-4 text-slate-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
									/>
								</svg>
								{formatAuthor(item.author)}
							</span>
							<span class="flex items-center gap-2">
								<svg
									class="h-4 w-4 text-slate-500"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								{item.year}
							</span>
							{#if item.publisher}
								<span class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-slate-500"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
										/>
									</svg>
									{item.publisher}
								</span>
							{/if}
							{#if item.series}
								<span class="text-slate-500">({item.series})</span>
							{/if}
						</div>

						<!-- Custom Info -->
						{#if item.customInfo}
							<div class="border-t border-slate-700/50 pt-6">
								<!-- Tags -->
								{#if item.customInfo.tags && item.customInfo.tags.length > 0}
									<div class="mb-4 flex flex-wrap gap-2">
										{#each item.customInfo.tags as tag}
											<span
												class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400"
											>
												#{tag}
											</span>
										{/each}
									</div>
								{/if}

								<!-- Review -->
								{#if item.customInfo.review}
									<blockquote
										class="border-l-2 border-amber-500/50 pl-4 text-slate-300 leading-relaxed italic"
									>
										{item.customInfo.review}
									</blockquote>
								{/if}
							</div>
						{/if}

						<!-- Links -->
						{#if item.url || item.isbn}
							<div class="mt-6 flex gap-4">
								{#if item.url}
									<a
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										class="inline-flex items-center gap-2 text-sm text-amber-400 transition-colors hover:text-amber-300"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
											/>
										</svg>
										リンク
									</a>
								{/if}
								{#if item.isbn}
									<span class="text-sm text-slate-500">ISBN: {item.isbn}</span>
								{/if}
							</div>
						{/if}
					</div>
				</article>
			{/each}
		</div>

		{#if filteredItems().length === 0}
			<div class="py-16 text-center">
				{#if searchQuery}
					<p class="text-slate-500">「{searchQuery}」に一致する文献が見つかりません</p>
				{:else}
					<p class="text-slate-500">文献がありません</p>
				{/if}
			</div>
		{/if}
	</main>

	<footer class="border-t border-slate-700/50 py-8">
		<div class="mx-auto max-w-4xl px-6 text-center text-sm text-slate-500">
			{#if searchQuery}
				<p>{filteredItems().length} / {data.items.length} 件の文献</p>
			{:else}
				<p>{data.items.length} 件の文献</p>
			{/if}
		</div>
	</footer>
</div>
