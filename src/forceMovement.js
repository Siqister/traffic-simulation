import {BASE_SPEED} from './config.js'

export default function(){

	let nodes;
	let xStops;
	let yStops;
	let stopped = false;
	let stoppingDistance = 20;

	function force(alpha){

		let xStopWest, xStopEast;

		for(let i = 0, n = nodes.length, node; i < n; ++i){

			//Each node moves according to its desired velocity
			node = nodes[i];
			node.x += node._vx;
			node.y += node._vy;

			if(stopped){

				if(xStops){
					const crossingWest = Math.min(...xStops);
					const crossingEast = Math.max(...xStops);

					//Logic for car stopping
					if(node._vx > 0){ 
					//for cars going from west to east
						if(node.x < crossingEast){
						//apply to any car that hasn't cleared crossing
							if(!xStopWest){ xStopWest = Math.max(node.x+stoppingDistance/3, crossingWest-70); } //for first car in queue only
							node._vx = Math.min(Math.max((xStopWest - node.x)/stoppingDistance, 0), 1) * node._vx;
							xStopWest -= 120; //move stopping line back progressively for each subsequent car
						}
					}else{
					//going from east to west

					}
				}

				if(yStops){
					const yStopNorth = Math.min(...yStops);
					const yStopSouth = Math.max(...yStops);

					//deal with 4 cases
					if(node._vy > 0){
						//for north-to-south objects...
						if(node.y < yStopNorth){
							node._vy = Math.min((yStopNorth - node.y)/stoppingDistance,1) * node._vy;
						}else{
							//no-op, let them pass through
						}
					}else{
						//for south-to-north objects...
						if(node.y > yStopSouth){
							node._vy = Math.min((node.y - yStopSouth)/stoppingDistance, 1) * node._vy;
						}else{
							//no-op, let them pass through
						}
					}
				}

			}else{
				node._vx = Math.min(node._vx0, node._vx + 1/(i*5+1)*BASE_SPEED/20); //stagger accleration
				node._vy = node._vy0;
			}

		}
	}

	force.initialize = function(_){
		nodes = _;
	}

	force.xStops = function(...stops){
		xStops = stops;
		return this;
	}

	force.yStops = function(...stops){
		yStops = stops;
		return this;
	}

	force.stoppingDistance = function(_){
		stoppingDistance = _;
		return this;
	}

	force.stopped = function(_){
		if(_ === undefined){ return stopped; }
		stopped = _;
		return this;
	}

	return force;
}