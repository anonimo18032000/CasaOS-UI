import { api } from "./service.js";

const PREFIX = "/sharelinks"

// Temporary public download links for single files
const sharelinks = {
	list() {
		return api.get(`${PREFIX}`);
	},

	// data: { path, expires_in (seconds), password?, max_downloads? }
	create(data) {
		return api.post(`${PREFIX}`, data);
	},

	revoke(token) {
		return api.delete(`${PREFIX}/${token}`);
	},

	// the public address that anyone with the token can open
	publicUrl(token) {
		return `${window.location.origin}/v1/pubshare/${token}`;
	},
}
export default sharelinks;
