import {computeAvgDelay, computeCumulativeDelay} from './utils.js';

export default function Counter({label='', scaleBack, scaleFront}){

	const margin = {t:16, r:16, b:24, l:16};
	let w, h;
	let svg;

	let ctx, circleBack, circleFront, stats;

	const themeColor = '#0173ce';
	const secondaryColor = '#95bde0';

	function exports(root){

		root
			.attr('class', 'module counter')
			.style('border-bottom', `1px solid ${secondaryColor}`)
			.style('position', 'relative');

		//Compute bounding dimensions
		const W = root.node().clientWidth;
		const H = root.node().clientHeight;
		w = W - margin.l - margin.r;
		h = H - margin.t - margin.b;
		const R = Math.min(w, h)/2;

		scaleBack.range([4,R]);
		scaleFront.range([2,R/2]);

		//Build DOM
		ctx = root.attr('class', 'module counter')
			.append('svg')
			.attr('width', W)
			.attr('height', H)
			.append('g')
			.attr('transform', `translate(${margin.l}, ${margin.t})`);

		//Cumulative
		circleBack = ctx.append('g')
			.attr('transform', `translate(${w-R}, ${R})`)
		circleBack
			.append('circle')
			.attr('r', 4)
			.style('fill', themeColor)
			.style('fill-opacity', .1)
		circleBack
			.append('line')
			.attr('y1', R/2+3)
			.attr('y2', R)
			.style('stroke-width', '1px')
			.style('stroke', secondaryColor)
		circleBack.append('text')
			.attr('fill', secondaryColor)
			.attr('dy',3)
			.attr('y', R+3)
			.text('Cumulative delay')
			.attr('text-anchor', 'middle');

		//Average
		circleFront = ctx.append('g')
			.attr('transform', `translate(${w-R}, ${R})`)
		circleFront
			.append('circle')
			.attr('r', 2)
			.style('fill', themeColor)
			.style('fill-opacity', .7)
		circleFront
			.append('line')
			.attr('x1', 0)
			.attr('x2', -R-5)
			.attr('y2', 20)
			.style('stroke-width', '1px')
			.style('stroke', secondaryColor)
		circleFront.append('text')
			.attr('fill', themeColor)
			.attr('x', -R-7)
			.attr('y', 20)
			.attr('text-anchor', 'end')
			.attr('dy',3)
			.text('Avg delay')

		//Stats
		stats = root.append('div')
			.attr('class', 'stats')
			.style('position', 'absolute')
			.style('top', `${margin.t}px`);
		stats.append('p').html(label);
		stats.append('p').attr('class','counter').html(0);

	}

	exports.tick = function(data){
		const avgDelay = computeAvgDelay(data);
		const cumulativeDelay = computeCumulativeDelay(data);
		const count = (data.count||0) + data.length;

		stats.select('.counter').html(count);
		circleBack.select('circle').transition().attr('r', scaleBack(cumulativeDelay));
		circleFront.select('circle').transition().attr('r', scaleFront(avgDelay));
		circleFront.select('text').text(`Avg delay: ${Math.round(avgDelay)}`);
	}

	return exports;

}