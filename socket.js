
var WebSocket = window.WebSocket || window.MozWebSocket;

var content_flags = ["SOLID", "WINDOW", "AUX", "GRATE", "SLIME", "WATER", "BLOCKLOS", "OPAQUE"];

var socket;
var players = {};

function connect() {
	socket = new WebSocket("ws://morten.ae:27019", "lws-mirror-protocol");

	socket.onopen = function(event) {
		console.log("connected");
	}

	socket.onclose = function(event) {
		console.log("disconnected");
		setTimeout(connect, 1000);
	}

	socket.onmessage = function(event) {
		if(event.data == "reload") {
			location.reload(true);
			return;
		}

		try {
			var data = event.data.split(" ");

			if(data[10] == "76561197993804477") {
				var leaf_index = getLeaf(data);
				var leaf = world[2].subarray(leaf_index * 4, leaf_index * 4 + 4)

				window.orientation = data;

				if(window.overlay) {
					var info = "pos: " + [data[0], data[1], data[2]].join(" | ") + "<br>";
					info += "ang: " + [data[3], data[4], data[5]].join(" | ") + "<br>";

					var flags = [];
					for(var i = 0; i < content_flags.length; ++i) if((leaf[2] >> i) & 1) flags.push(content_flags[i]);

					info += "vis: leaf(" + leaf_index + ") contents(" + (flags.length > 0 ? flags.join(" | ") : "EMPTY") + ") cluster(" + (leaf[0] == 65535 ? -1 : leaf[0]) + ") area(" + leaf[1] + ")<br>";
					//overlay.innerHTML = info;
				}
			}

			players[data[10]] = data;
		} catch(e) {
		}
	}
}

connect();
