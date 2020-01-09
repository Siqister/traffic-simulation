import {svg, select, dispatch, scaleSqrt} from 'd3';
import 'babel-polyfill'; 

import './style.css';
import url from './assets/qq-slow-zone-02.svg';

import PedSimulation from './pedSimulation.js';
import LightSimulation from './lightSimulation.js';
import Counter from './counter.js';

import {computeAvgDelay, computeCumulativeDelay} from './utils.js';


//Shared dispatch
const dispatcher = dispatch(
	'dataUpdated'
);

//counter module displays level of service
const scaleBack = scaleSqrt();
const scaleFront = scaleSqrt();

const pedCounter = Counter({label:'Ped', scaleBack, scaleFront});
select('.sidebar').select('#los').append('div').call(pedCounter);
const carCounter = Counter({label:'Vehicles', scaleBack, scaleFront});
select('.sidebar').select('#los').append('div').call(carCounter);
const lrtCounter = Counter({label:'LRT', scaleBack, scaleFront});
select('.sidebar').select('#los').append('div').call(lrtCounter);

dispatcher.on('dataUpdated', (pedData, carData, lrtData) => {
	const cumulativeDelay = Math.max(
		computeCumulativeDelay(pedData), 
		computeCumulativeDelay(carData), 
		computeCumulativeDelay(lrtData)
	);
	const avgDelay = Math.max(
		computeAvgDelay(pedData), 
		computeAvgDelay(carData), 
		computeAvgDelay(lrtData)
	);

	scaleBack.domain([0, cumulativeDelay]);
	scaleFront.domain([0, avgDelay]);

	pedCounter.tick(pedData);
	carCounter.tick(carData);
	lrtCounter.tick(lrtData);
});


const init = async function(){

	//Append <svg> to DOM
	const root = await svg(url)
		.then(doc => select(doc).select('svg')); //d3 selection
	const viewbox = root.attr('viewBox').split(' ');
	const viewboxWidth = +viewbox[2];
	const viewboxHeight = +viewbox[3];

	select('#animation')
		.style('width', `${viewboxWidth}px`)
		.style('height', `${viewboxHeight}px`)
		.style('top', '50%')
		.style('transform', 'translate(0, -50%)')
		.append(() => root.node());

	//Append <canvas> overlay to DOM
	root
		.attr('width', viewboxWidth)
		.attr('height', viewboxHeight);
	const canvas = select('#animation').append('canvas')
		.attr('width',viewboxWidth)
		.attr('height',viewboxHeight)
		.style('position','absolute')
		.style('top',0)
		.style('left',0);

	//Compute bounding dimensions for simulations
	const bound = root.select('#guide-off').select('#bound').style('opacity',0);
	const x = +bound.attr('x');
	const y = +bound.attr('y');
	const w = +root.select('#guide-off').select('#width').style('opacity',0).node().getTotalLength();
	const h = +root.select('#guide-off').select('#height').style('opacity',0).node().getTotalLength();

	//Hide elements in #lib
	root.select('#lib').style('display', 'none');

	//SIMULATIONS
	const pedSimulation = PedSimulation({
		x,y,w,h,
	});
	pedSimulation.call(null, root, canvas);

	const lightSimulation = LightSimulation();
	lightSimulation.call(null, root.select('#flowell'));

	//Events
	pedSimulation
		.on('ped:enterRoad', () => lightSimulation.turnOn())
		.on('ped:clearRoad', () => lightSimulation.turnOff())
		.on('dataUpdated', (...args) => dispatcher.call('dataUpdated', null, ...args));

}

init();