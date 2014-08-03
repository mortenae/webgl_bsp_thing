
var AudioContext = window.AudioContext || window.webkitAudioContext;

if(!AudioContext) {
	throw "lol";
}

var audio = new AudioContext();
var analyser = audio.createAnalyser();
var synth = audio.createScriptProcessor(4096);

synth.connect(analyser);
analyser.connect(audio.destination);

var filename = "kiddieland.ogg";

//var source = audio.createBufferSource();
var request = new XMLHttpRequest();
request.open("GET", filename, true);
request.responseType = "arraybuffer";

var bpm = {
	"deprivation.ogg": 130.25,
	"cracked.ogg": 135,
	"kiddieland.ogg": 162,
};

var offsets = {
	"deprivation.ogg": 1300482,
	"cracked.ogg": 100,
	"kiddieland.ogg": 100,
};

var period = 44100 * 60 / bpm[filename];
var offset = offsets[filename];

var oldexpression = "";
var expression = null;
var position = 0;

/*setInterval(function() {
	var request = new XMLHttpRequest();
	request.open("GET", "/garrysmod/data/expression.txt", false);
	request.send(null);

	if(request.response != oldexpression) {
		try {expression = eval("(function(t,l,v){return " + request.response + ";})");} catch(e) {document.title = e.message;}
		oldexpression = request.response;
		//position = 0;
	}
}, 1000);*/

function lerp(x, y, a) {
	return x * (1 - a) + y * a;
}

var lawdawdol = 0;

var p = 0;
var v = 0;
var nein = 230;
var crikey = 0.5;

request.onload = function() {
	audio.decodeAudioData(request.response, function(buffer) {
		//source.buffer = buffer;
		//source.noteOn(0);

		var source_left = buffer.getChannelData(0);
		var source_right = buffer.getChannelData(1);

		synth.onaudioprocess = function(event) {
			var left = event.outputBuffer.getChannelData(0);
			var right = event.outputBuffer.getChannelData(1);

			//if(typeof(expression) != "function") return;

			try {
				for(var i = 0; i < left.length; ++i, ++position) {
					var time = position / audio.sampleRate;
					var target = time * nein % 1 < crikey ? -1.0 : 1.0;
					var acceleration = (target - p) * 0.001 - v * 0.0002;
					v += acceleration;
					p += v;

					right[i] = left[i] = p * 0.01;

					if(position % (audio.sampleRate >> 2) == 0) {
						nein = 200 + Math.random() * 50;
					}

					//var blah = 1324266 + Math.floor(position / (661599 >> 6)) * (661599 >> 4) + position % (661599 >> 5);
					//var blah = 604800 * 4 + Math.floor(position / (604800 >> 4)) * (604800 >> 3) + position % (604800 / (8 << (Math.floor(position / (604800 >> 5)) % 2)));
					//var blah = 5607959 + Math.floor(position / (604800 >> 4)) * (604800 >> 4) + position % (604800 / (8 << ((position / (604800 >> 6)) % 4)));
					//var blah = Math.floor(position / (627200 >> 6)) * (627200 >> 7) + position % (627200 / (8 << position / (627200 >> 5) % 4));
					//var blah = (583944 >> 2) * Math.floor(position / (583944 >> 5)) + position % Math.floor(583944 / (16 << position / (583944 >> 5) % 4));
					/*var blah = expression(position % source_left.length / 72993, source_left.length / 72993, source_left[position]); //72993 * 120 + Math.floor(position / (72993 >> 4)) * (72993 >> 3) * 0 + position % (72993 >> 4);
					var lol_left, lol_right;
					var volume_left = 1, volume_right = 1;

					if(typeof(blah) == "object" && blah.length >= 2) {
						lol_left = blah[0] * 72993 + 1000;
						lol_right = blah[1] * 72993 + 1000;

						if(blah.length == 3) {
							volume_right = volume_left = blah[2];
						} else if(blah.length > 3) {
							volume_left = blah[2];
							volume_right = blah[3];
				 	 }
					} else {
						lol_right = lol_left = blah * 72993 + 1000;
					}

					left[i] = lerp(source_left[Math.floor(lol_left)], source_left[Math.ceil(lol_left)], lol_left % 1) * volume_left;
					right[i] = lerp(source_right[Math.floor(lol_right)], source_right[Math.ceil(lol_right)], lol_right % 1) * volume_right;*/

					function lol(t) {
						return t % 4;
					}

					//left[i] = source_left[offset + Math.round(lol(position % source_left.length / period) * period)];
					//right[i] = source_right[offset + Math.round(lol(position % source_right.length / period) * period)];
				}
			} catch(e) {
				document.title = e.message;
			}
		}
	});
}

request.send(null);
