
//var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {setTimeout(callback, 16);};

var fogcolor = [0, 0, 0];
var keyboard = [];
var forward = vec3.create();
var MOVE = false;
var canvas = document.createElement("canvas");
//canvas.width = 256, canvas.height = 256;
canvas.width = innerWidth, canvas.height = innerHeight;
var gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("experimental-webgl", {alpha: true, depth: true, stencil: false, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true}));

var EXT_texture_filter_anisotropic = gl.getExtension("EXT_texture_filter_anisotropic");

document.addEventListener("DOMContentLoaded", function() {
	document.body.appendChild(canvas);
}, false);

addEventListener("resize", function() {
	canvas.width = innerWidth;
	canvas.height = innerHeight;
	gl.viewport(0, 0, canvas.width, canvas.height);
}, false);

addEventListener("blur", function() {
	for(var i = 0; i < 256; ++i)
	{
		keyboard[i] = false;
	}
}, false);

document.addEventListener("DOMContentLoaded", function() {

	document.body.addEventListener("dblclick", function() {
		document.body.webkitRequestPointerLock();
	}, false);

	/*document.addEventListener("webkitfullscreenchange", function() {
		if(document.webkitIsFullScreen) {
			navigator.webkitPointer.lock(document.body);
		}
	}, false);

	document.body.addEventListener("dblclick", function() {
		if(!document.webkitIsFullScreen) {
			document.body.mozRequestFullScreen();
		}
	}, false);*/
}, false);

var mesh;

download("mesh.bin", function(data) {
	mesh = gl.createBuffer();
	mesh.count = data.byteLength / 32;
	gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
});

gl.enable(gl.DEPTH_TEST);
gl.frontFace(gl.CW);

function createFramebuffer(power) {
	var framebuffer = gl.createFramebuffer();
	framebuffer.width = framebuffer.height = 1 << power;
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

	var framebuffer_texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, framebuffer_texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, framebuffer.width, framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

	var framebuffer_renderbuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, framebuffer_renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, framebuffer.width, framebuffer.height);

	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framebuffer_texture, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, framebuffer_renderbuffer);

	return framebuffer;
}

var framebuffer = createFramebuffer(5);

function createTexture(uri) {
	var texture = gl.createTexture();
	var image = new Image();

	image.onload = function() {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

		if(EXT_texture_filter_anisotropic)
		{
			gl.texParameterf(gl.TEXTURE_2D, EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT, 16.0);
			gl.texParameterf(gl.TEXTURE_2D, EXT_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT, 2.0);
		}

		gl.generateMipmap(gl.TEXTURE_2D);
	}

	image.src = uri;

	return texture;
}

// Lightmap coordinates
var lightmap_buffer;

download("lightmap.bin", function(data) {
	lightmap_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, lightmap_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
});

var bloated_mesh;

download("mesh.bin", function(data) {
	bloated_mesh = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, bloated_mesh);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	bloated_mesh.count = Math.floor(data.byteLength / 64);
	console.log("LOL");
});

// lol
var texture = gl.createTexture();

var video = document.createElement("video");

function updateVideo() {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
}

video.src = "output.webm";
video.loop = true;
//video.autoplay = true;

// Textures
var texture = createTexture("sand.jpg");
var texture2 = createTexture("wood.jpg");
var texture3 = createTexture("grass2.jpg");
var lightmap = createTexture("lightmap.png");

// Matrices
var model = mat4.create(), view = mat4.create();
var modelview = mat4.create();
var projection = mat4.create();

function createProgram(vertex_uri, fragment_uri) {
	var program = gl.createProgram();

	function linkProgram() {
		if(program.vertex && program.fragment) {
			gl.bindAttribLocation(program, 0, "position");
			gl.bindAttribLocation(program, 1, "alpha");
			gl.bindAttribLocation(program, 2, "lightcoord");
			gl.bindAttribLocation(program, 3, "texcoord");
			gl.bindAttribLocation(program, 4, "normal");

			gl.linkProgram(program);
			console.log(gl.getProgramInfoLog(program));

			for(var i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); ++i) {
				var name = gl.getActiveUniform(program, i).name;
				program[name] = gl.getUniformLocation(program, name);
			}

			for(var i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES); ++i) {
				var name = gl.getActiveAttrib(program, i).name;
				program[name] = gl.getAttribLocation(program, name);
			}
		}
	}

	download(vertex_uri, function(source) {
		program.vertex = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(program.vertex, source);
		gl.compileShader(program.vertex);
		console.error(gl.getShaderInfoLog(program.vertex));
		gl.attachShader(program, program.vertex);
		linkProgram();
	});

	download(fragment_uri, function(source) {
		program.fragment = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(program.fragment, source);
		gl.compileShader(program.fragment);
		console.error(gl.getShaderInfoLog(program.fragment));
		gl.attachShader(program, program.fragment);
		linkProgram();
	});

	return program;
}

