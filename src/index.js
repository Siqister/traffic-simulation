import {svg, select} from 'd3';
import 'babel-polyfill'; 

import './style.css';
import url from './assets/qq-slow-zone-02.svg';

import PedSimulation from './pedSimulation.js';
import CarSimulation from './carSimulation.js';

//Global state

const init = async function(){

	//Append DOM 
	const root = await svg(url)
		.then(doc => select(doc).select('svg')); //d3 selection
	select('#animation').append(() => root.node());

	//Compute bounding dimensions for simulations
	const bound = root.select('#guide-off').select('#bound').style('opacity',0);
	const x = +bound.attr('x');
	const y = +bound.attr('y');
	const w = +root.select('#guide-off').select('#width').style('opacity',0).node().getTotalLength();
	const h = +root.select('#guide-off').select('#height').style('opacity',0).node().getTotalLength();

	//Define re-usable <svg> components
	const defs = root.append('defs');
	defs.append(() => root.select('#lib').select('#ppl-1').node());
	defs.append(() => root.select('#lib').select('#ppl-2').node());
	defs.append(() => root.select('#lib').select('#ppl-3').node());
	defs.append(() => root.select('#lib').select('#ppl-4').node());
	defs.append(() => root.select('#lib').select('#ppl-5').node());
	defs.append(() => root.select('#lib').select('#ppl-6').node());
	defs.append(() => root.select('#lib').select('#car_1_').node());

	//SIMULATIONS
	const pedSimulation = PedSimulation({
		x,y,w,h,
		detectionRange:[.3, .52]
	});
	pedSimulation.call(null, root);

	const carSimulation = CarSimulation({
		x,y,w,h
	});
	carSimulation.call(null, root);

	//Event dispatch
	pedSimulation
		.on('ped:enterRoad', () => console.log('ped:enterRoad'))
		.on('ped:clearRoad', () => console.log('ped:clearRoad'));


}

init();