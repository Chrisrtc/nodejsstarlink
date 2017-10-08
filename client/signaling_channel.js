/*
 * Simple signaling channel for WebRTC (use with channel_server.js).
 */

function SignalingChannel(sessionId,handytruefalse) {
	//  if (!sessionId)
	//  sessionId = location.hash = location.hash.substr(1) || createId();
	userId = createId(sessionId,handytruefalse);

	var channels = {};
	var newsession

	var listeners = {
		"onpeer": null,
		"onsessionfull": null
	};
	for (var name in listeners) {
		Object.defineProperty(this, name, createEventListenerDescriptor(name, listeners));
	}

	function createId(session,handy) {
		if (handy) {
			newsession = session+"h";
		} else {
			newsession = session+"w";
		}
		console.log(newsession);
		return newsession;
	}

	// dieser fick ist schon die 1. anfrage mit stoc an local host
	var es = new EventSource("/stoc/" + sessionId + "/" + userId);

	//The EventSource interface is used to receive server-sent events. It connects 
	//to a server over HTTP and receives events in text/event-stream format without closing the connection.
	//You can set the onmessage attribute to a JavaScript function to receive non-typed messages (that is, messages 
	//with no event field). You can also call addEventListener() to listen for events just like any other event source.


	es.onerror = function () {
		es.close();
	};

	es.addEventListener("join", function (evt) {
		//target.addEventListener(type, listener[, useCapture]);
		//type = A string representing the event type to listen for.
		//listener = The object that receives a notification when an event of the specified type occurs. This must be an object implementing the
		//EventListener interface, or simply a JavaScript function.
		
		console.log("EventSource listener for join added");

		var peerUserId = evt.data; // evt data is sozusagen was ankommt..
		console.log("join: " + peerUserId);
		var channel = new PeerChannel(peerUserId);
		channels[peerUserId] = channel;

		es.addEventListener("user-" + peerUserId, userDataHandler, false);
		fireEvent({ "type": "peer", "peer": channel }, listeners);
	}, false);

	function userDataHandler(evt) {
		var peerUserId = evt.type.substr(5); // discard "user-" part zieht den user ab/ bzw die ersten 5 schritte
		var channel = channels[peerUserId];
		if (channel) {
			channel.didGetData(evt.data);
		}
	}

	es.addEventListener("leave", function (evt) {
		var peerUserId = evt.data;

		es.removeEventListener("user-" + peerUserId, userDataHandler, false);

		channels[peerUserId].didLeave();
		delete channels[peerUserId];
	}, false);

	es.addEventListener("sessionfull", function () {
		fireEvent({"type": "sessionfull"}, listeners);
		es.close();
	}, false);

	function PeerChannel(peerUserId) {
		var listeners = {
			"onmessage": null,
			"ondisconnect": null
		};
		for (var name in listeners) {
			Object.defineProperty(this, name, createEventListenerDescriptor(name, listeners));
		}
		//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
		//Object.defineProperty(obj, prop, descriptor)
		//obj= The object on which to define the property.
		//prop = The name of the property to be defined or modified.
		//descriptor = The descriptor for the property being defined or modified. 

		this.didGetData = function (data) {
			fireEvent({"type": "message", "data": data }, listeners);
		};

		this.didLeave = function () {
			fireEvent({"type": "disconnect" }, listeners);
		};

		var sendQueue = [];

		function processSendQueue() {
			//XMLHttpRequest makes sending HTTP requests very easy.  You simply create an instance of the object, open a URL, 
			//and send the request.  The HTTP status of the result, as well as the result's contents, are available in the 
			//request object when the transaction is completed. 
			var xhr = new XMLHttpRequest();
			xhr.open("POST", "/ctos/" + sessionId + "/" + userId + "/" + peerUserId);//das 2. nach dem komma is die url, and den die anfrage geschickt
			// werden soll https://developer.mozilla.org/de/docs/Web/API/XMLHttpRequest#open%28%29
			//http://www.w3.org/Protocols/rfc2616/rfc2616-sec9.html
			xhr.setRequestHeader("Content-Type", "text/plain");//Setzt den Wert eines HTTP Anfrage-Headers.
			// Aufrufe von setRequestHeader() müssen nach open(), aber vor send() erfolgen.
			xhr.send(sendQueue[0]);//Sendet die Anfrage. Falls die Anfage asynchron ist (was der Default ist), kehrt diese Methode zurück,
			// sobald die Anfrage gesendet ist. Ist die Anfrage synchron, kehrt diese Methode nicht zurück, bis die Antwort angekommen 
			//(oder ein Timeout aufgetreten) ist.
			xhr.onreadystatechange = function () {
				if (xhr.readyState == xhr.DONE) {
					sendQueue.shift();
					if (sendQueue.length > 0) {
						processSendQueue();
					}
				}
			};
		}

		this.send = function (message) {//Das Schlüsselwort „this“ bezieht die folgende Anweisung auf das aktuelle Objekt.
			if (sendQueue.push(message) == 1)
				processSendQueue();
		};
	}

	function createEventListenerDescriptor(name, listeners) {
		return {
			"get": function () { return listeners[name]; },
			"set": function (cb) { listeners[name] = cb instanceof Function ? cb : null; },
			"enumerable": true
		};
	}

	function fireEvent(evt, listeners) {
		var listener = listeners["on" + evt.type]
		if (listener) {
			listener(evt);
		}
	}
}
