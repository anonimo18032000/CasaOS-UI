<template>
	<div class="modal-card">
		<!-- Modal-Card Header Start -->
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ isEdit ? $t('Edit SFTP connection') : $t('Connect SFTP') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>
		<!-- Modal-Card Header End -->

		<!-- Modal-Card Body Start -->
		<section class="modal-card-body">
			<b-field :label="$t('Name')" class="mb-5" horizontal>
				<b-input v-model="name" :placeholder="$t('eg : My Server')" expanded name="name" />
			</b-field>
			<b-field :label="$t('Server Address')" class="mb-5" horizontal>
				<b-input v-model="host" :placeholder="$t('eg : 192.168.1.1')" expanded name="host" />
			</b-field>
			<b-field :label="$t('Port')" class="mb-5" horizontal>
				<b-input v-model="port" expanded name="port" placeholder="22" />
			</b-field>
			<b-field :label="$t('Username')" class="mb-5" horizontal>
				<b-input v-model="username" expanded name="username" />
			</b-field>
			<b-field :label="$t('Remote folder')" class="mb-5" horizontal>
				<b-input v-model="remotePath" :placeholder="$t('eg : / or /var')" expanded name="remotePath" />
			</b-field>
			<b-field :label="$t('Host key fingerprint')" class="mb-3" horizontal>
				<b-input v-model="hostKeyFingerprint" :placeholder="$t('SHA256:... (optional)')" expanded name="hostKeyFingerprint" />
			</b-field>

			<!-- The server presented a different key than the one pinned: a changed server, or someone in between -->
			<div v-if="mismatchPresented.length" class="notification is-danger is-light mb-5">
				<p class="has-text-weight-bold">{{ $t('The server identity does not match') }}</p>
				<p class="is-size-7 mb-2">
					{{ $t('Connecting could expose your password to someone else. Only continue if you know the server was reinstalled or its keys were changed.') }}
				</p>
				<p class="is-size-7">{{ $t('Expected') }}: <code class="fingerprint">{{ hostKeyFingerprint.trim() }}</code></p>
				<div v-for="fp in mismatchPresented" :key="fp" class="is-flex is-align-items-center mt-2">
					<span class="is-size-7 mr-2">{{ $t('Presented') }}:</span>
					<code class="fingerprint is-flex-grow-1">{{ fp }}</code>
					<b-button class="ml-2" rounded size="is-small" type="is-danger" @click="trustFingerprint(fp, true)">
						{{ $t('Trust the new key') }}
					</b-button>
				</div>
			</div>

			<!-- First contact: show what the server presents so it can be compared and trusted explicitly -->
			<div v-else-if="presentedFingerprints.length" class="notification is-light mb-5">
				<p class="has-text-weight-bold">{{ $t('Server identity') }}</p>
				<p class="is-size-7 mb-2">
					{{ $t('Compare these fingerprints with the ones shown by the server (ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub), then trust one to pin it.') }}
				</p>
				<div v-for="item in presentedFingerprints" :key="item.value" class="is-flex is-align-items-center mt-2">
					<code class="fingerprint is-flex-grow-1">{{ item.label }}</code>
					<b-tag v-if="item.value === hostKeyFingerprint.trim()" class="ml-2" type="is-success">{{ $t('Trusted') }}</b-tag>
					<b-button v-else class="ml-2" rounded size="is-small" @click="trustFingerprint(item.value, false)">
						{{ $t('Trust') }}
					</b-button>
				</div>
			</div>

			<b-field>
				<b-radio-button v-model="authMode" native-value="password" type="is-primary">
					{{ $t('Password') }}
				</b-radio-button>
				<b-radio-button v-model="authMode" native-value="key" type="is-primary">
					{{ $t('Private key') }}
				</b-radio-button>
			</b-field>

			<p v-if="isEdit" class="has-text-grey is-size-7 mb-3">
				{{ $t('Leave blank to keep the current password/key') }}
			</p>

			<b-field v-if="authMode === 'password'" :label="$t('Password')" class="mb-5 mt-3" horizontal>
				<b-input v-model="password" expanded name="password" type="password" />
			</b-field>
			<b-field v-else :label="$t('Private key file')" class="mb-5 mt-3" horizontal>
				<b-upload v-model="keyFile" expanded>
					<a class="button is-fullwidth">
						<b-icon icon="upload-outline" pack="casa" />
						<span>{{ keyFile ? keyFile.name : $t('Choose private key file') }}</span>
					</a>
				</b-upload>
			</b-field>
		</section>
		<!-- Modal-Card Body End -->
		<!-- Modal-Card Footer Start-->
		<footer class="modal-card-foot is-flex is-align-items-center">
			<b-button :label="$t('Test connection')" :loading="isTesting" rounded @click="testConnection" />
			<div class="is-flex-grow-1" />
			<div>
				<b-button
					:label="isEdit ? $t('Save') : $t('Connect')"
					:loading="isConnecting"
					expaned
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
import events from '@/events/events'

