import * as d3 from 'd3';
import 'babel-polyfill'; 

import './style.css';
import url from './assets/test-01-01.svg';

import movement from './forceMovement.js';
import {delay} from './utils.js';

import PedSimulation from './pedSimulation.js';

const init = async function(){

	const svg = await d3.svg(url)
		.then(doc => d3.select(doc).select('svg')); //d3 selection

	//Append root <svg> to document
	d3.select('#animation').append(() => svg.node());

	//Compute bounding dimensions for various simulations
	const bound = svg.select('#box-1').select('rect');
	const x = +bound.attr('x');
	const y = +bound.attr('y');
	const w = +bound.attr('width');
	const h = +bound.attr('height');
	//Stop locations

	//Compute mapping between cartesian and isometric

	//SIMULATIONS
	const pedSimulation = PedSimulation({x,y,w,h});
	pedSimulation.call(null, svg);

	

	// //TODO
	// d3.select('.main').append('button').html('Pause')
	// 	.on('click', function(){
	// 		if(d3.select(this).datum() === true){
	// 			d3.select(this).datum(false);
	// 			pedSimulation.stopped(false);
	// 			console.log('Peds go')
	// 		}else{
	// 			d3.select(this).datum(true);
	// 			pedSimulation.stopped(true);
	// 			console.log('Peds stop')
	// 		}
	// 	});

}

init();