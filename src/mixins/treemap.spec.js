import { describe, expect, it } from 'vitest'
import { squarify } from './treemap'

describe('squarify', () => {
	const area = cells => cells.reduce((sum, c) => sum + c.w * c.h, 0)

	it('fills the whole rectangle', () => {
		const cells = squarify([{ size: 6 }, { size: 6 }, { size: 4 }, { size: 3 }, { size: 2 }, { size: 2 }, { size: 1 }], 600, 400)
		expect(cells).toHaveLength(7)
		expect(area(cells)).toBeCloseTo(600 * 400, 3)
	})

	it('gives each cell an area proportional to its size', () => {
		const cells = squarify([{ name: 'a', size: 75 }, { name: 'b', size: 25 }], 100, 100)
		const a = cells.find(c => c.name === 'a')
		expect(a.w * a.h).toBeCloseTo(7500, 3)
	})

	it('keeps every cell inside the rectangle', () => {
		const cells = squarify(Array.from({ length: 40 }, (_, i) => ({ size: i + 1 })), 160, 90)
		cells.forEach((c) => {
			expect(c.x).toBeGreaterThanOrEqual(-1e-9)
			expect(c.y).toBeGreaterThanOrEqual(-1e-9)
			expect(c.x + c.w).toBeLessThanOrEqual(160 + 1e-6)
			expect(c.y + c.h).toBeLessThanOrEqual(90 + 1e-6)
		})
	})

	it('ignores empty entries and empty input', () => {
		expect(squarify([], 10, 10)).toEqual([])
		expect(squarify([{ size: 0 }], 10, 10)).toEqual([])
		expect(squarify([{ size: 5 }, { size: 0 }], 10, 10)).toHaveLength(1)
	})
})
