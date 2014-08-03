
window.onerror = function(message, blah, line) {
	//alert(line + ": " + message);
	document.title = message;
}

function getTime() {
	if(!window.start) window.start = new Date().getTime();
	return (new Date().getTime() - window.start) / 1000.0;
}

var overlay = document.createElement("div");
overlay.style.zIndex = "1000";

var downloads_counter = 0;
var downloads = {};

function download(uri, callback) {
	var id = downloads_counter++;
	var blah = {};
	blah.element = document.createElement("section");
	overlay.appendChild(blah.element);
	downloads[id] = blah;

	var request = new XMLHttpRequest();
	request.open("GET", uri, true);
	if((/\.(bsp|bin)$/i).test(uri)) request.responseType = "arraybuffer";

	request.onload = function(event) {
		overlay.removeChild(downloads[id].element);
		downloads[id] = undefined;
		callback(request.response);
	}

	request.onprogress = function(event) {
		if(event.lengthComputable) {
			downloads[id].element.innerHTML = "downloading \"" + uri + "\" " + Math.round(event.loaded * 100 / event.total) + "%";
		}
	}

	request.send(null);
}

document.addEventListener("DOMContentLoaded", function() {
	document.body.appendChild(overlay);
}, false);
