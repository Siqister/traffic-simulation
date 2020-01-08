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
	BASE_SPEED
} from './config.js';

import carSvgUrl from './assets/car-01.svg';
import lrtWestUrl from './assets/lrt_lrt-w.svg';
import lrtEastUrl from './assets/lrt_lrt-e.svg';


//TODO: image size
const LRT_IMG_WIDTH = 560;
const LRT_IMG_HEIGHT = 410;

export default function PedSimulation({
	x,y,w,h,
	iso=true,
	roadBound=ROAD_BOUND, 
	crossingBound=CROSSING_BOUND,
	lrtBound=LRT_BOUND
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
		'lrt:clearCrossing'
	);

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

	//LRT simulation logic
	const lrtMovement = Movement(); //LRT will not stop
	let lrtData = [];
	const lrtSimulation = forceSimulation()
		.force('movement', lrtMovement)
		.alphaMin(-Math.infinity);
	let lrtLine, lrtOutline;

	async function exports(root, canvas){

		//Canvas context
		ctx = canvas.node().getContext('2d');
		cWidth = canvas.node().clientWidth;
		cHeight = canvas.node().clientHeight;

		//Load car image
		carImg = await loadImage(carSvgUrl);

		//Look up path "d" for images of pedestrians and LRT
		root.select('#lib').selectAll('path').each(function(){
			pplPathData.push(select(this).attr('d'));
		});
		lrtLine = root.select('#lib').select('#lrt-outline_1_').attr('d');
		lrtOutline = root.select('#lib').select('#lrt-line').attr('d');

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
				carData = carData.filter(d => d.x >= -CAR_PADDING && d.x <= w+CAR_PADDING);
			}, () => carData.length < 3 
		); //up to two cars at a time

		//TODO: LRT simulation:
		lrtSimulation.nodes(lrtData).stop();
		_seedNewParticle(300, 5000, () => {
			lrtData.push(seedLrt({w,h}));
			lrtSimulation.nodes(lrtData);
		}, () => {
			lrtData = lrtData.filter(d => d.x >= -LRT_PADDING && d.x <= w+LRT_PADDING);
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

	async function _seedNewParticle(mean, std, seed, update, space=()=>true, logger=()=>{}){

		const randomDelay = delay(mean, std);

		while(true){
			await randomDelay();
			if(space()){ seed(); }
			update();
		}
	}

	exports.on = function(...args){
		dispatcher.on(...args);
		return this;
	}

	return exports;
}