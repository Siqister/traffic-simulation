export default function LightSimulation(){

	let lights;

	function exports(root){

		//TODO:
		//Grab lighting elements
		lights = root.selectAll('polygon').style('fill','#ffe340');
		lights.style('fill-opacity', 0);

	}

	exports.turnOn = function(_){
		lights.style('fill-opacity', 1);
	}

	exports.turnOff = function(_){
		lights.style('fill-opacity', 0);
	}

	return exports;

}