var program = createProgram("vertex.txt", "fragment.txt");

/*download("vertex.txt", function(source) {
	vertex = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertex, source);
	gl.compileShader(vertex);
	console.error(gl.getShaderInfoLog(vertex));
	gl.attachShader(program, vertex);
	createProgram();
});

download("fragment.txt", function(source) {
	fragment = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragment, source);
	gl.compileShader(fragment);
	console.error(gl.getShaderInfoLog(fragment));
	gl.attachShader(program, fragment);
	createProgram();
});*/

var gl_errors = {};
for(var i in gl) gl_errors[gl[i]] = i;

function lerp(a, b, alpha) {
	return a * (1.0 - alpha) + b * alpha;
}

function vlerp(a, b, alpha) {
	var result = [];
	for(var i = 0; i < Math.min(a.length, b.length); ++i) result[i] = lerp(a[i], b[i], alpha);
	return result;
}

// Mesh
var vertices, indices, indices_wireframe;
var displacement_vertices, displacement_indices;
var displacement_indices_wireframe;

function createMesh() {
	vertices = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
	gl.bufferData(gl.ARRAY_BUFFER, world[3], gl.STATIC_DRAW);

	indices = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, world[4], gl.STATIC_DRAW);

	/* ============= */
	/* DISPLACEMENTS */
	/* ============= */

	var number_of_surfaces = 0;

	var dispvertssize = world[6].length / 5;
	var dispverts = new Float32Array(dispvertssize * 4);
	var dispvertsindex = 0;

	for(var i = 0; i < world[5][0].length / 16; ++i) {
		var resolution = (1 << world[5][1][i * 16 + 5]) + 1;
		var resolutionm1 = resolution - 1;
		number_of_surfaces += resolutionm1 * resolutionm1;

		var corner1 = world[5][2][i * 32 + 6], corner2 = world[5][2][i * 32 + 7], corner3 = world[5][2][i * 32 + 8], corner4 = world[5][2][i * 32 + 9];
		var vertex1 = world[3].subarray(corner1 * 3, corner1 * 3 + 3), vertex2 = world[3].subarray(corner2 * 3, corner2 * 3 + 3);
		var vertex3 = world[3].subarray(corner3 * 3, corner3 * 3 + 3), vertex4 = world[3].subarray(corner4 * 3, corner4 * 3 + 3);
		var v = [vertex2[0] - vertex1[0], vertex2[1] - vertex1[1], vertex2[2] - vertex1[2]];
		var u = [vertex4[0] - vertex1[0], vertex4[1] - vertex1[1], vertex4[2] - vertex1[2]];

		for(var j = 0; j < resolution * resolution; ++j) {
			var distance = world[6][dispvertsindex * 5 + 3];
			var x = j % resolution, y = Math.floor(j / resolution);

			dispverts[dispvertsindex * 4 + 3] = world[6][dispvertsindex * 5 + 4];

			var xf = (x / resolutionm1), yf = (y / resolutionm1);

			var temp1 = vlerp(vertex1, vertex2, yf);
			var temp2 = vlerp(vertex4, vertex3, yf);
			var pos = vlerp(temp1, temp2, xf);
			var offset = [world[6][dispvertsindex * 5 + 0] * distance, world[6][dispvertsindex * 5 + 1] * distance, world[6][dispvertsindex * 5 + 2] * distance];

			dispverts[dispvertsindex * 4 + 0] = pos[0] + offset[0];
			dispverts[dispvertsindex * 4 + 1] = pos[1] + offset[1];
			dispverts[dispvertsindex * 4 + 2] = pos[2] + offset[2];

			++dispvertsindex;
		}
	}

	displacement_vertices = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, displacement_vertices);
	gl.bufferData(gl.ARRAY_BUFFER, dispverts, gl.STATIC_DRAW);

	/* =========== */
	/*   INDICES   */
	/* =========== */

	var number_of_triangles = number_of_surfaces * 2;
	var number_of_indices = number_of_triangles * 3;
	console.log(number_of_indices);

	var disptris = new Uint16Array(number_of_indices);
	var index = 0;
	var cough = 0;

	for(var i = 0; i < world[5][0].length / 16; ++i) {
		var cells = 1 << world[5][1][i * 16 + 5];
		var verts = cells + 1;

		function getIndex(x, y) {if(x >= verts || y >= verts) return -1; return y * verts + x;}
		function isAllowed(x, y) {return true; var index = getIndex(x, y); return !!((world[5][1][i * 16 + 6 + (index >> 5)] >> (index & 31)) & 1);}

		for(var y = 0; y < cells; ++y) {
			for(var x = 0; x < cells; ++x) {
				if(index % 2 == 1) {
					if(isAllowed(x, y) && isAllowed(x, y + 1) && isAllowed(x + 1, y + 1)) {
						disptris[index * 3 + 0] = cough + getIndex(x, y);
						disptris[index * 3 + 1] = cough + getIndex(x, y + 1);
						disptris[index * 3 + 2] = cough + getIndex(x + 1, y + 1);
						++index;
					}

					if(isAllowed(x, y) && isAllowed(x + 1, y + 1) && isAllowed(x + 1, y)) {
						disptris[index * 3 + 0] = cough + getIndex(x, y);
						disptris[index * 3 + 1] = cough + getIndex(x + 1, y + 1);
						disptris[index * 3 + 2] = cough + getIndex(x + 1, y);
						++index;
					}
				} else {
					if(isAllowed(x, y) && isAllowed(x, y + 1) && isAllowed(x + 1, y)) {
						disptris[index * 3 + 0] = cough + getIndex(x, y);
						disptris[index * 3 + 1] = cough + getIndex(x, y + 1);
						disptris[index * 3 + 2] = cough + getIndex(x + 1, y);
						++index;
					}

					if(isAllowed(x + 1, y) && isAllowed(x, y + 1) && isAllowed(x + 1, y + 1)) {
						disptris[index * 3 + 0] = cough + getIndex(x + 1, y);
						disptris[index * 3 + 1] = cough + getIndex(x, y + 1);
						disptris[index * 3 + 2] = cough + getIndex(x + 1, y + 1);
						++index;
					}
				}
			}
		}

		cough += verts * verts;
	}

	// Create element array buffer
	window.displacement_indices_count = Math.min(250000, disptris.length);
	displacement_indices = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displacement_indices);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, disptris, gl.STATIC_DRAW);

	// Wireframe
	var blargh = new Uint16Array(disptris.length * 2);
	for(var i = 0; i < blargh.length; ++i) blargh[i] = disptris[(i + 1) >> 1];
	displacement_indices_wireframe = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displacement_indices_wireframe);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, blargh, gl.STATIC_DRAW);

	/* =========================================================== */
	/* NNNNNNNNNNNNWADWAØLDK walødk AWØLDK WAØLDKWA ØLDAWK D ØWALD */
	/* =========================================================== */

	var indiblah = 0;

	for(var i = 0; i < world[5][0].length / 16; ++i) {
		var cells = 1 << world[5][1][i * 16 + 5];
		var lines = cells + 1;

		indiblah += lines * lines;
	}

	console.log(indiblah + " TRIANGLE STRIP INDICES");
}

