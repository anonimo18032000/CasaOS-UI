import { api } from './service.js'

const PREFIX = '/backup'

const backup = {
	// list scheduled backup jobs
	list() {
		return api.get(`${PREFIX}`)
	},

	// create a new scheduled backup job
	create(data) {
		return api.post(`${PREFIX}`, data)
	},

	// edit an existing backup job
	edit(id, data) {
		return api.put(`${PREFIX}/${id}`, data)
	},

	// delete a backup job
	delete(id) {
		return api.delete(`${PREFIX}/${id}`)
	},

	// run a backup job immediately, outside its schedule
	runNow(id) {
		return api.post(`${PREFIX}/${id}/run`)
	},
}
export default backup
