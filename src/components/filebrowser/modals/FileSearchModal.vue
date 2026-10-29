<template>
	<div class="modal-card">
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Search files') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>

		<section class="modal-card-body">
			<form @submit.prevent="search">
				<b-field>
					<b-input ref="query" v-model="query" :placeholder="$t('Name contains...')" expanded icon="magnify"
						name="query" />
					<p class="control">
						<b-button :loading="isLoading" native-type="submit" type="is-primary">{{ $t('Search') }}</b-button>
					</p>
				</b-field>

				<div class="filters">
					<b-field :label="$t('Type')" label-position="on-border">
						<b-select v-model="type" size="is-small">
							<option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
						</b-select>
					</b-field>
					<b-field :label="$t('Larger than (MB)')" label-position="on-border">
						<b-input v-model="minMb" min="0" size="is-small" type="number" />
					</b-field>
					<b-field :label="$t('Smaller than (MB)')" label-position="on-border">
						<b-input v-model="maxMb" min="0" size="is-small" type="number" />
					</b-field>
					<b-field :label="$t('Modified after')" label-position="on-border">
						<b-input v-model="fromDate" size="is-small" type="date" />
					</b-field>
					<b-field :label="$t('Modified before')" label-position="on-border">
						<b-input v-model="toDate" size="is-small" type="date" />
					</b-field>
				</div>
				<p class="is-size-7 has-text-grey mb-3">{{ $t('Searching in') }} <b>{{ path }}</b></p>
			</form>

			<b-notification v-if="error" :closable="false" class="is-size-7" type="is-danger is-light">{{ error }}</b-notification>

			<template v-if="searched">
				<p class="is-size-7 has-text-grey mb-2">
					{{ $t('{n} results', { n: results.length }) }}
					<span v-if="partial"> &mdash; {{ $t('showing the first matches only; narrow the search to see more') }}</span>
				</p>
				<ul class="results">
					<li v-for="r in results" :key="r.path" @click="openResult(r)">
						<b-icon :icon="r.is_dir ? 'folder-outline' : 'file-outline'" size="is-small" />
						<div class="info">
							<div class="nm one-line">{{ r.name }}</div>
							<div class="where is-size-7 has-text-grey one-line">{{ parent(r.path) }}</div>
						</div>
						<div class="meta is-size-7 has-text-grey">
							<div v-if="!r.is_dir">{{ formatSize(r.size) }}</div>
							<div>{{ formatDate(r.modified) }}</div>
						</div>
					</li>
				</ul>
				<p v-if="!results.length && !error" class="has-text-grey">{{ $t('No files found') }}</p>
			</template>
		</section>
	</div>
</template>

<script>
import { renderSize } from '@/mixins/file_utils'
import events from '@/events/events'

export default {
	props: {
		path: { type: String, default: '/DATA' },
	},
	data() {
		return {
			query: '',
			type: 'any',
			minMb: '',
			maxMb: '',
			fromDate: '',
			toDate: '',
			isLoading: false,
			searched: false,
			results: [],
			partial: false,
			error: '',
			requestId: 0,
		}
	},
	computed: {
		types() {
			return [
				{ value: 'any', label: this.$t('Any') },
				{ value: 'folder', label: this.$t('Folders') },
				{ value: 'image', label: this.$t('Images') },
				{ value: 'video', label: this.$t('Videos') },
				{ value: 'audio', label: this.$t('Audio') },
				{ value: 'doc', label: this.$t('Documents') },
				{ value: 'archive', label: this.$t('Archives') },
				{ value: 'code', label: this.$t('Code') },
			]
		},
	},
	mounted() {
		this.$nextTick(() => this.$refs.query && this.$refs.query.focus())
	},
	methods: {
		formatSize(bytes) {
			return renderSize(bytes)
		},
		formatDate(unix) {
			return new Date(unix * 1000).toLocaleDateString()
		},
		parent(path) {
			return path.substring(0, path.lastIndexOf('/')) || '/'
		},
		buildParams() {
			const params = { path: this.path }
			if (this.query.trim()) {
				params.q = this.query.trim()
			}
			if (this.type !== 'any') {
				params.type = this.type
			}
			if (this.minMb !== '' && Number(this.minMb) >= 0) {
				params.min_size = Math.round(Number(this.minMb) * 1024 * 1024)
			}
			if (this.maxMb !== '' && Number(this.maxMb) >= 0) {
				params.max_size = Math.round(Number(this.maxMb) * 1024 * 1024)
			}
			if (this.fromDate) {
				params.from = Math.floor(new Date(`${this.fromDate}T00:00:00`).getTime() / 1000)
			}
			if (this.toDate) {
				params.to = Math.floor(new Date(`${this.toDate}T23:59:59`).getTime() / 1000)
			}
			return params
		},
		search() {
			const params = this.buildParams()
			if (Object.keys(params).length === 1) {
				this.error = this.$t('Type a name or choose a filter.')
				return
			}
			const id = ++this.requestId
			this.error = ''
			this.isLoading = true
			this.$api.file.search(params).then((res) => {
				if (id !== this.requestId) {
					return
				}
				this.isLoading = false
				this.searched = true
				this.results = res.data.data.items || []
				this.partial = !!res.data.data.partial
			}).catch((err) => {
				if (id !== this.requestId) {
					return
				}
				this.isLoading = false
				this.error = err.response?.data?.data || err.response?.data?.message || err.message
			})
		},
		// Folders open themselves; for a file, open the folder that contains it.
		openResult(result) {
			this.$EventBus.$emit(events.GOTO, { path: result.is_dir ? result.path : this.parent(result.path) })
			this.$emit('close')
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 44rem;
}

.filters {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
	gap: 0.9rem 0.6rem;
	margin: 0.9rem 0 0.6rem;
}

.results {
	max-height: 22rem;
	overflow-y: auto;

	li {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem;
		border-radius: 6px;
		cursor: pointer;

		&:hover {
			background: rgba(127, 127, 127, 0.12);
		}

		.info {
			flex: 1;
			min-width: 0;
		}

		.meta {
			text-align: right;
			flex-shrink: 0;
		}
	}
}
</style>
