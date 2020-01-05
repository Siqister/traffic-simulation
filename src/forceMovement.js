export default function(){

	let nodes;
	let yStops;
	let stopped = false;
	const stoppingDistance = 20;

	function force(alpha){
		for(let i = 0, n = nodes.length, node; i < n; ++i){

			//Each node moves according to its desired velocity
			node = nodes[i];
			node.x += node._vx;
			node.y += node._vy;

			//
			if(stopped){
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
			}else{
				node._vx = node._vx0;
				node._vy = node._vy0;
			}

		}
	}

	force.initialize = function(_){
		nodes = _;
	}

	force.yStops = function(...stops){
		yStops = stops;
		return this;
	}

	force.stopped = function(_){
		stopped = _;
		return this;
	}

	return force;
}