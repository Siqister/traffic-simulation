import 'babel-polyfill'; 
import {forceSimulation, forceCollide} from 'd3';

import Movement from './forceMovement.js';
import {delay, seedPedestrian} from './utils.js';

export default function PedSimulation({x,y,w,h}){

	//Simulation takes place in normalized cartesian space with x: 0->1, y: 0->1
	//parameters [x,y] help to translate simulation in place, and [w,h] help to scale the simulation

	//Defaults
	let delayGenerator = delay(1500,1000);
	const movement = Movement().yStops(y+h/3, y+h/3*2);
	let data = [];

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
			.attr('class', 'simulation-container');

		//Add initial DOM elements
		let nodes = container.selectAll('.node')
			.data(data, d => d.id)
			.enter()
			.append('g').attr('class', 'node');

		//Start simulation
		simulation.nodes(data)
			.on('tick', () => { 
				nodes.attr('transform', d => `translate(${d.x}, ${d.y})`)
					.select('line')
					.attr('x1', d => (d._vx+d.vx)*100).attr('y1', d => (d._vy+d.vy)*100).style('stroke','purple').style('stroke-width','1px');
			});

		//Start to generate new simulated objects
		while(true){
			await delayGenerator();
			
			//Generate new object
			data.push(seedPedestrian({x,y,w,h}));

			//Filter out objects that are out of bound
			data = data.filter(d => d.y >= y && d.y <= y+h && d.x >= x && d.x <= x+w);

			//With updated data, re-run simulation
			simulation.nodes(data);

			//Rebind to DOM
			nodes = container.selectAll('.node')
				.data(data, d => d.id);
			let nodesEnter = nodes.enter()
				.append('g').attr('class', 'node');
				nodesEnter.append('circle').attr('r',5).style('fill','red');
				nodesEnter.append('line').attr('x1', d => (d._vx+d.vx)*100).attr('y1', d => (d._vy+d.vy)*100).style('stroke','purple').style('stroke-width','1px');
			nodes.exit().remove();
			nodes = nodes.merge(nodesEnter);
		}
	}

	exports.stopped = function(_){
		movement.stopped(_);
	}

	return exports;
}