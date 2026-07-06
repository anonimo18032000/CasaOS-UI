<template>
	<div class="modal-card">
		<!-- Modal-Card Header Start -->
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Configure HTTPS') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>
		<!-- Modal-Card Header End -->
		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<b-field class="has-text-light is-flex is-align-items-center is-justify-content-space-between">
				<span>{{ $t('Enable HTTPS') }}</span>
				<b-switch v-model="enabled" :disabled="isLoading" @input="onToggle" />
			</b-field>

			<template v-if="enabled && status.domain && !configuring">
				<p class="has-text-grey mb-2">
					{{ $t('HTTPS is active for {domain} on port {port}', { domain: status.domain, port: status.port }) }}
				</p>
				<b-button rounded size="is-small" @click="configuring = true">
					{{ $t('Change certificate') }}
				</b-button>
			</template>

			<template v-if="configuring">
				<b-field>
					<b-radio-button v-model="mode" native-value="generate" type="is-primary">
						{{ $t('Generate certificate') }}
					</b-radio-button>
					<b-radio-button v-model="mode" native-value="upload" type="is-primary">
						{{ $t('Upload my own certificate') }}
					</b-radio-button>
				</b-field>

				<div v-if="mode === 'generate'" class="mt-3">
					<b-field :label="$t('Domain or IP')" :message="errors" :type="errorType">
						<b-input v-model="domain" :placeholder="$t('e.g. example.com')" @input="clearError" />
					</b-field>
				</div>

				<div v-else class="mt-3">
					<b-field :label="$t('Certificate file')">
						<b-upload v-model="certFile" expanded>
							<a class="button is-fullwidth">
								<b-icon icon="upload-outline" pack="casa" />
								<span>{{ certFile ? certFile.name : $t('Choose certificate file') }}</span>
							</a>
						</b-upload>
					</b-field>
					<b-field :label="$t('Private key file')" :message="errors" :type="errorType">
						<b-upload v-model="keyFile" expanded>
							<a class="button is-fullwidth">
								<b-icon icon="upload-outline" pack="casa" />
								<span>{{ keyFile ? keyFile.name : $t('Choose private key file') }}</span>
							</a>
						</b-upload>
					</b-field>
				</div>
			</template>
		</section>
		<!-- Modal-Card Body End -->
		<!-- Modal-Card Footer Start-->
		<footer class="modal-card-foot is-flex is-align-items-center">
			<div class="is-flex-grow-1" />
			<div>
				<b-button :label="$t('Cancel')" rounded @click="$emit('close')" />
				<b-button
					v-if="configuring"
					:label="mode === 'generate' ? $t('Generate & Enable') : $t('Upload & Enable')"
					:loading="isLoading"
					rounded
					type="is-primary"
					@click="submit"
				/>
			</div>
		</footer>
		<!-- Modal-Card Footer End -->
	</div>
</template>

<script>
export default {
	name: 'https-panel',
	data() {
		return {
			isLoading: false,
			enabled: false,
			configuring: false,
			mode: 'generate',
			domain: '',
			certFile: null,
			keyFile: null,
			errorType: '',
			errors: '',
			status: {
				domain: '',
				port: '443',
			},
		}
	},
	mounted() {
		this.loadStatus()
	},
	methods: {
		loadStatus() {
			this.$api.sys.getHttpsStatus().then((res) => {
				const data = res.data.data
				this.enabled = data.enabled
				this.status = { domain: data.domain, port: data.port }
				this.domain = data.domain
				this.configuring = !data.enabled
			}).catch(() => {})
		},
		clearError() {
			this.errorType = ''
			this.errors = ''
		},
		onToggle(value) {
			if (value) {
				this.configuring = true
				return
			}
			this.isLoading = true
			this.$api.sys.disableHttps().then(() => {
				this.isLoading = false
				this.configuring = false
				this.$buefy.toast.open({ message: this.$t('HTTPS disabled'), type: 'is-success' })
			}).catch((err) => {
				this.isLoading = false
				this.enabled = true
				this.$buefy.toast.open({ message: err.response?.data?.message || err.message, type: 'is-danger' })
			})
		},
		submit() {
			if (this.mode === 'generate') {
				this.submitGenerate()
			}
			else {
				this.submitUpload()
			}
		},
		submitGenerate() {
			if (!this.domain) {
				this.errorType = 'is-danger'
				this.errors = this.$t('Domain is required')
				return
			}
			this.isLoading = true
			this.$api.sys.generateHttpsCertificate(this.domain).then(() => {
				this.isLoading = false
				this.enabled = true
				this.configuring = false
				this.$buefy.toast.open({ message: this.$t('HTTPS enabled'), type: 'is-success' })
				this.loadStatus()
			}).catch((err) => {
				this.isLoading = false
				this.errorType = 'is-danger'
				this.errors = err.response?.data?.message || err.message
			})
		},
		submitUpload() {
			if (!this.certFile || !this.keyFile) {
				this.errorType = 'is-danger'
				this.errors = this.$t('Both certificate and private key files are required')
				return
			}
			const formData = new FormData()
			formData.append('cert', this.certFile)
			formData.append('key', this.keyFile)

			this.isLoading = true
			this.$api.sys.uploadHttpsCertificate(formData).then(() => {
				this.isLoading = false
				this.enabled = true
				this.configuring = false
				this.$buefy.toast.open({ message: this.$t('HTTPS enabled'), type: 'is-success' })
				this.loadStatus()
			}).catch((err) => {
				this.isLoading = false
				this.errorType = 'is-danger'
				this.errors = err.response?.data?.message || err.message
			})
		},
	},
}
</script>
