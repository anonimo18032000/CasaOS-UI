import { api } from "./service.js";

const PREFIX = "/sys"

const sys = {

	// Get websocket port
	getSocketPort() {
		return api.get(`${PREFIX}/socket-port`);
	},

	// Check if need init
	guideCheck() {
		return api.get(`${PREFIX}/state`);
	},

	// check system version
	getVersion() {
		return api.get(`${PREFIX}/version`);
	},

	// Hardware Info
	hardwareInfo() {
		return api.get(`${PREFIX}/hardware`)
	},

	// get cpu info
	getCpuInfo() {
		return api.get(`${PREFIX}/cpu`);
	},

	// get disk info
	getDiskInfo() {
		return api.get(`${PREFIX}/disk`);
	},

	// get memory info
	getMemoryInfo() {
		return api.get(`${PREFIX}/mem`);
	},

	// get network info
	getNetworkInfo() {
		return api.get(`${PREFIX}/network`);
	},

	// get logs
	getLogs() {
		return api.get(`${PREFIX}/logs`);
	},

	//Get Debug Info
	getDebugInfo() {
		return api.get(`${PREFIX}/debug`);
	},

	// get system utilization
	getUtilization() {
		return api.get(`${PREFIX}/utilization`);
	},

	// proxy request
	getProxyRequestContent(url) {
		return api.get(`${PREFIX}/proxy?url=${url}`)
	},

	// get casaos server port
	getServerPort() {
		return api.get(`/gateway/port`);
	},

	// edit casaos server port
	editServerPort(data) {
		return api.put(`/gateway/port`, data);
	},

	// get HTTPS status
	getHttpsStatus() {
		return api.get(`/gateway/https`);
	},

	// generate a self-signed certificate for a domain and enable HTTPS
	generateHttpsCertificate(domain) {
		return api.post(`/gateway/https/generate`, { domain });
	},

	// upload a certificate/key pair and enable HTTPS
	uploadHttpsCertificate(formData) {
		return api.post(`/gateway/https/upload`, formData, {
			headers: { 'content-type': 'multipart/form-data' },
		});
	},

	// disable HTTPS
	disableHttps() {
		return api.post(`/gateway/https/disable`);
	},

	// get auto-update setting for installed apps
	getAutoUpdateSetting() {
		return api.get(`/setting/auto-update`);
	},

	// enable/disable auto-update for installed apps
	setAutoUpdateSetting(enabled) {
		return api.put(`/setting/auto-update`, { enabled });
	},

	// get dashboard hardware stats refresh rate (ms)
	getHardwareStatusInterval() {
		return api.get(`/sys/hardware-status-interval`);
	},

	// set dashboard hardware stats refresh rate (ms)
	setHardwareStatusInterval(intervalMs) {
		return api.put(`/sys/hardware-status-interval`, { interval_ms: intervalMs });
	},

	// get usb status
	getUsbStatus() {
		return api.get(`/usb/usb-auto-mount`);
	},

	// Toggle usb auto-mount
	toggleUsbAutoMount(data) {
		return api.put(`/usb/usb-auto-mount`, data);
	},

	// update CasaOS
	updateCasaOS() {
		return api.post(`${PREFIX}/update`);
	},

	// stop casaos
	stopCasaOS() {
		return api.post(`${PREFIX}/stop`);
	},

	//Check web ui Port
	checkUiPort(url) {
		return api.get(url);
	},

	// Get system apps
	getSystemApps() {
		return api.get(`${PREFIX}/apps-state`)
	},

	// Check ssh login
	checkSshLogin(data) {
		return api.post(`${PREFIX}/ssh-login`, data);
	},

	// power -- data:shutdown
	// power -- data:restart
	power(data) {
		return api.put(`${PREFIX}/state/${data}`);
	},
}
export default sys;
