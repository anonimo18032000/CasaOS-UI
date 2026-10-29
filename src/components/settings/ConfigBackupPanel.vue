<template>
	<div class="modal-card">
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Settings backup') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>

		<section class="modal-card-body">
			<h4 class="title is-6 mb-2">{{ $t('Download a backup') }}</h4>
			<p class="is-size-7 has-text-grey mb-3">
				{{ $t('Saves the CasaOS configuration files and your scheduled backup jobs in one file. It does not include your files, apps, user accounts or storage passwords.') }}
			</p>
			<b-button :loading="isExporting" icon-left="download" rounded type="is-primary" @click="exportBackup">
				{{ $t('Download backup') }}
			</b-button>

			<hr>

			<h4 class="title is-6 mb-2">{{ $t('Restore from a backup') }}</h4>
			<p class="is-size-7 has-text-grey mb-3">
				{{ $t('Replaces the current configuration files with the ones in the backup. Each replaced file is kept next to the original with the extension .pre-restore. Restart CasaOS afterwards to apply them.') }}
			</p>
			<b-field class="file">
				<b-upload v-model="file" accept=".gz,.tgz,application/gzip">
					<a class="button">
						<b-icon icon="upload-outline" pack="casa" />
						<span>{{ file ? file.name : $t('Choose backup file') }}</span>
					</a>
				</b-upload>
			</b-field>
			<b-button :disabled="!file" :loading="isImporting" rounded type="is-danger is-light" @click="confirmImport">
				{{ $t('Restore') }}
			</b-button>

			<b-notification v-if="restored" :closable="false" class="mt-4" type="is-success is-light">
				<p class="has-text-weight-bold mb-1">{{ $t('Backup restored. Restart CasaOS to apply it.') }}</p>
				<ul class="is-size-7">
					<li v-for="name in restored" :key="name">{{ name }}</li>
				</ul>
			</b-notification>
		</section>
	</div>
</template>

<script>
export default {
	data() {
		return {
			isExporting: false,
			isImporting: false,
			file: null,
			restored: null,
		}
	},
	methods: {
		fail(err) {
			this.$buefy.toast.open({
				message: err.response?.data?.data || err.response?.data?.message || err.message,
				type: 'is-danger',
			})
		},
		// The download needs the login header, so it is fetched as a blob and saved from memory
		// instead of pointing the browser at the URL.
		exportBackup() {
			this.isExporting = true
			this.$api.sys.exportConfig().then((res) => {
				this.isExporting = false
				const disposition = res.headers['content-disposition'] || ''
				const match = disposition.match(/filename="?([^";]+)"?/)
				const name = match ? match[1] : 'casaos-config.tar.gz'
				const url = URL.createObjectURL(res.data)
				const link = document.createElement('a')
				link.href = url
				link.download = name
				document.body.appendChild(link)
				link.click()
				document.body.removeChild(link)
				setTimeout(() => URL.revokeObjectURL(url), 10000)
			}).catch((err) => {
				this.isExporting = false
				this.fail(err)
			})
		},
		confirmImport() {
			this.$buefy.dialog.confirm({
				title: this.$t('Restore from a backup'),
				message: this.$t('This replaces the current configuration with the one in {name}. Continue?', { name: this.file.name }),
				confirmText: this.$t('Restore'),
				cancelText: this.$t('Cancel'),
				type: 'is-danger',
				onConfirm: this.importBackup,
			})
		},
		importBackup() {
			this.isImporting = true
			this.restored = null
			this.$api.sys.importConfig(this.file).then((res) => {
				this.isImporting = false
				this.restored = res.data.data.restored || []
				this.file = null
			}).catch((err) => {
				this.isImporting = false
				this.fail(err)
			})
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 34rem;
}
</style>
