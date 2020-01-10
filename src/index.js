import {svg, select, dispatch, scaleSqrt} from 'd3';
import 'babel-polyfill'; 

import './style.css';
import url from './assets/qq-slow-zone-02.svg';

import PedSimulation from './pedSimulation.js';
import LightSimulation from './lightSimulation.js';
import Counter from './counter.js';
import Slider from './slider.js';

import {computeAvgDelay, computeCumulativeDelay, delay} from './utils.js';
import {
	PED_MEAN,
	PED_STD,
	CAR_MEAN,
	CAR_STD,
	LRT_MEAN,
	LRT_STD,
} from './config.js';

//Shared dispatch
const dispatcher = dispatch(
	'dataUpdated',
	'volumeUpdated'
);
let pedSimulation;

//Counters
//Counter module displays level of service
const sidebar = select('.sidebar');
const scaleBack = scaleSqrt();
const scaleFront = scaleSqrt();

const pedCounter = Counter({label:'Ped', scaleBack, scaleFront});
sidebar.select('#los').append('div').call(pedCounter);
const carCounter = Counter({label:'Vehicles', scaleBack, scaleFront});
sidebar.select('#los').append('div').call(carCounter);
const lrtCounter = Counter({label:'LRT', scaleBack, scaleFront});
sidebar.select('#los').append('div').call(lrtCounter);

//Simulation config
const pedVolumeSlider = Slider({label:'Ped volume'}).on('sliderUpdate', d => dispatcher.call('volumeUpdated', null, 'ped', d));
sidebar.select('#config').append('div').call(pedVolumeSlider);
const carVolumeSlider = Slider({label:'Car volume'}).on('sliderUpdate', d => dispatcher.call('volumeUpdated', null, 'car', d));
sidebar.select('#config').append('div').call(carVolumeSlider);
const lrtVolumeSlider = Slider({label:'LRT volume'}).on('sliderUpdate', d => dispatcher.call('volumeUpdated', null, 'lrt', d));
sidebar.select('#config').append('div').call(lrtVolumeSlider);


//Initiate main simulation
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
	pedSimulation = PedSimulation({
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

//Events
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

dispatcher.on('volumeUpdated', (type, d) => {
	const episilon = 0.00001;
	let randomDelay;
	switch(type){
		case 'ped': 
			randomDelay = delay(PED_MEAN*1/(d+episilon), PED_STD, true);
			break;
		case 'car': 
			randomDelay = delay(CAR_MEAN*1/(d+episilon), CAR_STD);
			break;
		case 'lrt': 
			randomDelay = delay(LRT_MEAN*1/(d+episilon), LRT_STD);
			break;
		default: 
			return;
	}
	pedSimulation.updateVolume(type, randomDelay);
});