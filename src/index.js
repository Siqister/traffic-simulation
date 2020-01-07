import {svg, select} from 'd3';
import 'babel-polyfill'; 

import './style.css';
import url from './assets/qq-slow-zone-02.svg';

import PedSimulation from './pedSimulation.js';
import LightSimulation from './lightSimulation.js';


//Global state

const init = async function(){

	//Append <svg> DOM 
	const root = await svg(url)
		.then(doc => select(doc).select('svg')); //d3 selection
	select('#animation').append(() => root.node());

	//Calculate <svg> viewbox size
	const viewbox = root.attr('viewBox').split(' ');
	const viewboxWidth = +viewbox[2];
	const viewboxHeight = +viewbox[3];

	//Append <canvas> overlay
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

	//Define re-usable <svg> components
	const defs = root.append('defs');
	defs.append(() => root.select('#lib').select('#car_1_').node());

	//SIMULATIONS
	const pedSimulation = PedSimulation({
		x,y,w,h,
		detectionRange:[.3, .52]
	});
	pedSimulation.call(null, root, canvas);

	const lightSimulation = LightSimulation();
	lightSimulation.call(root.select('#flowell'));

	//Event dispatch
	pedSimulation
		.on('ped:enterRoad', () => console.log('ped:enterRoad'))
		.on('ped:clearRoad', () => console.log('ped:clearRoad'));


}

init();