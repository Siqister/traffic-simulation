import {randomNormal} from 'd3';
import {CROSSING_BOUND, CAR_LANE_W, CAR_LANE_E, BASE_SPEED} from './config.js';

export function delay(mean, std){
	const randomGenerator = randomNormal(mean, std);
	return function(){
		return new Promise((resolve, reject) => setTimeout(resolve, Math.max(randomGenerator(), mean*.25)));
	}
}

//for seeding pedestrians, cars, and streetcars
export function seedPedestrian({w,h}){

	const direction = Math.random()<0.33; //directionality of travel; true = from south to north

	//all velocities are in un-normalized cartesian space
	const ySpeed = BASE_SPEED * (Math.random()*0.5 + 1);
	const _vy = direction ? -ySpeed : ySpeed;
	const _vx = 0.01*Math.random() - 0.005;
	const x0 = Math.min(...CROSSING_BOUND) * w;
	const x1 = Math.max(...CROSSING_BOUND) * w;
	const y0 = direction ? h : 0;

	return {
		id: Date.now(),
		x: x0 + Math.random() * (x1 - x0),//in un-normalized cartesian space
		y: y0, //in un-normalized cartesian space
		_vx,
		_vy,
		_vx0:_vx,
		_vy0:_vy,
		r: 7 + Math.random()*5,
		pplId: Math.floor(Math.random()*6)
	}
}

export function seedCar({w,h}){

	const direction = false; //true = from east to west

	const xSpeed = BASE_SPEED * 2.5;
	const _vx = direction? -xSpeed : xSpeed;
	const _vy = 0;
	const x0 = direction? w : 0;
	const y0 = direction? CAR_LANE_W*h : CAR_LANE_E*h;

	return {
		id: Date.now(),
		x: x0,
		y: y0,
		_vx,
		_vy,
		_vx0:_vx,
		_vy0:_vy
	}
}

export function cartesianToIso({w,h}){
	//transform coordinates from Cartesian plane defined by [0,0], [w,h]
	//to isometric screen coordinates (with assumed 0,0 at the upper left corner)
	return function([x,y]){
		return [
			x * Math.cos(Math.PI/6) + (h-y) * Math.cos(Math.PI/6),
			x/2 + y/2
		];
	}
}

export function loadImage(url){
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.addEventListener('load', () => {
			resolve(img);
		});
		img.src = url;
	});
}