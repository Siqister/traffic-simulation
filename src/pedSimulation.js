import 'babel-polyfill'; 
import {forceSimulation, forceCollide, dispatch, select} from 'd3';

import Movement from './forceMovement.js';
import {delay, seedPedestrian, seedCar, cartesianToIso, loadImage} from './utils.js';
import {PED_MARGIN, CAR_MARGIN, ROAD_BOUND, CROSSING_BOUND} from './config.js';

import carSvgUrl from './assets/car-01.svg';

export default function PedSimulation({x,y,w,h,iso=true,roadBound=ROAD_BOUND, crossingBound=CROSSING_BOUND}={}){

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
	let carInCrossing = false;

	//Dispatch
	const dispatcher = dispatch('ped:enterRoad', 'ped:clearRoad', 'car:enterCrossing', 'car:clearCrossing');

	//Pedestrian simulation logic
	//Each particle moves according to initial velocity + collision detection
	//Velocity decay applies to collision detection only
	//Simulation is always running
	const pedMovement = Movement().yStops(roadBound[0]*h, roadBound[1]*h);
	let pedData = [];
	const pedSimulation = forceSimulation()
		.force('movement', pedMovement)
		.force('collide', forceCollide(d => d.r).strength(0.4))
		.velocityDecay(0.3)
		.alphaMin(-Math.infinity);

	//Car simulation logic
	const carMovement = Movement().xStops(crossingBound[0]*w, crossingBound[1]*w);
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

		//Iniitialize (x,y)
		ctx.fillStyle = '#ffe340';
		ctx.strokeStyle = '#4d4d4f';

		//Start animation
		_update();

		//Ped simulation:
		//Simulation results are stored in data
		//Randomly seed new pedestrian
		pedSimulation.nodes(pedData).stop(); //tick this simulation manually using requestAnimationFrame
		_seedNewParticle(300, 6000, () => {
			pedData.push(seedPedestrian({w,h})); //Seed new particle, and filter out particles out of bound
			pedSimulation.nodes(pedData); //Re-initialize simulation with updated data
		}, () => {
			pedData = pedData
				.filter(d => d.y >= 0 && d.y <= h && d.x >= 0 && d.x <= w)
				.sort((a,b) => a.y - b.y);
		});

		//Car simulation:
		carSimulation.nodes(carData).stop();
		_seedNewParticle(3000, 6000, () => {
				carData.push(seedCar({w,h}));
				carSimulation.nodes(carData);
			}, () => {
				carData = carData.filter(d => d.x >= -200 && d.x <= w+200);
			},
			() => carData.length < 3 
		); //up to two cars at a time

		//TODO: LRT simulation:


		//Event dispatch between simulations
		dispatcher.on('ped:enterRoad.simulation', () => {
			carMovement.stopped(true);
		});
		dispatcher.on('ped:clearRoad.simulation', () => {
			carMovement.stopped(false);
		});
		dispatcher.on('car:enterCrossing.simulation', () => {
			pedMovement.stopped(true);
		});
		dispatcher.on('car:clearCrossing.simulation', () => {
			pedMovement.stopped(false);
		});

	}

	function _update(){
		ctx.clearRect(0,0,cWidth,cHeight);
		ctx.translate(x,y);

		_updateCar();
		_updatePedSimulation();

		ctx.translate(-x, -y);
		requestAnimationFrame(_update);
	}

	function _updatePedSimulation(){

		pedSimulation.tick(); //manually update force simulation; doesn't trigger events

		//DRAW
		const circles = new Path2D();
		const lines = new Path2D();

		ctx.fillStyle = '#ffe340';
		pedData.forEach(d => {
			const {x:dx, y:dy, _vx, _vy, vx, vy, pplId} = d;
			const [isoX, isoY] = isoConverter([dx, dy]);
			const [isoXTarget, isoYTarget] = isoConverter([dx+(d._vx+d.vx)*30, dy+(d._vy+d.vy)*30]);
			const path = new Path2D(pplPathData[pplId]);

			ctx.translate(isoX, isoY-30);
			ctx.fill(path);
			ctx.stroke(path);
			ctx.translate(-isoX, -isoY+30);

			circles.moveTo(isoX, isoY);
			circles.arc(isoX, isoY, 2, 0, Math.PI*2);
			lines.moveTo(isoX, isoY);
			lines.lineTo(isoXTarget, isoYTarget);
		});
		ctx.fillStyle = 'black';
		ctx.fill(circles);
		ctx.stroke(lines);

		//DETECTION
		//Differentiate between N->S peds and S->N peds
		const northSouth = pedData.filter(d => d._vy0 >= 0)
			.filter(d => d.y < roadBound[1]*h && d.y > roadBound[0]*h-PED_MARGIN);
		const southNorth = pedData.filter(d => d._vy0 < 0)
			.filter(d => d.y < roadBound[1]*h+PED_MARGIN && d.y > roadBound[0]*h);
		const detected = northSouth.length || southNorth.length;

		//Based on previous state, emit events
		if(pedInRoad){
			if(!detected){
				pedInRoad = false;
				dispatcher.call('ped:clearRoad', null, {});
			}
		}else{
			if(detected && !pedMovement.stopped()){
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

			ctx.drawImage(carImg, isoX-56, isoY-39, 112, 85);

			circles.moveTo(isoX, isoY);
			circles.arc(isoX, isoY, 2, 0, Math.PI*2);
		});
		ctx.fill(circles);
		ctx.stroke(circles);

		//DETECTION
		const detected = carData.filter(d => d.x > crossingBound[0]*w && d.x < crossingBound[1]*w).length > 0;
		if(carInCrossing){
			if(!detected){
				carInCrossing = false;
				dispatcher.call('car:clearCrossing', null, {});
			}
		}else{
			if(detected){
				carInCrossing = true;
				dispatcher.call('car:enterCrossing', null, {});
			}
		}
		

	}

	async function _seedNewParticle(mean, std, seed, update, space=()=>true, logger=()=>{}){

		const randomDelay = delay(mean, std);

		while(true){
			await randomDelay();
			if(space()){ seed(); }
			update();
			//logger(); //logs current state of the car queue
		}
	}

	exports.on = function(...args){
		dispatcher.on(...args);
		return this;
	}

	return exports;
}