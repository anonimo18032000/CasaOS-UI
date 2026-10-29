/**
 * Squarified treemap layout (Bruls, Huizing, van Wijk).
 *
 * Lays `items` (each with a numeric `size`) out inside a width x height rectangle so that the area of
 * every cell is proportional to its size and the cells stay as close to squares as possible - which
 * keeps small entries visible and readable.
 *
 * Returns the items that have a positive size, in descending order of size, each extended with
 * x, y, w, h (same units as width/height).
 */
export function squarify(items, width, height) {
	const sorted = items
		.filter(item => item.size > 0)
		.sort((a, b) => b.size - a.size)
	const total = sorted.reduce((sum, item) => sum + item.size, 0)
	if (sorted.length === 0 || total <= 0 || width <= 0 || height <= 0) {
		return []
	}

	const scale = (width * height) / total
	const queue = sorted.map(item => ({ item, area: item.size * scale }))
	const result = []
	let rect = { x: 0, y: 0, w: width, h: height }

	// the worst (largest) aspect ratio in a row laid along a side of length `side`
	const worst = (row, side) => {
		const sum = row.reduce((s, r) => s + r.area, 0)
		const max = Math.max(...row.map(r => r.area))
		const min = Math.min(...row.map(r => r.area))
		return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
	}

	const layoutRow = (row) => {
		const sum = row.reduce((s, r) => s + r.area, 0)
		const horizontal = rect.w >= rect.h // lay the row along the shorter side
		if (horizontal) {
			const rowW = sum / rect.h
			let y = rect.y
			row.forEach((r) => {
				const h = r.area / rowW
				result.push({ ...r.item, x: rect.x, y, w: rowW, h })
				y += h
			})
			rect = { x: rect.x + rowW, y: rect.y, w: rect.w - rowW, h: rect.h }
		}
		else {
			const rowH = sum / rect.w
			let x = rect.x
			row.forEach((r) => {
				const w = r.area / rowH
				result.push({ ...r.item, x, y: rect.y, w, h: rowH })
				x += w
			})
			rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH }
		}
	}

	let row = []
	while (queue.length > 0) {
		const next = queue[0]
		const side = Math.min(rect.w, rect.h)
		if (row.length === 0 || worst([...row, next], side) <= worst(row, side)) {
			row.push(queue.shift())
		}
		else {
			layoutRow(row)
			row = []
		}
	}
	if (row.length > 0) {
		layoutRow(row)
	}
	return result
}
