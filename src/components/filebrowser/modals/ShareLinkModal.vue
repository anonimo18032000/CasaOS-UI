<template>
	<div class="modal-card">
		<header class="modal-card-head">
			<div class="is-flex-grow-1">
				<h3 class="title is-header">{{ $t('Share link') }}</h3>
			</div>
			<b-icon class="close-button" icon="close-outline" pack="casa" @click.native="$emit('close');" />
		</header>

		<section class="modal-card-body">
			<!-- create -->
			<template v-if="item">
				<p class="mb-3 one-line"><b>{{ item.name }}</b></p>

				<template v-if="!created">
					<b-field :label="$t('Link expires after')" class="mb-4">
						<b-select v-model="expiresIn" expanded>
							<option v-for="o in expiryOptions" :key="o.seconds" :value="o.seconds">{{ o.label }}</option>
						</b-select>
					</b-field>
					<b-field :label="$t('Password (optional)')" class="mb-4">
						<b-input v-model="password" expanded password-reveal type="password" />
					</b-field>
					<b-field :label="$t('Maximum downloads (optional)')" class="mb-2">
						<b-input v-model="maxDownloads" min="0" placeholder="0 = unlimited" type="number" />
					</b-field>
					<p class="is-size-7 has-text-grey">
						{{ $t('Anyone who has the link can download this file until it expires. Passwords are required to be at least 4 characters.') }}
					</p>
				</template>

				<!-- result -->
				<template v-else>
					<b-notification :closable="false" class="is-size-7" type="is-success is-light">
						{{ $t('Link created. Copy it now - the password is not shown again.') }}
					</b-notification>
					<b-field>
						<b-input ref="urlInput" :value="createdUrl" expanded readonly @focus="$event.target.select()" />
						<p class="control">
							<b-button type="is-primary" @click="copy(createdUrl)">{{ $t('Copy') }}</b-button>
						</p>
					</b-field>
					<p class="is-size-7 has-text-grey">
						{{ $t('Expires') }}: {{ formatDate(created.expires_at) }}
						<span v-if="created.has_password"> &middot; {{ $t('Password protected') }}</span>
					</p>
				</template>
				<hr>
			</template>

			<!-- existing links -->
			<h4 class="title is-6 mb-2">{{ item ? $t('Links for this file') : $t('Active share links') }}</h4>
			<b-loading v-model="isLoading" :is-full-page="false" />
			<p v-if="!isLoading && visibleLinks.length === 0" class="has-text-grey is-size-7">{{ $t('No active links') }}</p>
			<ul class="links">
				<li v-for="l in visibleLinks" :key="l.token">
					<div class="info">
						<div class="nm one-line">{{ l.name }}</div>
						<div class="is-size-7 has-text-grey">
							{{ $t('Expires') }}: {{ formatDate(l.expires_at) }}
							&middot; {{ l.downloads }}{{ l.max_downloads ? ' / ' + l.max_downloads : '' }} {{ $t('downloads') }}
							<span v-if="l.has_password"> &middot; {{ $t('Password protected') }}</span>
						</div>
					</div>
					<b-button rounded size="is-small" @click="copy(url(l))">{{ $t('Copy link') }}</b-button>
					<b-button rounded size="is-small" type="is-danger is-light" @click="revoke(l)">{{ $t('Revoke') }}</b-button>
				</li>
			</ul>
		</section>

		<footer v-if="item && !created" class="modal-card-foot is-flex is-align-items-center">
			<div class="is-flex-grow-1" />
			<b-button :label="$t('Create link')" :loading="isCreating" rounded type="is-primary" @click="create" />
		</footer>
	</div>
</template>

<script>
export default {
	props: {
		// the file to share; leave out to only manage the existing links
		item: { type: Object, default: null },
	},
	data() {
		return {
			links: [],
			isLoading: false,
			isCreating: false,
			expiresIn: 24 * 3600,
			password: '',
			maxDownloads: '',
			created: null,
		}
	},
	computed: {
		expiryOptions() {
			return [
				{ seconds: 3600, label: this.$t('1 hour') },
				{ seconds: 24 * 3600, label: this.$t('1 day') },
				{ seconds: 7 * 24 * 3600, label: this.$t('7 days') },
				{ seconds: 30 * 24 * 3600, label: this.$t('30 days') },
			]
		},
		visibleLinks() {
			return this.item ? this.links.filter(l => l.path === this.item.path) : this.links
		},
		createdUrl() {
			return this.created ? this.url(this.created) : ''
		},
	},
	created() {
		this.load()
	},
	methods: {
		url(link) {
			return this.$api.sharelinks.publicUrl(link.token)
		},
		formatDate(unix) {
			return new Date(unix * 1000).toLocaleString()
		},
		load() {
			this.isLoading = true
			this.$api.sharelinks.list().then((res) => {
				this.isLoading = false
				this.links = res.data.data || []
			}).catch(() => {
				this.isLoading = false
			})
		},
		create() {
			if (this.password && this.password.length < 4) {
				this.$buefy.toast.open({ message: this.$t('Password is too short'), type: 'is-danger' })
				return
			}
			this.isCreating = true
			this.$api.sharelinks.create({
				path: this.item.path,
				expires_in: this.expiresIn,
				password: this.password,
				max_downloads: Number(this.maxDownloads) || 0,
			}).then((res) => {
				this.isCreating = false
				this.created = res.data.data
				this.password = ''
				this.load()
				this.copy(this.createdUrl, true)
			}).catch((err) => {
				this.isCreating = false
				this.$buefy.toast.open({
					message: err.response?.data?.data || err.response?.data?.message || err.message,
					type: 'is-danger',
				})
			})
		},
		revoke(link) {
			this.$buefy.dialog.confirm({
				title: this.$t('Revoke'),
				message: this.$t('The link stops working immediately. Continue?'),
				confirmText: this.$t('Revoke'),
				cancelText: this.$t('Cancel'),
				type: 'is-danger',
				onConfirm: () => {
					this.$api.sharelinks.revoke(link.token).then(() => {
						if (this.created && this.created.token === link.token) {
							this.created = null
						}
						this.load()
					})
				},
			})
		},
		// navigator.clipboard only exists on secure origins (https / localhost); fall back to a
		// temporary textarea so the button also works when CasaOS is opened over plain http.
		async copy(text, silent = false) {
			let ok = false
			try {
				await navigator.clipboard.writeText(text)
				ok = true
			}
			catch (e) {
				const area = document.createElement('textarea')
				area.value = text
				area.style.position = 'fixed'
				area.style.opacity = '0'
				document.body.appendChild(area)
				area.select()
				try {
					ok = document.execCommand('copy')
				}
				catch (e2) {
					ok = false
				}
				document.body.removeChild(area)
			}
			if (ok && !silent) {
				this.$buefy.toast.open({ message: this.$t('Copied'), type: 'is-success' })
			}
			else if (!ok && !silent) {
				this.$buefy.toast.open({ message: this.$t('Could not copy - select the link and copy it manually'), type: 'is-warning' })
			}
		},
	},
}
</script>

<style lang="scss" scoped>
.modal-card {
	max-width: 36rem;
}

.links li {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.4rem 0;
	border-bottom: 1px solid rgba(127, 127, 127, 0.2);

	.info {
		flex: 1;
		min-width: 0;
	}
}
</style>
