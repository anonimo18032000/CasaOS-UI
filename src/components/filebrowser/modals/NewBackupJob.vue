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

		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<b-field :label="$t('Name')" class="mb-5" horizontal>
				<b-input v-model="name" :placeholder="$t('eg : My Server')" expanded name="name" />
			</b-field>
			<b-field :label="$t('Source folder')" class="mb-5" horizontal>
				<b-input v-model="sourcePath" placeholder="/DATA" expanded name="sourcePath" />
			</b-field>
			<b-field :label="$t('Destination')" class="mb-5" horizontal>
				<b-select v-model="remoteName" expanded>
					<option v-for="remote in remotes" :key="remote.id" :value="remote.id">
						{{ remote.name || remote.id }}
					</option>
				</b-select>
			</b-field>
			<b-field :label="$t('Remote folder')" class="mb-5" horizontal>
				<b-input v-model="remotePath" :placeholder="$t('eg : / or /var')" expanded name="remotePath" />
			</b-field>
			<b-field :label="$t('Schedule')" class="mb-5" horizontal>
				<b-select v-model="schedule" expanded>
					<option value="0 2 * * *">{{ $t('Daily at 2am') }}</option>
					<option value="0 */6 * * *">{{ $t('Every 6 hours') }}</option>
					<option value="0 2 * * 0">{{ $t('Weekly (Sunday at 2am)') }}</option>
					<option value="custom">{{ $t('Custom cron expression') }}</option>
				</b-select>
			</b-field>
			<b-field v-if="schedule === 'custom' || isCustomSchedule" class="mb-5" horizontal>
				<b-input v-model="customSchedule" placeholder="0 2 * * *" expanded name="customSchedule" />
			</b-field>

			<div class="field is-flex">
				<label class="label is-flex-grow-1">{{ $t('Enabled') }}</label>
				<b-switch v-model="enabled" type="is-dark" />
			</div>
		</section>
		<!-- Modal-Card Body End -->
		<!-- Modal-Card Footer Start-->
		<footer class="modal-card-foot is-flex is-align-items-center">
			<div class="is-flex-grow-1" />
			<div>
				<b-button :label="$t('Save')" :loading="isSaving" expaned rounded type="is-primary" @click="submit" />
			</div>
		</footer>
		<!-- Modal-Card Footer End -->
	</div>
</template>

<script>
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
			name: this.editItem?.name || '',
			sourcePath: this.editItem?.source_path || '',
			remoteName: this.editItem?.remote_name || '',
			remotePath: this.editItem?.remote_path || '/',
			schedule: presetOrCustom,
			customSchedule: presetOrCustom === 'custom' ? this.editItem.schedule : '',
			enabled: this.editItem ? this.editItem.enabled : true,
			remotes: [],
			isSaving: false,
		}
	},
	computed: {
		isEdit() {
			return !!this.editItem
		},
		isCustomSchedule() {
			return this.schedule === 'custom'
		},
	},
	created() {
		this.loadRemotes()
	},
	methods: {
		loadRemotes() {
			this.$api.cloud.health().then((res) => {
				this.remotes = res.data.data || []
				if (!this.remoteName && this.remotes.length > 0) {
					this.remoteName = this.remotes[0].id
				}
			}).catch(() => {})
		},
		submit() {
			if (!this.name || !this.sourcePath || !this.remoteName) {
				this.$buefy.toast.open({ message: this.$t('Name, source folder and destination are required.'), type: 'is-danger' })
				return
			}
			const schedule = this.schedule === 'custom' ? this.customSchedule : this.schedule
			if (!schedule) {
				this.$buefy.toast.open({ message: this.$t('Schedule cannot be empty.'), type: 'is-danger' })
				return
			}

			const data = {
				name: this.name,
				source_path: this.sourcePath,
				remote_name: this.remoteName,
				remote_path: this.remotePath || '/',
				schedule,
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
</style>
