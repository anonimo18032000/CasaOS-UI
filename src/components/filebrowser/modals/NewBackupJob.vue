<template>
	<div class="modal-card">
		<!-- Modal-Card Header Start -->
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ isEdit ? $t('Edit backup job') : $t('New backup job') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>
		<!-- Modal-Card Header End -->

		<!-- Step indicator -->
		<ol class="wizard-steps">
			<li v-for="(label, i) in stepLabels" :key="label" :class="{ active: i === step, done: i < step }"
				@click="goToStep(i)">
				<span class="dot">{{ i < step ? '✓' : i + 1 }}</span>
				<span class="label">{{ label }}</span>
			</li>
		</ol>

		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<!-- Step 1: what to back up -->
			<template v-if="step === 0">
				<b-field :label="$t('Name')" class="mb-4">
					<b-input v-model="name" :placeholder="$t('eg : My Server')" expanded name="name" />
				</b-field>
				<b-field :label="$t('Source folder')" class="mb-2">
					<b-input v-model="sourcePath" expanded name="sourcePath" placeholder="/DATA" @input="sizeBytes = null" />
				</b-field>

				<div class="folder-picker mb-3">
					<div class="picker-head is-size-7 has-text-grey">
						<a v-if="browsePath !== '/'" @click.prevent="browseUp">&larr; {{ $t('Up') }}</a>
						<span class="ml-2">{{ browsePath }}</span>
						<a class="ml-2" @click.prevent="useBrowsed">{{ $t('Use this folder') }}</a>
					</div>
					<b-loading v-model="browseLoading" :is-full-page="false" />
					<ul>
						<li v-for="dir in browseDirs" :key="dir.path" @click="browse(dir.path)">
							<b-icon icon="folder-outline" size="is-small" />
							{{ dir.name }}
						</li>
						<li v-if="!browseLoading && browseDirs.length === 0" class="has-text-grey">
							{{ $t('No subfolders') }}
						</li>
					</ul>
				</div>

				<div class="is-flex is-align-items-center">
					<b-button :disabled="!sourcePath" :loading="sizeLoading" rounded size="is-small" @click="estimateSize">
						{{ $t('Estimate size') }}
					</b-button>
					<span v-if="sizeBytes !== null" class="ml-3">{{ $t('About') }} <b>{{ formatSize(sizeBytes) }}</b> {{ $t('to copy') }}</span>
				</div>
			</template>

			<!-- Step 2: where to -->
			<template v-else-if="step === 1">
				<p v-if="remotes.length === 0" class="has-text-grey mb-4">
					{{ $t('Connect a network or cloud storage first (Location > +), then come back to create the backup.') }}
				</p>
				<b-field :label="$t('Destination')" class="mb-4">
					<b-select v-model="remoteName" expanded>
						<option v-for="remote in remotes" :key="remote.id" :value="remote.id">
							{{ remote.name || remote.id }}{{ remote.healthy === false ? ' (' + $t('Unreachable') + ')' : '' }}
						</option>
					</b-select>
				</b-field>
				<b-field :label="$t('Remote folder')" class="mb-2">
					<b-input v-model="remotePath" :placeholder="$t('eg : / or /var')" expanded name="remotePath" />
				</b-field>
			</template>

			<!-- Step 3: when -->
			<template v-else-if="step === 2">
				<b-field :label="$t('Schedule')" class="mb-4">
					<b-select v-model="schedule" expanded>
						<option value="0 2 * * *">{{ $t('Daily at 2am') }}</option>
						<option value="0 */6 * * *">{{ $t('Every 6 hours') }}</option>
						<option value="0 2 * * 0">{{ $t('Weekly (Sunday at 2am)') }}</option>
						<option value="custom">{{ $t('Custom cron expression') }}</option>
					</b-select>
				</b-field>
				<b-field v-if="schedule === 'custom'" class="mb-4">
					<b-input v-model="customSchedule" expanded name="customSchedule" placeholder="0 2 * * *" />
				</b-field>
				<div class="field is-flex">
					<label class="label is-flex-grow-1">{{ $t('Enabled') }}</label>
					<b-switch v-model="enabled" type="is-dark" />
				</div>
			</template>

			<!-- Step 4: review -->
			<template v-else>
				<table class="review">
					<tr><th>{{ $t('Name') }}</th><td>{{ name }}</td></tr>
					<tr><th>{{ $t('Source folder') }}</th><td>{{ sourcePath }}</td></tr>
					<tr v-if="sizeBytes !== null"><th>{{ $t('Size') }}</th><td>{{ formatSize(sizeBytes) }}</td></tr>
					<tr><th>{{ $t('Destination') }}</th><td>{{ remoteLabel }}:{{ remotePath || '/' }}</td></tr>
					<tr><th>{{ $t('Schedule') }}</th><td>{{ scheduleLabel }}</td></tr>
					<tr><th>{{ $t('Enabled') }}</th><td>{{ enabled ? $t('Yes') : $t('No') }}</td></tr>
				</table>
				<p class="is-size-7 has-text-grey mt-3">
					{{ $t('Files are only added or updated at the destination. Nothing is ever deleted there.') }}
				</p>
			</template>
		</section>
		<!-- Modal-Card Body End -->

		<!-- Modal-Card Footer Start-->
		<footer class="modal-card-foot is-flex is-align-items-center">
			<b-button v-if="step > 0" :label="$t('Back')" rounded @click="step--" />
			<div class="is-flex-grow-1" />
			<b-button v-if="step < lastStep" :label="$t('Next')" rounded type="is-primary" @click="next" />
			<b-button v-else :label="$t('Save')" :loading="isSaving" rounded type="is-primary" @click="submit" />
		</footer>
		<!-- Modal-Card Footer End -->
	</div>
