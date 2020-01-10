import 'babel-polyfill'; 
import {forceSimulation, forceCollide, dispatch, select} from 'd3';

import Movement from './forceMovement.js';
import {delay, seedPedestrian, seedCar, seedLrt, cartesianToIso, loadImage} from './utils.js';
import {
	PED_MARGIN, 
	CAR_MARGIN, 
	LRT_MARGIN,
	LRT_LENGTH,
	CAR_PADDING,
	LRT_PADDING,
	ROAD_BOUND, 
	CROSSING_BOUND,
	LRT_BOUND,
	BASE_SPEED,
	PED_MEAN,
	PED_STD,
	CAR_MEAN,
	CAR_STD,
	LRT_MEAN,
	LRT_STD,
} from './config.js';

import carSvgUrl from './assets/car-01.svg';

//TODO: image size
const LRT_IMG_WIDTH = 560;
const LRT_IMG_HEIGHT = 410;

export default function PedSimulation({
	x,y,w,h,
	iso=true,
	roadBound=ROAD_BOUND, 
	crossingBound=CROSSING_BOUND,
	lrtBound=LRT_BOUND,
	pedData=[],
	carData=[],
	lrtData=[]
}={}){

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
	let lrtInCrossing = false;

	//Dispatch
	const dispatcher = dispatch(
		'ped:enterRoad', 
		'ped:clearRoad', 
		'car:enterCrossing', 
		'car:clearCrossing',
		'lrt:enterCrossing',
		'lrt:clearCrossing',
		'dataUpdated'
	);

	//Random delay
	let pedDelay = delay(PED_MEAN, PED_STD, true);
	let carDelay = delay(CAR_MEAN, CAR_STD);
	let lrtDelay = delay(LRT_MEAN, LRT_STD);

	//Pedestrian simulation logic
	//Each particle moves according to initial velocity + collision detection
	//Velocity decay applies to collision detection only
	//Simulation is always running
	const pedMovement = Movement().yStops(roadBound[0]*h, roadBound[1]*h);
	const pedSimulation = forceSimulation()
		.force('movement', pedMovement)
		.force('collide', forceCollide(d => d.r).strength(0.4))
		.velocityDecay(0.3)
		.alphaMin(-Math.infinity);

	//Car simulation logic
	const carMovement = Movement().xStops(crossingBound[0]*w, crossingBound[1]*w);
	const carSimulation = forceSimulation()
		.force('movement', carMovement)
		.alphaMin(-Math.infinity);
	let carImg;

	//LRT simulation logic
	const lrtMovement = Movement(); //LRT will not stop
	const lrtSimulation = forceSimulation()
		.force('movement', lrtMovement)
		.alphaMin(-Math.infinity);
	let lrtLine, lrtOutline;

	async function exports(root, canvas){

		//DOM preparation
		//Canvas context
		ctx = canvas.node().getContext('2d');
		cWidth = canvas.node().clientWidth;
		cHeight = canvas.node().clientHeight;
		ctx.fillStyle = '#ffe340';
		ctx.strokeStyle = '#4d4d4f';

		//Load prepared images
		carImg = await loadImage(carSvgUrl);
		root.select('#lib').selectAll('path').each(function(){
			pplPathData.push(select(this).attr('d'));
		});
		lrtLine = root.select('#lib').select('#lrt-outline_1_').attr('d');
		lrtOutline = root.select('#lib').select('#lrt-line').attr('d');


		//TICK ANIMATION LOOP
		pedSimulation.nodes(pedData).stop(); //tick this simulation manually using requestAnimationFrame
		carSimulation.nodes(carData).stop();
		lrtSimulation.nodes(lrtData).stop();
		_update();


		//SEED NEW PARTICLES
		_seedNewParticle(pedDelay, () => {
			pedData.push(seedPedestrian({w,h})); //Seed new particle, and filter out particles out of bound
			pedSimulation.nodes(pedData); //Re-initialize simulation with updated data
		}, () => {
			//Pedestrians to be removed
			const removed = pedData.filter(d => d.y < 0 || d.y > h || d.x < 0 || d.x > w)
				.reduce((acc,v) => {
					acc.count += 1;
					acc.delay += v.delay;
					return acc;
				}, {count:0, delay:0});
			const count = (pedData.count || 0) + removed.count;
			const delay = (pedData.delay || 0) + removed.delay;

			//Update
			pedData = pedData
				.filter(d => d.y >= 0 && d.y <= h && d.x >= 0 && d.x <= w)
				.sort((a,b) => a.y - b.y);
			pedData.count = count;
			pedData.delay = delay;
			dispatcher.call('dataUpdated', null, pedData, carData, lrtData);
		});

		//Car simulation:
		_seedNewParticle(carDelay, () => {
			carData.push(seedCar({w,h}));
			carSimulation.nodes(carData);
		}, () => {
			//Cars to be removed
			const removed = carData.filter(d => d.x < -CAR_PADDING || d.x > w+CAR_PADDING)
				.reduce((acc,v) => {
					acc.count += 1;
					acc.delay += v.delay;
					return acc;
				}, {count:0, delay:0});
			const count = (carData.count || 0) + removed.count;
			const delay = (carData.delay || 0) + removed.delay;

			//Update
			carData = carData.filter(d => d.x >= -CAR_PADDING && d.x <= w+CAR_PADDING);
			carData.count = count;
			carData.delay = delay;
			dispatcher.call('dataUpdated', null, pedData, carData, lrtData);
		}, () => carData.length < 3); //up to two cars at a time

		//TODO: LRT simulation:
		_seedNewParticle(lrtDelay, () => {
			lrtData.push(seedLrt({w,h}));
			lrtSimulation.nodes(lrtData);
		}, () => {
			//LRT to be removed
			const removed = lrtData.filter(d => d.x < -LRT_PADDING || d.x > w+LRT_PADDING)
				.reduce((acc,v) => {
					acc.count += 1;
					acc.delay += v.delay;
					return acc;
				}, {count:0, delay:0});
			const count = (lrtData.count || 0) + removed.count;
			const delay = (lrtData.delay || 0) + removed.delay;

			//Update
			lrtData = lrtData.filter(d => d.x >= -LRT_PADDING && d.x <= w+LRT_PADDING);
			lrtData.count = count;
			lrtData.delay = delay;
			dispatcher.call('dataUpdated', null, pedData, carData, lrtData);
		}, () => lrtData.length < 1);


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
		dispatcher.on('lrt:enterCrossing.simulation', () => {
			console.log('LRT enter!');
			pedMovement.yStops(lrtBound[0]*h, lrtBound[1]*h).stopped(true);
		});
		dispatcher.on('lrt:clearCrossing.simulation', () => {
			console.log('LRT clear!');
			pedMovement.yStops(roadBound[0]*h, roadBound[1]*h).stopped(false);
		});

	}

	function _update(){
		ctx.clearRect(0,0,cWidth,cHeight);
		ctx.translate(x,y);

		_updateCar();
		_updatePedSimulation();
		_updateLrt();

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
			const [isoXTarget, isoYTarget] = isoConverter([dx+(d._vx+d.vx)*15/BASE_SPEED, dy+(d._vy+d.vy)*15/BASE_SPEED]);
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
			const {x:dx, y:dy} = d;
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

	function _updateLrt(){

		lrtSimulation.tick();

		//DRAW
		const circles = new Path2D();
		const lrtOutlinePath = new Path2D(lrtOutline);
		const lrtLinePath = new Path2D(lrtLine);

		ctx.fillStyle = 'rgba(0, 0, 5, 0.03)';
		lrtData.forEach(d => {
			const {x:dx, y:dy} = d;
			const [isoX, isoY] = isoConverter([dx,dy]);

			ctx.translate(isoX-LRT_IMG_WIDTH/2, isoY-LRT_IMG_HEIGHT/2-25);
			ctx.fill(lrtOutlinePath);
			ctx.fill(lrtLinePath);
			ctx.translate(-isoX+LRT_IMG_WIDTH/2, -isoY+LRT_IMG_HEIGHT/2+25);

			circles.moveTo(isoX, isoY);
			circles.arc(isoX, isoY, 2, 0, Math.PI*2);
		});
		ctx.fillStyle = 'black';
		ctx.fill(circles);

		//DETECTION
		const westEast = lrtData.filter(d => d._vx>0)
			.filter(d => d.x > crossingBound[0]*w - LRT_LENGTH/2 - LRT_MARGIN && d.x < crossingBound[1]*w + LRT_LENGTH/2);
		const eastWest = lrtData.filter(d => d._vx<0)
			.filter(d => d.x > crossingBound[0]*w - LRT_LENGTH/2 && d.x < crossingBound[1]*w +LRT_LENGTH/2 + LRT_MARGIN);
		const detected = westEast.length || eastWest.length;
		if(lrtInCrossing){
			if(!detected){
				lrtInCrossing = false;
				dispatcher.call('lrt:clearCrossing', null, {});
			}
		}else{
			if(detected){
				lrtInCrossing = true;
				dispatcher.call('lrt:enterCrossing', null, {});
			}
		}

	}

	async function _seedNewParticle(delay, seed, update, space=()=>true, logger=()=>{}){

		while(true){
			await delay();
			if(space()){ seed(); }
			update();
		}
	}

	exports.updateVolume = function(type, delay){
		switch(type){
			case 'ped': 
				pedDelay = delay;
				break;
			case 'car': 
				carDelay = delay;
				break;
			case 'lrt': 
				lrtDelay = delay;
				break;
			default: 
				break;
		}
		return this;
	}

	exports.on = function(...args){
		dispatcher.on(...args);
		return this;
	}

	return exports;
}