
function align(x, y) {
	return Math.floor((x + (y - 1)) / y) * y;
}

function LoadWorld(name, callback) {
	var start = new Date().getTime();
	/*var request = new XMLHttpRequest();
	request.open("GET", name, true);
	request.responseType = "arraybuffer";

	request.onload = */

	download("world.bin", function(data) {
		var buffer = data;//request.response;

		var header = new Uint32Array(buffer, 0, 16);

		if(header[0] != 0x4C574F41) console.error("NOPE");

		var offset = 64;

		var planes = new Float32Array(buffer, offset, header[1] * 4);
		offset += header[1] * 16;

		var nodes = [new Uint16Array(buffer, offset, header[2] * 4), new Int16Array(buffer, offset, header[2] * 4)];
		offset += header[2] * 8;

		var leaves = new Uint16Array(buffer, offset, header[3] * 4);
		offset += header[3] * 8;

		var vertices = new Float32Array(buffer, offset, header[4] * 3);
		offset += header[4] * 12;

		var triangles = new Uint16Array(buffer, offset, header[5] * 3);
		offset += header[5] * 6;

		offset = align(offset, 4);

		var displacements = [new Float32Array(buffer, offset, header[6] * 16), new Uint32Array(buffer, offset, header[6] * 16), new Uint16Array(buffer, offset, header[6] * 32)];
		offset += header[6] * 64;

		var displacement_vertices = new Float32Array(buffer, offset, header[7] * 5);
		offset += header[7] * 20;

		var entities = new Uint8Array(buffer, offset, header[8]);
		offset += header[8];

		console.log(displacements[0].length / 16 + " displacements");
		console.log(displacement_vertices.length / 5 + " displacement vertices");

		var index = 0;
		window.entities = [];
		var start = new Date().getTime();

		while(index < entities.length) {
			var entity = {};
			var pairs = entities[index + 0] | entities[index + 1] << 8;
			index += 2;

			for(var i = 0; i < pairs; ++i) {
				var pair = entities[index + 0] | entities[index + 1] << 8;
				var key_length = pair >> 10 & 31;
				var value_length = pair & 1023;

				var key = String.fromCharCode.apply(null, entities.subarray(index + 2, index + 2 + key_length));
				var value = String.fromCharCode.apply(null, entities.subarray(index + 2 + key_length, index + 2 + key_length + value_length));
				//console.log(key + " = " + value);
				entity[key] = value;

				index += 2 + key_length + value_length;
			}

			window.entities.push(entity);
		}

		console.log("Loaded entities in " + Math.round(new Date().getTime() - start) / 1000 + " seconds");

		/*var min_length = 10000;
		var min_index = -1;

		for(var i = 0; i < displacements[0].length / 4; ++i) {
			var offset = [displacements[0][i * 4 + 0] - orientation[0], displacements[0][i * 4 + 1] - orientation[1], displacements[0][i * 4 + 2] - orientation[2]];
			var length = Math.sqrt(offset[0] * offset[0] + offset[1] * offset[1] + offset[2] * offset[2]);

			if(length < min_length) {
				min_length = length;
				min_index = i;
			}
		}

		console.log(min_index);*/

		/*for(var i = 0; i < displacement_vertices.length / 4; ++i) {
			console.log(displacement_vertices[i * 4 + 3]);
		}*/

		//var models = [new Float32Array(buffer, offset, header[4] * 4), new Uint32Array(buffer, offset, header[4] * 4)];
		//offset += header[4] * 16;

		//var indices = new Uint16Array(buffer, offset, (buffer.byteLength - offset) / 2);

		callback([planes, nodes, leaves, vertices, triangles, displacements, displacement_vertices], (new Date().getTime() - start) / 1000.0);

		/*var edges = new Uint16Array(buffer, offset, header[4] * 2);
		offset += header[4] * 4;

		var surfedges = new Int32Array(buffer, offset, header[5]);
		offset += header[5] * 4;

		var faces = [new Uint32Array(buffer, offset, header[6] * 2), new Uint16Array(buffer, offset, header[6] * 4)];
		offset += header[6] * 8;

		callback([planes, nodes, leaves, vertices, edges, surfedges, faces], (new Date().getTime() - start) / 1000);*/
	});

	//request.send(null);
}

LoadWorld("world.bin", function(world, elapsed) {
	window.world = world;
	console.log("loaded world in " + elapsed + " seconds");
	console.log(world[0].length / 4 + " planes, " + world[1][0].length / 4 + " nodes, " + world[2].length / 4 + " leaves, " + world[3].length / 3 + " vertices, ");// + world[4].length / 2 + " edges, " + world[5].length + " surfedges, " + world[6][0].length / 2 + " faces");
	//console.log(world[4].length / 2 + " faces, " + world[5].length + " indices");
});

var lastleaf = 0;

function getLeaf(position) {
	if(!window.world) return -1;

	var index = 0, depth = 0;

	while(index >= 0) {
		var node = world[1][1].subarray(index * 4, index * 4 + 4);
		var node2 = world[1][0].subarray(index * 4, index * 4 + 4);
		var plane_index = Math.floor(node2[0] / 2);
		var plane_invert = node2[0] & 1;
		var plane = world[0].subarray(plane_index * 4, plane_index * 4 + 4);
		var distance = (position[0] * plane[0] + position[1] * plane[1] + position[2] * plane[2]) - plane[3];
		if(plane_invert) distance = -distance;
		index = distance >= 0.0 ? node[1] : node[2];
		++depth;
	}

	index = -1 - index;

	if(index != lastleaf) {
		var leaf = world[2].subarray(index * 4, index * 4 + 4);
		console.log("leaf " + index + ", cluster " + leaf[0] + ", area " + leaf[1] + ", contents " + leaf[2]);
		if(leaf[2] & 32) new Audio("/output/player/survivor/voice/coach/worldc2m3b06.mp3").play();
		lastleaf = index;
	}

	return index;
}

function findByClass(name) {
	var regexp = new RegExp(name, "ig");
	var output = [];

	if(window.entities) {
		for(var i = 0; i < entities.length; ++i) {
			if(regexp.test(entities[i].classname)) {
				output.push(entities[i]);
			}
		}
	}

	return output;
}

function findByModel(name) {
	var regexp = new RegExp(name, "ig");
	var output = [];

	if(window.entities) {
		for(var i = 0; i < entities.length; ++i) {
			if(regexp.test(entities[i].model)) {
				output.push(entities[i]);
			}
		}
	}

	return output;
}
