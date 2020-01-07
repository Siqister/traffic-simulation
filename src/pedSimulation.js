import 'babel-polyfill'; 
import {forceSimulation, forceCollide, dispatch} from 'd3';

import Movement from './forceMovement.js';
import {delay, seedPedestrian, cartesianToIso} from './utils.js';
import {PED_MARGIN} from './config.js';

export default function PedSimulation({x,y,w,h,iso=true,detectionRange=[]}={}){

	//Simulation takes place in un-normalized cartesian space with x: 0->w, y: h->0
	//parameters [x,y] help to translate simulation in place, and [w,h] help to scale the simulation

	//Defaults
	let randomDelay = delay(5000,4000);
	const isoConverter = cartesianToIso({w,h});
	const movement = Movement().yStops(h/3, h/3*2);
	let data = [];

	//Internal state
	let pedInRoad = false;

	//Dispatch
	const dispatcher = dispatch('ped:enterRoad', 'ped:clearRoad');

	//Pedestrian simulation logic
	//Each particle moves according to initial velocity + collision detection
	//Velocity decay applies to collision detection only
	//Simulation is always running
	const simulation = forceSimulation()
		.force('movement', movement)
		.force('collide', forceCollide(d => d.r).strength(0.4))
		.velocityDecay(0.3)
		.alphaMin(-Math.infinity);

	async function exports(root){

		//Set up basic <svg> scaffolding
		const container = root.append('g')
			.attr('class', 'simulation-container ped')
			.attr('transform', `translate(${x},${y})`);

		//Add initial DOM elements
		let nodes = container.selectAll('.node')
			.data(data, d => d.id)
			.enter()
			.append('g').attr('class', 'node');

		//Simulation iteration
		simulation.nodes(data)
			.on('tick', () => { 
				//Update particle locations
				nodes.attr('transform', d => {
					const {x,y} = d;
					const [isoX, isoY] = isoConverter([x,y]);
					return iso? `translate(${isoX}, ${isoY})`: `translate(${x}, ${y})`;
				});

				//Logic for detection
				//Differentiate between N->S peds and S->N peds
				const northSouth = data.filter(d => d._vy0 >= 0)
					.filter(d => d.y < detectionRange[1]*h-PED_MARGIN && d.y > detectionRange[0]*h-PED_MARGIN);
				const southNorth = data.filter(d => d._vy0 < 0)
					.filter(d => d.y < detectionRange[1]*h+PED_MARGIN && d.y > detectionRange[0]*h+PED_MARGIN);
				const detected = northSouth.length || southNorth.length;

				//Based on previous state, emit events
				if(pedInRoad){
					if(!detected){
						pedInRoad = false;
						dispatcher.call('ped:clearRoad', null, {});
					}
				}else{
					if(detected){
						pedInRoad = true;
						dispatcher.call('ped:enterRoad', null, {});
					}
				}

			});

		//Seed new particle (pedestrian)
		while(true){
			await randomDelay();
			
			//See new particle
			data.push(seedPedestrian({w,h}));

			//Filter out objects that are out of bound
			data = data.filter(d => d.y >= 0 && d.y <= h && d.x >= 0 && d.x <= w);

			//With updated data, re-initialize simulation
			simulation.nodes(data);

			//Rebind to DOM
			nodes = container.selectAll('.node')
				.data(data, d => d.id);
			let nodesEnter = nodes.enter()
				.append('g').attr('class', 'node');
				nodesEnter.append('use').attr('xlink:href', () => {
						const id = Math.floor(1 + Math.random()*6); //TODO check this later
						return `#ppl-${id}`;
					})
					.attr('y',-30);
				nodesEnter.append('circle').attr('r',2).style('fill','red');
				//nodesEnter.append('line');
			nodes.exit().remove();
			nodes = nodes.merge(nodesEnter);
		}
	}

	exports.stopped = function(_){
		movement.stopped(_);
		return this;
	}

	exports.on = function(...args){
		dispatcher.on(...args);
		return this;
	}

	return exports;
}