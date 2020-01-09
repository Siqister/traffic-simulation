import {scaleLinear, select, dispatch} from 'd3';

export default function Slider({
	label='', 
	scaleBack = d=>d, 
	scaleFront = d=>d,
	themeColor = '#0173ce',
	secondaryColor = '#95bde0',
	height = 128,
	dataRange = [0,1]
}={}){

	const margin = {t:16, r:0, b:24, l:16};
	let w, h;
	let svg;
	let ctx;
	const ticks = [0,1,2,3];
	let currentTick = 2;
	const scaleY = scaleLinear().domain([Math.min(...ticks), Math.max(...ticks)]);
	const scale = scaleLinear().domain([Math.min(...ticks), currentTick]).range(dataRange);
	const dispatcher = dispatch('sliderUpdate');

	function exports(root){

		//Initial styling
		root
			.attr('class', 'module slider')
			.style('border-bottom', `1px solid ${secondaryColor}`)
			.style('position', 'relative');

		//Compute bounding dimensions
		const W = root.node().clientWidth;
		const H = root.node().clientHeight;
		w = W - margin.l - margin.r;
		h = H - margin.t - margin.b;
		const barChartW = Math.max(w-100, 40);
		scaleY.range([h-5,5]);

		//Build DOM
		const stats = root.append('div')
			.style('position', 'absolute')
			.style('top', `${margin.t}px`);
		stats.append('p').html(label);

		ctx = root
			.append('svg')
			.attr('width', W)
			.attr('height', H)
			.append('g')
			.attr('transform', `translate(${margin.l}, ${margin.t})`);

		const barChart = ctx.append('g')
			.attr('class', 'bars')
			.attr('transform', `translate(${w-barChartW}, 0)`);

		const bars = barChart.selectAll('.bar')
			.data(ticks)
			.enter()
			.append('rect')
			.attr('class','bar')
			.attr('x', d => barChartW/(ticks.length+1)*d)
			.attr('width', barChartW/(ticks.length+1)-2)
			.attr('y', d => scaleY(d))
			.attr('height', d => h-scaleY(d))
			.style('fill', d => d===currentTick?themeColor:secondaryColor)
			.style('cursor', 'pointer');

		bars
			.on('click', function(d){
				if(d!==currentTick){
					currentTick = d;
					bars.style('fill', d => d===currentTick?themeColor:secondaryColor);
					dispatcher.call('sliderUpdate', null, scale(d));
				}
			});

	}

	exports.on = function(...args){
		dispatcher.on(...args);
		return this;
	}

	return exports;

}