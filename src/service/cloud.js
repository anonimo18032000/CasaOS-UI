/*
 * @Author: Jerryk jerry@icewhale.org
 * @Date: 2022-07-14 18:15:24
 * @LastEditors: Jerryk jerry@icewhale.org
 * @LastEditTime: 2023-02-02 15:56:30
 * @FilePath: \CasaOS-UI-0.4.2\src\service\cloud.js
 * @Description: 
 * 
 * Copyright (c) 2022 by IceWhale, All Rights Reserved. 
 */
import {api} from "./service.js";

const PREFIX = "/cloud";
const cloud = {
	// get storage list
	list(data) {
		return api.get(`${PREFIX}`, data)
	},

	// delete storage
	umount(data) {
		return api.delete(`${PREFIX}`, data);
	},

	// connect an SFTP server and mount it
	addSftp(data) {
		return api.post(`${PREFIX}/sftp`, data);
	},

	// test SFTP credentials without mounting anything
	testSftp(data) {
		return api.post(`${PREFIX}/sftp/test`, data);
	},

	// edit an existing SFTP connection (rename, change host/credentials/remote folder)
	editSftp(data) {
		return api.put(`${PREFIX}/sftp`, data);
	},

	// get health/latency status of all mounted network storages
	health() {
		return api.get(`${PREFIX}/health`);
	},

	// force-unmount and remount a storage
	reconnect(data) {
		return api.post(`${PREFIX}/reconnect`, data);
	},
}
export default cloud;
