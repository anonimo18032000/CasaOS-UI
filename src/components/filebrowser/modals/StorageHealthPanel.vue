<template>
	<div class="modal-card">
		<!-- Modal-Card Header Start -->
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Storage health') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>
		<!-- Modal-Card Header End -->

		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<b-loading v-model="isLoading" :is-full-page="false" />

			<p v-if="!isLoading && items.length === 0" class="has-text-grey">
				{{ $t('No network storages connected') }}
			</p>

			<div v-if="items.length" class="range-picker mb-4">
				<b-radio-button v-for="r in ranges" :key="r.minutes" v-model="minutes" :native-value="r.minutes"
					size="is-small" type="is-primary" @input="loadHistory">
					{{ r.label }}
				</b-radio-button>
			</div>

			<div v-for="item in items" :key="item.mount_point" class="storage-block mb-4">
			<div class="storage-row is-flex is-align-items-center">
				<b-icon
					:class="item.healthy ? 'has-text-success' : 'has-text-danger'"
					:icon="item.healthy ? 'checkmark-circle-outline' : 'danger-outline'"
					class="mr-2"
					custom-size="casa-20px"
					pack="casa"
				/>
				<div class="is-flex-grow-1 one-line">
					<div class="has-text-weight-bold">{{ item.name }}</div>
					<div class="is-size-7 has-text-grey">
						{{ item.mount_point }} &mdash;
						{{ item.healthy ? `${$t('Healthy')} (${item.latency_ms}ms)` : $t('Unreachable') }}
					</div>
					<div v-if="item.error" class="is-size-7 has-text-danger">{{ item.error }}</div>
				</div>
				<b-button v-if="item.type === 'sftp'" class="ml-2" rounded size="is-small" @click="editItem(item)">
					{{ $t('Edit') }}
				</b-button>
				<b-button
					:loading="reconnectingId === item.mount_point"
					class="ml-2"
					rounded
					size="is-small"
					@click="reconnect(item)"
				>
					{{ $t('Reconnect') }}
				</b-button>
			</div>
			<div class="chart-box mt-2">
				<latency-chart :minutes="minutes" :samples="history[item.mount_point] || []" />
				<div class="is-size-7 has-text-grey mt-1">{{ statsLine(history[item.mount_point]) }}</div>
			</div>
			</div>
		</section>
		<!-- Modal-Card Body End -->
	</div>
</template>

<script>
import NewSFTPStorage from './NewSFTPStorage.vue'
import LatencyChart from '@/components/basicComponents/LatencyChart.vue'
import events from '@/events/events'

export default {
	components: { LatencyChart },
	data() {
		return {
			isLoading: false,
			items: [],
			reconnectingId: '',
			history: {},
			minutes: 60,
			ranges: [
				{ minutes: 60, label: '1 h' },
				{ minutes: 360, label: '6 h' },
				{ minutes: 1440, label: '24 h' },
			],
		}
	},
	created() {
		this.loadHealth()
		this.$EventBus.$on(events.RELOAD_MOUNT_LIST, this.loadHealth)
	},
	beforeDestroy() {
		this.$EventBus.$off(events.RELOAD_MOUNT_LIST, this.loadHealth)
	},
	methods: {
		loadHealth() {
			this.isLoading = true
			this.$api.cloud.health().then((res) => {
				this.isLoading = false
				this.items = res.data.data || []
				this.loadHistory()
			}).catch(() => {
				this.isLoading = false
			})
		},
		loadHistory() {
			this.$api.cloud.healthHistory({ minutes: this.minutes }).then((res) => {
				this.history = res.data.data || {}
			}).catch(() => {})
		},
		// "avg 12 ms · max 40 ms · up 100%" for the samples in the chosen window
		statsLine(samples) {
			if (!samples || samples.length === 0) {
				return this.$t('No measurements yet')
			}
			const ok = samples.filter(s => s.ok)
			const up = Math.round((ok.length / samples.length) * 100)
			if (ok.length === 0) {
				return `${this.$t('Availability')} ${up}%`
			}
			const avg = Math.round(ok.reduce((sum, s) => sum + s.ms, 0) / ok.length)
			const max = Math.max(...ok.map(s => s.ms))
			return `${this.$t('Average')} ${avg} ms · ${this.$t('Peak')} ${max} ms · ${this.$t('Availability')} ${up}%`
		},
		reconnect(item) {
			this.reconnectingId = item.mount_point
			this.$api.cloud.reconnect({ mount_point: item.mount_point }).then(() => {
				this.reconnectingId = ''
				this.$EventBus.$emit(events.RELOAD_MOUNT_LIST)
				this.$buefy.toast.open({ message: this.$t('Connected successfully'), type: 'is-success' })
				this.loadHealth()
			}).catch((err) => {
				this.reconnectingId = ''
				this.$buefy.toast.open({
					message: err.response?.data?.message || err.message,
					type: 'is-danger',
				})
			})
		},
		editItem(item) {
			this.$buefy.modal.open({
				parent: this,
				component: NewSFTPStorage,
				hasModalCard: true,
				customClass: 'network-storage-modal',
				trapFocus: true,
				canCancel: [],
				scroll: 'keep',
				animation: 'zoom-in',
				props: {
					editItem: {
						id: item.id,
						name: item.name,
						host: item.host,
						port: item.port,
						username: item.username,
						remote_path: item.remote_path,
					},
				},
			})
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 40rem;
}

.range-picker {
	display: flex;
}
</style>