</template>

<script>
import { renderSize } from '@/mixins/file_utils'

const PRESET_SCHEDULES = ['0 2 * * *', '0 */6 * * *', '0 2 * * 0']

export default {
	props: {
		editItem: {
			type: Object,
			default: null,
		},
	},
	data() {
		const presetOrCustom = this.editItem && !PRESET_SCHEDULES.includes(this.editItem.schedule)
			? 'custom'
			: (this.editItem?.schedule || '0 2 * * *')
		return {
			step: 0,
			lastStep: 3,
			name: this.editItem?.name || '',
			sourcePath: this.editItem?.source_path || '',
			remoteName: this.editItem?.remote_name || '',
			remotePath: this.editItem?.remote_path || '/',
			schedule: presetOrCustom,
			customSchedule: presetOrCustom === 'custom' ? this.editItem.schedule : '',
			enabled: this.editItem ? this.editItem.enabled : true,
			remotes: [],
			isSaving: false,
			// size estimate
			sizeBytes: null,
			sizeLoading: false,
			// folder picker
			browsePath: '/DATA',
			browseDirs: [],
			browseLoading: false,
		}
	},
	computed: {
		isEdit() {
			return !!this.editItem
		},
		stepLabels() {
			return [this.$t('What'), this.$t('Where'), this.$t('When'), this.$t('Review')]
		},
		effectiveSchedule() {
			return this.schedule === 'custom' ? this.customSchedule.trim() : this.schedule
		},
		scheduleLabel() {
			const labels = {
				'0 2 * * *': this.$t('Daily at 2am'),
				'0 */6 * * *': this.$t('Every 6 hours'),
				'0 2 * * 0': this.$t('Weekly (Sunday at 2am)'),
			}
			return labels[this.effectiveSchedule] || this.effectiveSchedule
		},
		remoteLabel() {
			const remote = this.remotes.find(r => r.id === this.remoteName)
			return remote ? (remote.name || remote.id) : this.remoteName
		},
	},
	created() {
		this.loadRemotes()
		const start = this.sourcePath && this.sourcePath.startsWith('/') ? this.sourcePath : '/DATA'
		this.browse(start)
	},
	methods: {
		formatSize(bytes) {
			return renderSize(bytes)
		},
		loadRemotes() {
			this.$api.cloud.health().then((res) => {
				this.remotes = res.data.data || []
				if (!this.remoteName && this.remotes.length > 0) {
					this.remoteName = this.remotes[0].id
				}
			}).catch(() => {})
		},
		browse(path) {
			this.browseLoading = true
			this.$api.folder.getList(path).then((res) => {
				this.browseLoading = false
				this.browsePath = path
				const content = res.data.data?.content || []
				this.browseDirs = content.filter(i => i.is_dir && !i.name.startsWith('.'))
			}).catch(() => {
				this.browseLoading = false
			})
		},
		browseUp() {
			const parent = this.browsePath.replace(/\/[^/]+\/?$/, '') || '/'
			this.browse(parent)
		},
		useBrowsed() {
			this.sourcePath = this.browsePath
			this.sizeBytes = null
		},
		estimateSize() {
			this.sizeLoading = true
			this.$api.folder.getFolderSize(this.sourcePath).then((res) => {
				this.sizeLoading = false
				this.sizeBytes = Number(res.data.data) || 0
			}).catch((err) => {
				this.sizeLoading = false
				this.$buefy.toast.open({ message: err.response?.data?.message || err.message, type: 'is-danger' })
			})
		},
		// Validate the step being left; returns an error message or ''.
		validateStep(step) {
			if (step === 0 && (!this.name.trim() || !this.sourcePath.trim())) {
				return this.$t('Name and source folder are required.')
			}
			if (step === 1 && !this.remoteName) {
				return this.$t('Choose a destination.')
			}
			if (step === 2 && !this.effectiveSchedule) {
				return this.$t('Schedule cannot be empty.')
			}
			return ''
		},
		next() {
			const problem = this.validateStep(this.step)
			if (problem) {
				this.$buefy.toast.open({ message: problem, type: 'is-danger' })
				return
			}
			this.step++
		},
		goToStep(target) {
			// only backwards freely; forwards through Next so each step is validated
			if (target < this.step) {
				this.step = target
			}
		},
		submit() {
			for (let s = 0; s < this.lastStep; s++) {
				const problem = this.validateStep(s)
				if (problem) {
					this.step = s
					this.$buefy.toast.open({ message: problem, type: 'is-danger' })
					return
				}
			}

			const data = {
				name: this.name.trim(),
				source_path: this.sourcePath.trim(),
				remote_name: this.remoteName,
				remote_path: this.remotePath || '/',
				schedule: this.effectiveSchedule,
				enabled: this.enabled,
			}

			this.isSaving = true
			const request = this.isEdit
				? this.$api.backup.edit(this.editItem.id, data)
				: this.$api.backup.create(data)

			request.then(() => {
				this.isSaving = false
				this.$buefy.toast.open({ message: this.$t('Backup job saved'), type: 'is-success' })
				this.$emit('close')
				this.$emit('saved')
			}).catch((err) => {
				this.isSaving = false
				this.$buefy.toast.open({
					message: err.response?.data?.message || err.message,
					type: 'is-danger',
				})
			})
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 40rem;
}

.wizard-steps {
	display: flex;
	list-style: none;
	margin: 0;
	padding: 0.75rem 1.5rem 0;
	gap: 0.5rem;

	li {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		opacity: 0.5;
		font-size: 0.8rem;

		&.active, &.done {
			opacity: 1;
		}

		&.done {
			cursor: pointer;
		}

		.dot {
			width: 1.5rem;
			height: 1.5rem;
			border-radius: 50%;
			border: 1px solid currentColor;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		&.active .dot {
			background: #2f6bff;
			border-color: #2f6bff;
			color: #fff;
		}
	}
}

.folder-picker {
	position: relative;
	border: 1px solid rgba(127, 127, 127, 0.3);
	border-radius: 8px;
	padding: 0.5rem;
	max-height: 10rem;
	overflow-y: auto;
	min-height: 4rem;

	ul li {
		cursor: pointer;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;

		&:hover {
			background: rgba(127, 127, 127, 0.12);
		}
	}
}

.review {
	width: 100%;

	th {
		text-align: left;
		width: 9rem;
		padding: 0.3rem 0;
		font-weight: 600;
		vertical-align: top;
	}

	td {
		padding: 0.3rem 0;
		word-break: break-all;
	}
}
</style>