var cube_vertices = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cube_vertices);

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	0, 0, 0,
	-1, -1, -0.25,
	0, 2, 0,
	1, -1, -0.25
]), gl.STATIC_DRAW);

var cube_indices = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_indices);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 3]), gl.STATIC_DRAW);

var position_ = [0, 0, -100];
var angles_ = [Math.PI * 0.5, 0, 0];
var positions = {};

var input = [0, 0, 0, 0, 0];
var dragging = false;
var whats_the_point = [0, 0];

document.addEventListener("mousemove", function(event) {
	if(typeof event.webkitMovementX !== "undefined") {
		/*input[0] += event.webkitMovementX;
		input[1] += event.webkitMovementY;*/
		angles_[1] -= event.webkitMovementX / 100.0;
		angles_[0] -= event.webkitMovementY / 100.0;
	} else if(dragging) {
		/*input[0] += event.clientX - whats_the_point[0];
		input[1] += event.clientY - whats_the_point[1];
		whats_the_point[0] = event.clientX;
		whats_the_point[1] = event.clientY;*/
	}
}, false);

addEventListener("keydown", function(event) {
	keyboard[event.keyCode] = true;
	if(event.keyCode == 87) {
		MOVE = true;
		input[2] = 1;
	} else if(event.keyCode == 32) {
		input[3] = 1;
	}
}, false);

