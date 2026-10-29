<template>
	<div class="modal-card">
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Disk usage') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>

		<section class="modal-card-body">
			<!-- breadcrumb: click a level to go back to it -->
			<div class="crumbs is-size-7 mb-3">
				<template v-for="(p, i) in trail">
					<span v-if="i > 0" :key="'s' + i" class="sep">/</span>
					<a :key="p" :class="{ current: i === trail.length - 1 }" @click.prevent="goTo(i)">{{ crumbName(p) }}</a>
				</template>
				<span v-if="data" class="has-text-grey ml-3">{{ formatSize(data.total) }}</span>
			</div>

			<b-notification v-if="data && data.partial" :closable="false" class="is-size-7" type="is-warning is-light">
				{{ $t('This folder is large or slow, so the scan stopped early. Sizes below are a lower bound.') }}
			</b-notification>

			<div class="treemap-wrap">
				<b-loading v-model="isLoading" :is-full-page="false" />
				<div v-if="!isLoading && cells.length === 0" class="empty has-text-grey">
					{{ error || $t('Nothing to show here') }}
				</div>
				<div v-else class="treemap">
					<div v-for="cell in cells" :key="cell.path" :class="{ dir: cell.is_dir }" :style="cellStyle(cell)"
						:title="`${cell.name} — ${formatSize(cell.size)} (${share(cell)}%)`" class="cell"
						@click="open(cell)">
						<span v-if="cell.w > 14 && cell.h > 9" class="name">{{ cell.name }}</span>
						<span v-if="cell.w > 18 && cell.h > 18" class="size">{{ formatSize(cell.size) }}</span>
					</div>
				</div>
			</div>

			<!-- the same data as a list: readable on small screens and for tiny entries -->
			<ul v-if="data && data.items.length" class="usage-list mt-3">
				<li v-for="it in listItems" :key="it.path" @click="open(it)">
					<b-icon :icon="it.is_dir ? 'folder-outline' : 'file-outline'" size="is-small" />
					<span class="nm one-line">{{ it.name }}</span>
					<span class="bar"><i :style="{ width: share(it) + '%' }" /></span>
					<span class="sz">{{ formatSize(it.size) }}</span>
				</li>
				<li v-if="data.hidden" class="has-text-grey">
					{{ $t('{n} smaller entries', { n: data.hidden }) }} &mdash; {{ formatSize(data.hidden_size) }}
				</li>
			</ul>
		</section>

		<footer class="modal-card-foot is-flex is-align-items-center">
			<b-button :disabled="trail.length < 2" :label="$t('Up')" rounded @click="goTo(trail.length - 2)" />
			<div class="is-flex-grow-1" />
			<b-button :label="$t('Open in Files')" rounded type="is-primary" @click="openInFiles" />
		</footer>
	</div>
</template>

<script>
import { squarify } from '@/mixins/treemap'
import { renderSize } from '@/mixins/file_utils'
import events from '@/events/events'

const W = 160 // layout units; cells are positioned as percentages, so the real size doesn't matter
const H = 90

export default {
	props: {
		path: { type: String, default: '/DATA' },
	},
	data() {
		return {
			trail: [this.path],
			data: null,
			isLoading: false,
			error: '',
			requestId: 0,
		}
	},
	computed: {
		current() {
			return this.trail[this.trail.length - 1]
		},
		cells() {
			return this.data ? squarify(this.data.items, W, H) : []
		},
		listItems() {
			return this.data ? this.data.items.slice(0, 50) : []
		},
	},
	created() {
		this.load()
	},
	methods: {
		formatSize(bytes) {
			return renderSize(bytes)
		},
		crumbName(p) {
			return p === '/' ? '/' : p.split('/').pop() || p
		},
		share(cell) {
			return this.data && this.data.total ? Math.round((cell.size / this.data.total) * 1000) / 10 : 0
		},
		cellStyle(cell) {
			// hue follows the entry's share of the folder, so the big ones stand out
			const hue = 215 - Math.min(160, this.share(cell) * 3)
			return {
				left: `${(cell.x / W) * 100}%`,
				top: `${(cell.y / H) * 100}%`,
				width: `${(cell.w / W) * 100}%`,
				height: `${(cell.h / H) * 100}%`,
				background: `hsl(${hue}, 55%, ${cell.is_dir ? 42 : 55}%)`,
			}
		},
		load() {
			// a slow scan of a previous folder must not overwrite the one the user moved on to
			const id = ++this.requestId
			this.isLoading = true
			this.error = ''
			this.$api.folder.getUsage(this.current).then((res) => {
				if (id !== this.requestId) {
					return
				}
				this.isLoading = false
				this.data = res.data.data
			}).catch((err) => {
				if (id !== this.requestId) {
					return
				}
				this.isLoading = false
				this.data = null
				this.error = err.response?.data?.data || err.response?.data?.message || err.message
			})
		},
		open(item) {
			if (!item.is_dir) {
				return
			}
			this.trail.push(item.path)
			this.load()
		},
		goTo(index) {
			if (index === this.trail.length - 1) {
				return
			}
			this.trail = this.trail.slice(0, index + 1)
			this.load()
		},
		openInFiles() {
			this.$EventBus.$emit(events.GOTO, { path: this.current })
			this.$emit('close')
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 46rem;
}

.crumbs {
	a {
		cursor: pointer;

		&.current {
			font-weight: 700;
			cursor: default;
		}
	}

	.sep {
		margin: 0 0.3rem;
		opacity: 0.5;
	}
}

.treemap-wrap {
	position: relative;
	min-height: 6rem;
}

.treemap {
	position: relative;
	width: 100%;
	aspect-ratio: 16 / 9;
	border-radius: 8px;
	overflow: hidden;
	background: rgba(127, 127, 127, 0.15);

	.cell {
		position: absolute;
		box-sizing: border-box;
		border: 1px solid rgba(255, 255, 255, 0.55);
		padding: 0.2rem 0.3rem;
		overflow: hidden;
		color: #fff;
		display: flex;
		flex-direction: column;
		font-size: 0.7rem;
		line-height: 1.15;
		text-shadow: 0 1px 1px rgba(0, 0, 0, 0.35);

		&.dir {
			cursor: pointer;
		}

		&.dir:hover {
			filter: brightness(1.15);
		}

		.name {
			font-weight: 600;
			word-break: break-all;
		}

		.size {
			opacity: 0.85;
		}
	}
}

.empty {
	padding: 2rem 0;
	text-align: center;
}

.usage-list {
	li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.3rem;
		border-radius: 4px;

		&:hover {
			background: rgba(127, 127, 127, 0.1);
		}

		.nm {
			flex: 1;
			min-width: 0;
		}

		.bar {
			width: 25%;
			height: 6px;
			border-radius: 3px;
			background: rgba(127, 127, 127, 0.2);
			overflow: hidden;
			flex-shrink: 0;

			i {
				display: block;
				height: 100%;
				background: #2f6bff;
			}
		}

		.sz {
			width: 5.5rem;
			text-align: right;
			flex-shrink: 0;
		}
	}
}
</style>
