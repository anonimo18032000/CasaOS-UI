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
				</div>
				<b-button :loading="runningId === job.id" class="ml-2" rounded size="is-small" @click="runNow(job)">
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

export default {
	data() {
		return {
			isLoading: false,
			jobs: [],
			runningId: '',
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
		// The backend starts the copy in the background and responds right away - it doesn't wait
		// for a (possibly hours-long) backup to finish. So a successful response here only means
		// the job started, not that it's done; pollUntilFinished watches last_run to find out when
		// it actually completes.
		runNow(job) {
			this.runningId = job.id
			const lastRunBeforeStart = job.last_run
			this.$api.backup.runNow(job.id).then(() => {
				this.$buefy.toast.open({ message: this.$t('Backup started'), type: 'is-info' })
				this.pollUntilFinished(job.id, lastRunBeforeStart)
			}).catch((err) => {
				this.runningId = ''
				this.$buefy.toast.open({
					message: err.response?.data?.message || err.message,
					type: 'is-danger',
				})
			})
		},
		pollUntilFinished(id, lastRunBeforeStart, attemptsLeft = 200) {
			clearTimeout(this.pollTimer)
			this.pollTimer = setTimeout(() => {
				this.$api.backup.list().then((res) => {
					this.jobs = res.data.data || []
					const job = this.jobs.find(j => j.id === id)

					if (!job || job.last_run !== lastRunBeforeStart) {
						this.runningId = ''
						if (job) {
							this.$buefy.toast.open({
								message: job.last_status === 'error'
									? (job.last_error || this.$t('Backup failed'))
									: this.$t('Backup completed'),
								type: job.last_status === 'error' ? 'is-danger' : 'is-success',
							})
						}
						return
					}

					if (attemptsLeft <= 1) {
						// Give up watching after ~10 minutes; the job is presumably still running -
						// the status icon will simply show "in progress" until the next manual refresh.
						this.runningId = ''
						return
					}
					this.pollUntilFinished(id, lastRunBeforeStart, attemptsLeft - 1)
				}).catch(() => {
					this.runningId = ''
				})
			}, 3000)
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
