import 'babel-polyfill'; 
import {forceSimulation, forceCollide, dispatch, select} from 'd3';

import Movement from './forceMovement.js';
import {delay, seedPedestrian, seedCar, cartesianToIso, loadImage} from './utils.js';
import {PED_MARGIN, CAR_MARGIN} from './config.js';

import carSvgUrl from './assets/car-01.svg';

export default function PedSimulation({x,y,w,h,iso=true,detectionRange=[]}={}){

	//Simulation takes place in un-normalized cartesian space with x: 0->w, y: h->0
	//parameters [x,y] help to translate simulation in place, and [w,h] help to scale the simulation

	//Defaults
	const isoConverter = cartesianToIso({w,h});
	let ctx;
	let cWidth;
	let cHeight;
	let pplPathData = [];

	//Internal state
	let pedInRoad = false;

	//Dispatch
	const dispatcher = dispatch('ped:enterRoad', 'ped:clearRoad', 'car:enterCrossing', 'car:clearCrossing');

	//Pedestrian simulation logic
	//Each particle moves according to initial velocity + collision detection
	//Velocity decay applies to collision detection only
	//Simulation is always running
	const pedMovement = Movement().yStops(h/3, h/3*2);
	let pedData = [];
	const pedSimulation = forceSimulation()
		.force('movement', pedMovement)
		.force('collide', forceCollide(d => d.r).strength(0.4))
		.velocityDecay(0.3)
		.alphaMin(-Math.infinity);

	//Car simulation logic
	const carMovement = Movement();
	let carData = [];
	const carSimulation = forceSimulation()
		.force('movement', carMovement)
		.alphaMin(-Math.infinity);
	let carImg;

	async function exports(root, canvas){

		//Canvas context
		ctx = canvas.node().getContext('2d');
		cWidth = canvas.node().clientWidth;
		cHeight = canvas.node().clientHeight;

		//Load car image
		carImg = await loadImage(carSvgUrl);

		//Look up path "d" for images of pedestrians
		root.select('#lib').selectAll('path').each(function(){
			pplPathData.push(select(this).attr('d'));
		});

		//Translate 2D context in place
		ctx.translate(x,y);
		ctx.fillStyle = '#ffe340';
		ctx.strokeStyle = '#4d4d4f';

		//Start animation
		_update();

		//Ped simulation:
		//Simulation results are stored in data
		//Randomly seed new pedestrian
		pedSimulation.nodes(pedData).stop(); //tick this simulation manually using requestAnimationFrame
		_seedNewParticle(2000, 200, () => {
			//Seed new particle, and filter out particles out of bound
			pedData.push(seedPedestrian({w,h}));
			pedData = pedData.filter(d => d.y >= 0 && d.y <= h && d.x >= 0 && d.x <= w)
				.sort((a,b) => a.y - b.y);

			//Re-initialize simulation with updated data
			pedSimulation.nodes(pedData);
		});

		//Car simulation:
		carSimulation.nodes(carData).stop();
		_seedNewParticle(13000, 6000, () => {
			carData.push(seedCar({w,h}));
			carData = carData.filter(d => d.x >= 0 && d.x <= w);
			carSimulation.nodes(carData);
		});


		//TODO: LRT simulation:

	}

	function _update(){
		ctx.clearRect(0,0,cWidth,cHeight);
		_updatePedSimulation();
		_updateCar();
		requestAnimationFrame(_update);
	}

	function _updatePedSimulation(){

		pedSimulation.tick(); //manually update force simulation; doesn't trigger events


		//DRAW
		const circles = new Path2D();

		ctx.fillStyle = '#ffe340';
		pedData.forEach(d => {
			const {x:dx,y:dy,pplId} = d;
			const [isoX, isoY] = isoConverter([dx,dy]);
			const path = new Path2D(pplPathData[pplId]);

			ctx.translate(isoX, isoY-30);
			ctx.fill(path);
			ctx.stroke(path);
			ctx.translate(-isoX, -isoY+30);

			circles.moveTo(isoX, isoY);
			circles.arc(isoX, isoY, 2, 0, Math.PI*2);
		});
		ctx.fillStyle = 'black';
		ctx.fill(circles);

		//DETECTION
		//Differentiate between N->S peds and S->N peds
		const northSouth = pedData.filter(d => d._vy0 >= 0)
			.filter(d => d.y < detectionRange[1]*h-PED_MARGIN && d.y > detectionRange[0]*h-PED_MARGIN);
		const southNorth = pedData.filter(d => d._vy0 < 0)
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
	}

	function _updateCar(){

		carSimulation.tick();

		//DRAW
		const circles = new Path2D();

		ctx.fillStyle = 'blue';
		carData.forEach(d => {
			const {x:dx,y:dy,pplId} = d;
			const [isoX, isoY] = isoConverter([dx,dy]);

			ctx.drawImage(carImg, isoX-56, isoY-39, 112, 78);

			circles.moveTo(isoX, isoY);
			circles.arc(isoX, isoY, 2, 0, Math.PI*2);
		});
		ctx.fill(circles);
		ctx.stroke(circles);

		//DETECTION
		

	}

	async function _seedNewParticle(mean, std, cb){

		const randomDelay = delay(mean, std);

		while(true){
			await randomDelay();
			cb();
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