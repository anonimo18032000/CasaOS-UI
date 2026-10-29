<template>
	<svg :viewBox="`0 0 ${W} ${H}`" class="latency-chart" preserveAspectRatio="none" role="img">
		<title>{{ summary }}</title>
		<!-- failed measurements as red bands -->
		<rect v-for="(f, i) in failures" :key="'f' + i" :height="H" :width="f.w" :x="f.x" class="band-fail" />
		<line :x1="0" :x2="W" :y1="H - 0.5" :y2="H - 0.5" class="axis" />
		<polyline v-if="points" :points="points" class="line" fill="none" />
		<circle v-for="(p, i) in dots" :key="'d' + i" :cx="p.x" :cy="p.y" class="dot" r="1.6" />
	</svg>
</template>

<script>
const W = 300
const H = 48
const PAD = 4

// A tiny dependency-free sparkline: latency over time, with unreachable moments shaded red.
export default {
	props: {
		// [{ t: unix ms, ok: bool, ms: number }]
		samples: { type: Array, default: () => [] },
		// time window shown, in minutes
		minutes: { type: Number, default: 60 },
	},
	data() {
		return { W, H }
	},
	computed: {
		range() {
			const to = Date.now()
			return { from: to - this.minutes * 60000, to }
		},
		maxMs() {
			return Math.max(50, ...this.samples.filter(s => s.ok).map(s => s.ms))
		},
		x() {
			const { from, to } = this.range
			const span = Math.max(1, to - from)
			return t => ((t - from) / span) * (W - 1)
		},
		y() {
			return ms => H - PAD - (Math.min(ms, this.maxMs) / this.maxMs) * (H - PAD * 2)
		},
		okSamples() {
			return this.samples.filter(s => s.ok)
		},
		points() {
			if (this.okSamples.length < 2) {
				return ''
			}
			return this.okSamples.map(s => `${this.x(s.t).toFixed(1)},${this.y(s.ms).toFixed(1)}`).join(' ')
		},
		dots() {
			return this.okSamples.length === 1
				? [{ x: this.x(this.okSamples[0].t), y: this.y(this.okSamples[0].ms) }]
				: []
		},
		failures() {
			// one band per failed sample, as wide as the gap to the next sample
			const out = []
			this.samples.forEach((s, i) => {
				if (s.ok) {
					return
				}
				const next = this.samples[i + 1]
				const x0 = this.x(s.t)
				const x1 = next ? this.x(next.t) : Math.min(W, x0 + 4)
				out.push({ x: x0, w: Math.max(2, x1 - x0) })
			})
			return out
		},
		summary() {
			return `${this.okSamples.length}/${this.samples.length} ok, max ${this.maxMs} ms`
		},
	},
}
</script>

<style lang="scss" scoped>
.latency-chart {
	display: block;
	width: 100%;
	height: 3rem;
	background: rgba(127, 127, 127, 0.08);
	border-radius: 6px;

	.line {
		stroke: #2f6bff;
		stroke-width: 1.5;
		vector-effect: non-scaling-stroke;
	}

	.dot {
		fill: #2f6bff;
	}

	.axis {
		stroke: rgba(127, 127, 127, 0.35);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}

	.band-fail {
		fill: rgba(220, 53, 69, 0.28);
	}
}
</style>