addEventListener("keyup", function(event) {
	keyboard[event.keyCode] = false;
	if(event.keyCode == 87) {
		MOVE = false;
		input[2] = 0;
	} else if(event.keyCode == 32) {
		input[3] = 0;
	}
}, false);

addEventListener("mousedown", function(event) {
	if(event.button == 0) {
		input[4] = 1;
		dragging = true;
		whats_the_point[0] = event.clientX;
		whats_the_point[1] = event.clientY;
	}
}, false);

addEventListener("mouseup", function(event) {
	if(event.button == 0) {
		input[4] = 0;
		dragging = false;
	}
}, false);

setInterval(function() {
	if(socket && socket.readyState == socket.OPEN && socket.bufferedAmount == 0) {
		socket.send("lol " + input.join(" "));
		input[0] = 0; input[1] = 0;
	}
}, 25);

var rad_180 = 3.1415926535898;
var rad_360 = 6.2831853071796;
function ang_normalize(a) {
    return (a + rad_180) % rad_360 - rad_180;
}

var last_time = -1;

function frame(time) {
	var seconds = time / 1000;

	if(last_time < 0)
	{
		last_time = seconds;
	}

	var dt = seconds - last_time;
	last_time = seconds;

	if(window.analyser) {
		var spectrum = new Uint8Array(2048);
		analyser.getByteFrequencyData(spectrum);
		fogcolor = [0.25 + spectrum[0] / 255 / 4, 0.5 + spectrum[1] / 255 / 4, 0.75 + spectrum[2] / 255 / 4];
		gl.clearColor(fogcolor[0], fogcolor[1], fogcolor[2], 1.0);
	}

	if(window.world && !vertices) {
		createMesh();
	}

	forward[0] = 0.0;
	forward[1] = 0.0;
	forward[2] = 0.0;

	if(keyboard[87] === true)
	{
		forward[2] += -1;
	}

	if(keyboard[83] === true)
	{
		forward[2] += 1;
	}

	if(keyboard[65] === true)
	{
		forward[0] += -1;
	}

	if(keyboard[68] === true)
	{
		forward[0] += 1;
	}

	if(keyboard[32] === true)
	{
		forward[1] += 1;
	}

	if(keyboard[18] === true)
	{
		forward[1] += -1;
	}

	mat4.identity(modelview);
	mat4.identity(projection);

	if(true) {
		/*position_[0] = position_[0] + (orientation[0] - position_[0]) * (1 / 3);
		position_[1] = position_[1] + (orientation[1] - position_[1]) * (1 / 3);
		position_[2] = position_[2] + (orientation[2] - position_[2]) * (1 / 3);

		angles_[0] = angles_[0] + (orientation[3] - angles_[0]) * (1 / 3);
		angles_[1] = angles_[1] + (orientation[4] - angles_[1]) * (1 / 3);
		angles_[2] = angles_[2] + (orientation[5] - angles_[2]) * (1 / 3);*/

	/*for(var i = 0; i < 3; ++i)
	{
		position_[i] = (-1 + Math.random() * 2) * 1000;
		angles_[i] = (-1 + Math.random() * 2) * 1000;
	}*/

		mat4.identity(model);
		mat4.identity(view);

		mat4.rotate(view, -angles_[2], [0, 0, 1]);
		mat4.rotate(view, -angles_[0], [1, 0, 0]);
		mat4.rotate(view, -angles_[1], [0, 0, 1]);

		mat4.translate(model, [-position_[0], -position_[1], -position_[2]]);

		mat4.identity(modelview);
		mat4.multiply(modelview, view);
		mat4.multiply(modelview, model);

		mat4.perspective(80, innerWidth / innerHeight, 0.1, 1442, projection);

		mat4.inverse(view);
		mat4.multiplyVec3(view, forward);
	}

	if(dt >= 0 && dt < 1)
	{
	var speed = keyboard[16] ? 64 : 16;
	position_[0] += forward[0] * dt * speed;
	position_[1] += forward[1] * dt * speed;
	position_[2] += forward[2] * dt * speed;
	}

	for(var i = 0; i < 2; ++i) {
		if(i == 0) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, framebuffer.width, framebuffer.height);
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);
		}

		//gl.clearColor(0.0, 0.5, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if(program) {
			gl.useProgram(program);

			gl.uniform1f(program.time, getTime());
			gl.uniformMatrix4fv(program.modelview, false, modelview);
			gl.uniformMatrix4fv(program.projection, false, projection);

			//updateVideo();
			gl.bindTexture(gl.TEXTURE_2D, texture2);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

			if(window.world) {
				gl.uniform3f(program.color, fogcolor[0], fogcolor[1], fogcolor[2]);

				gl.enable(gl.CULL_FACE);

				gl.enableVertexAttribArray(0);
				gl.disableVertexAttribArray(1);

				if(lightmap_buffer) {
					gl.enableVertexAttribArray(2);
					gl.bindBuffer(gl.ARRAY_BUFFER, lightmap_buffer);
					gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);
				}

				gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
				gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
				//gl.drawElements(gl.TRIANGLES, world[4].length, gl.UNSIGNED_SHORT, 0);


				// !!! BLOATED MESH !!!

				if(bloated_mesh) {
					gl.enableVertexAttribArray(3);
					gl.enableVertexAttribArray(4);
					gl.bindBuffer(gl.ARRAY_BUFFER, bloated_mesh);
					gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 64, 0);
					gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 64, 12);
					gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 64, 40);
					gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 64, 32);
					gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 64, 16);
					gl.drawArrays(gl.TRIANGLES, 0, bloated_mesh.count);//Math.floor(getTime() * 300) * 3 % bloated_mesh.count);
					gl.disableVertexAttribArray(4);
					gl.disableVertexAttribArray(3);
				}

				// yeah no#3

				gl.disableVertexAttribArray(2);

				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices_wireframe);
				gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
				gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
				//gl.drawElements(gl.LINES, displacement_indices * 2, gl.UNSIGNED_SHORT, 0);

				gl.uniform1i(program.lightmap, 2);
				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, lightmap);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);//LINEAR_MIPMAP_LINEAR);

				gl.uniform1i(program.texture2, 1);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, texture2);
				gl.uniform1i(program.texture, 0);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, texture3);

				gl.bindBuffer(gl.ARRAY_BUFFER, displacement_vertices);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, displacement_indices);
				gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
				gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
				gl.enableVertexAttribArray(1);
				//gl.drawElements(gl.TRIANGLES, displacement_indices_count, gl.UNSIGNED_SHORT, 0);

				if(mesh) {
					gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
					gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
					gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 32, 12);
					//gl.drawArrays(gl.POINTS, 0, mesh.count);
				}

				gl.uniform3f(program.color, 1.0, 0.0, 0.0);

				/*if(window.players) {
					gl.bindBuffer(gl.ARRAY_BUFFER, cube_vertices);
					gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

					for(var i in players) {
						if(!positions[i] || !window.orientation || i == window.orientation[10]) positions[i] = [0, 0, 0, 0, 0];

						positions[i][0] = positions[i][0] + (players[i][0] - positions[i][0]) * (1 / 3);
						positions[i][1] = positions[i][1] + (players[i][1] - positions[i][1]) * (1 / 3);
						positions[i][2] = positions[i][2] + (players[i][2] - positions[i][2]) * (1 / 3);
						positions[i][3] = positions[i][3] + (players[i][3] - positions[i][3]) * (1 / 3);
						positions[i][4] = positions[i][4] + (players[i][4] - positions[i][4]) * (1 / 3);

						var temp = mat4.create();
						mat4.set(modelview, temp);
						mat4.translate(temp, [positions[i][0], positions[i][1], positions[i][2] - 1]);
						mat4.rotate(temp, positions[i][4], [0, 0, 1]);
						mat4.rotate(temp, -positions[i][3] - Math.PI / 2, [1, 0, 0]);
						gl.uniformMatrix4fv(program.modelview, false, temp);

						gl.uniform3f(program.color, players[i][6], players[i][7], players[i][8]);
						gl.drawElements(gl.TRIANGLE_FAN, 4, gl.UNSIGNED_SHORT, 0);
						gl.uniformMatrix4fv(program.modelview, false, modelview);
					}
				}*/
			}
		}

		gl.finish();
	}

	requestAnimationFrame(frame);
}

frame();

//setInterval(frame, 8);
