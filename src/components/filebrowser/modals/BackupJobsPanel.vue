<template>
	<div class="modal-card">
		<!-- Modal-Card Header Start -->
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Scheduled backups') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>
		<!-- Modal-Card Header End -->

		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<b-loading v-model="isLoading" :is-full-page="false" />

			<p v-if="!isLoading && jobs.length === 0" class="has-text-grey">
				{{ $t('No backup jobs configured') }}
			</p>

			<div v-for="job in jobs" :key="job.id" class="backup-row is-flex is-align-items-center mb-4">
				<b-icon
					:class="statusClass(job)"
					:icon="statusIcon(job)"
					class="mr-2"
					custom-size="casa-20px"
					pack="casa"
				/>
				<div class="is-flex-grow-1 one-line">
					<div class="has-text-weight-bold">
						{{ job.name }}
						<span v-if="!job.enabled" class="has-text-grey is-size-7">({{ $t('Disabled') }})</span>
					</div>
					<div class="is-size-7 has-text-grey">
						{{ job.source_path }} &rarr; {{ job.remote_name }}:{{ job.remote_path }}
					</div>
					<div class="is-size-7 has-text-grey">
						{{ job.last_run ? $t('Last run: {date}', { date: formatDate(job.last_run) }) : $t('Never run yet') }}
					</div>
					<div v-if="job.last_status === 'error'" class="is-size-7 has-text-danger">{{ job.last_error }}</div>
					<div v-if="progress[job.id]" class="mt-2">
						<b-progress :max="100" :value="percent(progress[job.id])" size="is-small" type="is-info" />
						<div class="is-size-7 has-text-grey">{{ progressText(progress[job.id]) }}</div>
					</div>
				</div>
				<b-button :disabled="!!progress[job.id]" :loading="!!progress[job.id]" class="ml-2" rounded size="is-small" @click="runNow(job)">
					{{ $t('Run now') }}
				</b-button>
				<b-button class="ml-2" rounded size="is-small" @click="editJob(job)">
					{{ $t('Edit') }}
				</b-button>
				<b-button class="ml-2" rounded size="is-small" type="is-danger is-light" @click="deleteJob(job)">
					{{ $t('Delete') }}
				</b-button>
			</div>
		</section>
		<!-- Modal-Card Body End -->
		<!-- Modal-Card Footer Start-->
		<footer class="modal-card-foot is-flex is-align-items-center">
			<div class="is-flex-grow-1" />
			<div>
				<b-button :label="$t('New backup job')" rounded type="is-primary" @click="newJob" />
			</div>
		</footer>
		<!-- Modal-Card Footer End -->
	</div>
</template>

<script>
import NewBackupJob from './NewBackupJob.vue'
import { renderSize } from '@/mixins/file_utils'

export default {
	data() {
		return {
			isLoading: false,
			jobs: [],
			progress: {}, // job id -> live progress, only for jobs that are running right now
			pollTimer: null,
		}
	},
	created() {
		this.loadJobs()
	},
	beforeDestroy() {
		clearTimeout(this.pollTimer)
	},
	methods: {
		loadJobs() {
			this.isLoading = true
			this.$api.backup.list().then((res) => {
				this.isLoading = false
				this.jobs = res.data.data || []
				this.pollProgress()
			}).catch(() => {
				this.isLoading = false
			})
		},
		statusIcon(job) {
			if (job.last_status === 'error')
				return 'danger-outline'
			if (job.last_status === 'success')
				return 'checkmark-circle-outline'
			return 'time-outline'
		},
		statusClass(job) {
			if (job.last_status === 'error')
				return 'has-text-danger'
			if (job.last_status === 'success')
				return 'has-text-success'
			return 'has-text-grey'
		},
		formatDate(iso) {
			return new Date(iso).toLocaleString()
		},
		// The backend starts the copy in the background and answers right away, so "started" is all
		// a successful response means. pollProgress then follows the run until it ends; the toast
		// with the result comes from the global backup notification (App.vue), not from here.
		runNow(job) {
			this.$api.backup.runNow(job.id).then(() => {
				this.$buefy.toast.open({ message: this.$t('Backup started'), type: 'is-info' })
				this.$set(this.progress, job.id, { running: true })
				this.pollProgress()
			}).catch((err) => {
				this.$buefy.toast.open({
					message: err.response?.data?.message || err.message,
					type: 'is-danger',
				})
			})
		},
		// Asks the backend how every job is doing; keeps going every 2s while at least one runs, and
		// reloads the list when the last one finishes so the status icon and error text are fresh.
		pollProgress() {
			clearTimeout(this.pollTimer)
			const ids = this.jobs.map(j => j.id)
			if (ids.length === 0) {
				return
			}
			Promise.all(ids.map(id => this.$api.backup.progress(id).then(res => [id, res.data.data]).catch(() => [id, null])))
				.then((results) => {
					const next = {}
					results.forEach(([id, p]) => {
						if (p && p.running) {
							next[id] = p
						}
					})
					const wasRunning = Object.keys(this.progress).length > 0
					this.progress = next
					if (Object.keys(next).length > 0) {
						this.pollTimer = setTimeout(() => this.pollProgress(), 2000)
					}
					else if (wasRunning) {
						this.$api.backup.list().then((res) => {
							this.jobs = res.data.data || []
						})
					}
				})
		},
		percent(p) {
			const stats = p.stats
			if (!stats || !stats.totalBytes) {
				return 0
			}
			return Math.min(100, Math.round((stats.bytes / stats.totalBytes) * 100))
		},
		progressText(p) {
			const stats = p.stats
			if (!stats || (!stats.totalBytes && !stats.bytes)) {
				return this.$t('Preparing...')
			}
			const parts = [`${renderSize(stats.bytes)} / ${renderSize(stats.totalBytes)} (${this.percent(p)}%)`]
			if (stats.speed > 0) {
				parts.push(`${renderSize(stats.speed)}/s`)
			}
			if (stats.eta) {
				parts.push(`${this.$t('ETA')} ${this.formatEta(stats.eta)}`)
			}
			const current = stats.transferring && stats.transferring[0]
			if (current) {
				parts.push(current.name)
			}
			return parts.join(' · ')
		},
		formatEta(seconds) {
			if (seconds < 60) {
				return `${seconds}s`
			}
			if (seconds < 3600) {
				return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
			}
			return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
		},
		deleteJob(job) {
			this.$buefy.dialog.confirm({
				title: this.$t('Delete'),
				message: this.$t('Are you sure you want to delete this backup job?'),
				confirmText: this.$t('Delete'),
				cancelText: this.$t('Cancel'),
				type: 'is-danger',
				onConfirm: () => {
					this.$api.backup.delete(job.id).then(() => {
						this.$buefy.toast.open({ message: this.$t('Backup job deleted'), type: 'is-success' })
						this.loadJobs()
					})
				},
			})
		},
		newJob() {
			this.$buefy.modal.open({
				parent: this,
				component: NewBackupJob,
				hasModalCard: true,
				customClass: 'network-storage-modal',
				trapFocus: true,
				canCancel: [],
				scroll: 'keep',
				animation: 'zoom-in',
				events: {
					saved: () => this.loadJobs(),
				},
			})
		},
		editJob(job) {
			this.$buefy.modal.open({
				parent: this,
				component: NewBackupJob,
				hasModalCard: true,
				customClass: 'network-storage-modal',
				trapFocus: true,
				canCancel: [],
				scroll: 'keep',
				animation: 'zoom-in',
				props: {
					editItem: job,
				},
				events: {
					saved: () => this.loadJobs(),
				},
			})
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 44rem;
}
</style>