export default {
	props: {
		editItem: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			name: this.editItem?.name || '',
			host: this.editItem?.host || '',
			port: this.editItem?.port || '22',
			username: this.editItem?.username || '',
			remotePath: this.editItem?.remote_path || '/',
			hostKeyFingerprint: '',
			presentedFingerprints: [],
			mismatchPresented: [],
			authMode: 'password',
			password: '',
			keyFile: null,
			isConnecting: false,
			isTesting: false,
		}
	},
	computed: {
		isEdit() {
			return !!this.editItem
		},
	},
	methods: {
		readKeyFile(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result)
				reader.onerror = reject
				reader.readAsText(file)
			})
		},
		validate({ requireSecret }) {
			if (!this.host || !this.username) {
				this.$buefy.toast.open({ message: this.$t('Server address and username cannot be empty.'), type: 'is-danger' })
				return false
			}
			if (requireSecret) {
				if (this.authMode === 'password' && !this.password) {
					this.$buefy.toast.open({ message: this.$t('Password cannot be empty.'), type: 'is-danger' })
					return false
				}
				if (this.authMode === 'key' && !this.keyFile) {
					this.$buefy.toast.open({ message: this.$t('Please choose a private key file.'), type: 'is-danger' })
					return false
				}
			}
			return true
		},
		async buildCredentials(data) {
			if (this.authMode === 'password') {
				if (this.password) {
					data.password = this.password
				}
			}
			else if (this.keyFile) {
				data.private_key = await this.readKeyFile(this.keyFile)
			}
		},
		async testConnection() {
			if (!this.validate({ requireSecret: !this.isEdit })) {
				return
			}

			this.isTesting = true
			const data = {
				host: this.host,
				port: this.port || '22',
				username: this.username,
				remote_path: this.remotePath || '/',
				host_key_fingerprint: this.hostKeyFingerprint.trim(),
			}

			try {
				await this.buildCredentials(data)
				if (this.isEdit && !data.password && !data.private_key) {
					this.$buefy.toast.open({ message: this.$t('Enter the password or key to test the connection'), type: 'is-warning' })
					this.isTesting = false
					return
				}
				const res = await this.$api.cloud.testSftp(data)
				this.isTesting = false
				this.presentedFingerprints = (res.data?.data?.host_key_fingerprints || []).map(label => ({
					value: label.split(' ')[0],
					label,
				}))
				this.mismatchPresented = []
				this.$buefy.toast.open({ message: this.$t('Connection successful'), type: 'is-success' })
			}
			catch (err) {
				this.isTesting = false
				this.reportError(err)
			}
		},
		// Keeps the real error visible, and turns a host key mismatch into the warning box above.
		reportError(err) {
			const data = err.response?.data
			const text = [data?.message, typeof data?.data === 'string' ? data.data : '', err.message].join(' ')
			if (/fingerprint mismatch|host key/i.test(text) && /mismatch/i.test(text)) {
				const expected = this.hostKeyFingerprint.trim()
				const presented = (text.match(/SHA256:[A-Za-z0-9+/=]+/g) || []).filter(fp => fp !== expected)
				this.mismatchPresented = [...new Set(presented)]
			}
			this.$buefy.toast.open({
				message: data?.message || err.message,
				type: 'is-danger',
			})
		},
		trustFingerprint(fp, replacing) {
			const apply = () => {
				this.hostKeyFingerprint = fp
				this.mismatchPresented = []
				if (!this.presentedFingerprints.some(item => item.value === fp)) {
					this.presentedFingerprints = [{ value: fp, label: fp }, ...this.presentedFingerprints]
				}
			}
			if (!replacing) {
				apply()
				return
			}
			this.$buefy.dialog.confirm({
				title: this.$t('Trust the new key'),
				message: this.$t('Replace the pinned fingerprint with the one the server presents now?'),
				confirmText: this.$t('Trust the new key'),
				cancelText: this.$t('Cancel'),
				type: 'is-danger',
				onConfirm: apply,
			})
		},
		async submit() {
			if (this.isEdit) {
				await this.editConnection()
			}
			else {
				await this.connect()
			}
		},
		async connect() {
			if (!this.validate({ requireSecret: true })) {
				return
			}

			this.isConnecting = true

			const data = {
				name: this.name,
				host: this.host,
				port: this.port || '22',
				username: this.username,
				remote_path: this.remotePath || '/',
				host_key_fingerprint: this.hostKeyFingerprint.trim(),
			}

			try {
				await this.buildCredentials(data)
				const res = await this.$api.cloud.addSftp(data)
				this.isConnecting = false
				this.$EventBus.$emit(events.RELOAD_MOUNT_LIST)
				this.$EventBus.$emit(events.GOTO, { path: res.data.data })
				this.$buefy.toast.open({ message: this.$t('Connected successfully'), type: 'is-success' })
				this.$emit('close')
			}
			catch (err) {
				this.isConnecting = false
				this.reportError(err)
			}
		},
		async editConnection() {
			if (!this.validate({ requireSecret: false })) {
				return
			}

			this.isConnecting = true

			const data = {
				id: this.editItem.id,
				display_name: this.name,
				host: this.host,
				port: this.port || '22',
				username: this.username,
				remote_path: this.remotePath || '/',
				host_key_fingerprint: this.hostKeyFingerprint.trim(),
			}

			try {
				await this.buildCredentials(data)
				await this.$api.cloud.editSftp(data)
				this.isConnecting = false
				this.$EventBus.$emit(events.RELOAD_MOUNT_LIST)
				this.$buefy.toast.open({ message: this.$t('Connection updated'), type: 'is-success' })
				this.$emit('close')
			}
			catch (err) {
				this.isConnecting = false
				this.reportError(err)
			}
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 40rem;
}

.fingerprint {
	word-break: break-all;
	font-size: 0.75rem;
}
</style>
