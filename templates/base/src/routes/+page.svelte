<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Card, CardContent, CardHeader, CardTitle } from '@aphexcms/ui/shadcn/card';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { ListTodo, Plus, CircleCheck, Circle, Trash2, Pencil } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { Todo } from '$lib/generated-types';

	let { data }: { data: PageData } = $props();

	let todos = $derived(data.todos || []);
	let showCreateForm = $state(false);
	let newTitle = $state('');
	let newDescription = $state('');
	let editingTodoId = $state<string | null>(null);
	let editTitle = $state('');
	let editDescription = $state('');

	function startEdit(todo: Todo) {
		editingTodoId = todo.id;
		editTitle = todo.title;
		editDescription = todo.description || '';
	}

	function cancelEdit() {
		editingTodoId = null;
		editTitle = '';
		editDescription = '';
	}
</script>

<svelte:head>
	<title>Todo App - Aphex Base Template</title>
	<meta name="description" content="A simple todo app built with Aphex CMS" />
</svelte:head>

<!-- Local API Banner -->
<div class="from-primary/10 via-primary/5 to-primary/10 border-b bg-gradient-to-r">
	<div class="container mx-auto max-w-4xl px-6 py-3">
		<div class="flex items-center justify-between text-sm">
			<div class="flex items-center gap-2">
				<span class="font-semibold">⚡ Powered by Aphex Local API</span>
				<span class="text-muted-foreground">
					• Full CRUD operations • Multi-tenant • Type-safe
				</span>
			</div>
			<a href={resolve('/admin')} class="text-primary font-medium hover:underline">
				Admin Panel →
			</a>
		</div>
	</div>
</div>

<div class="container mx-auto max-w-4xl p-6">
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-bold">Todo App</h1>
				<p class="text-muted-foreground mt-2">
					Manage your tasks with Aphex CMS
					{#if data.isLoggedIn}
						<span class="ml-2 text-sm text-green-600">• Logged in as {data.userName}</span>
					{/if}
				</p>
			</div>
			<div class="flex gap-2">
				{#if data.isLoggedIn}
					<button
						type="button"
						onclick={() => (showCreateForm = !showCreateForm)}
						class="ring-offset-background focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
					>
						<Plus class="h-4 w-4" />
						{showCreateForm ? 'Cancel' : 'Add Todo'}
					</button>
				{:else}
					<Button href="/login" variant="outline">Login</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Create Todo Form (only for logged in users) -->
	{#if data.isLoggedIn && showCreateForm}
		<Card class="mb-6">
			<CardHeader>
				<CardTitle>Create New Todo</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					method="POST"
					action="?/createTodo"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								newTitle = '';
								newDescription = '';
								showCreateForm = false;
							}
							await update();
						};
					}}
					class="space-y-4"
				>
					<div>
						<Input
							type="text"
							name="title"
							placeholder="Todo title"
							bind:value={newTitle}
							required
						/>
					</div>
					<div>
						<Textarea
							name="description"
							placeholder="Description (optional)"
							bind:value={newDescription}
							rows={3}
						/>
					</div>
					<Button type="submit" class="w-full">Create Todo</Button>
				</form>
			</CardContent>
		</Card>
	{/if}

	{#if todos.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<ListTodo class="text-muted-foreground mb-4 h-12 w-12" />
				<h3 class="mb-2 text-lg font-semibold">No todos yet</h3>
				{#if data.isLoggedIn}
					<p class="text-muted-foreground mb-4 text-sm">
						Get started by adding your first todo item
					</p>
					<button
						type="button"
						onclick={() => (showCreateForm = true)}
						class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
					>
						<Plus class="mr-2 h-4 w-4" />
						Create Todo
					</button>
				{:else}
					<p class="text-muted-foreground mb-4 text-sm">
						Please log in to create and manage your todos
					</p>
					<Button href="/login" variant="outline">Login to Get Started</Button>
				{/if}
			</CardContent>
		</Card>
	{:else}
		<div class="space-y-4">
			{#each todos as todo (todo.id)}
				<Card>
					<CardHeader>
						<div class="flex items-start gap-4">
							<form method="POST" action="?/toggleComplete" use:enhance>
								<input type="hidden" name="id" value={todo.id} />
								<input type="hidden" name="completed" value={todo.completed} />
								<button type="submit" class="cursor-pointer">
									{#if todo.completed}
										<CircleCheck
											class="mt-1 h-5 w-5 text-green-500 transition-colors hover:text-green-600"
										/>
									{:else}
										<Circle
											class="text-muted-foreground hover:text-primary mt-1 h-5 w-5 transition-colors"
										/>
									{/if}
								</button>
							</form>
							<div class="flex-1">
								{#if editingTodoId === todo.id}
									<!-- Edit Form -->
									<form
										method="POST"
										action="?/updateTodo"
										use:enhance={() => {
											return async ({ result, update }) => {
												if (result.type === 'success') {
													cancelEdit();
												}
												await update();
											};
										}}
										class="space-y-3"
									>
										<input type="hidden" name="id" value={todo.id} />
										<Input
											type="text"
											name="title"
											bind:value={editTitle}
											placeholder="Title"
											required
										/>
										<Textarea
											name="description"
											bind:value={editDescription}
											placeholder="Description (optional)"
											rows={2}
										/>
										<div class="flex gap-2">
											<Button type="submit" size="sm">Save</Button>
											<button
												type="button"
												onclick={cancelEdit}
												class="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
											>
												Cancel
											</button>
										</div>
									</form>
								{:else}
									<!-- Display Mode -->
									<CardTitle class={todo.completed ? 'line-through opacity-60' : ''}>
										{todo.title}
									</CardTitle>
									{#if todo.description}
										<p class="text-muted-foreground mt-2 text-sm">
											{todo.description}
										</p>
									{/if}
								{/if}
							</div>
							{#if data.isLoggedIn && editingTodoId !== todo.id}
								<div class="flex gap-2">
									<button
										type="button"
										onclick={() => startEdit(todo)}
										class="text-muted-foreground hover:text-primary cursor-pointer transition-colors"
										title="Edit todo"
									>
										<Pencil class="h-4 w-4" />
									</button>
									<form method="POST" action="?/deleteTodo" use:enhance>
										<input type="hidden" name="id" value={todo.id} />
										<button
											type="submit"
											class="text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
											title="Delete todo"
										>
											<Trash2 class="h-4 w-4" />
										</button>
									</form>
								</div>
							{/if}
						</div>
					</CardHeader>
				</Card>
			{/each}
		</div>
	{/if}

	<div class="text-muted-foreground mt-8 text-center text-sm">
		<p>
			You can also manage your todos in the <a
				href={resolve('/admin')}
				class="font-medium underline">admin panel</a
			>
		</p>
	</div>
</div>
