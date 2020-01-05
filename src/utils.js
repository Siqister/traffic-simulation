import {randomNormal} from 'd3';

export function delay(t, std){
	const randomGenerator = randomNormal(t, std);
	return function(){
		return new Promise((resolve, reject) => setTimeout(resolve, randomGenerator()));
	}
}

//for seeding pedestrians, cars, and streetcars
export function seedPedestrian({x,y,w,h}){

	const direction = Math.random()<0.33; //true = from south to north
	const speed = 0.1 + Math.random()*0.2;
	const _vy = direction ? -speed : speed;
	const _vx = 0.01*Math.random() - 0.005;

	return {
		id: Date.now(),
		x: x + Math.random()*w,
		y: direction ? (y+h) : y,
		_vx,
		_vy,
		_vx0:_vx,
		_vy0:_vy,
		r: 5 + Math.random()*3
	}
}