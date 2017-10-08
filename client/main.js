var isMozilla = window.mozRTCPeerConnection && !window.webkitRTCPeerConnection;
if (isMozilla) {
	//wenn mozilla verwendet wird muss umverwiesen werden
	// mit window wird das aktuelle fenster des webbrowsers angesprochen
	window.webkitURL = window.URL;
	navigator.webkitGetUserMedia = navigator.mozGetUserMedia; 
	window.webkitRTCPeerConnection = window.mozRTCPeerConnection;
	window.RTCSessionDescription = window.mozRTCSessionDescription;
	window.RTCIceCandidate = window.mozRTCIceCandidate;
}

var selfView;
var remoteView;
var signalingChannel;
var pc;
var peer;
var localStream;
var chatDiv;
var chatText;
var chatButton;
var channel;

//meins
var IstHandy = false;
var tout2;
var tout3;
var tout4;
var getdevices;


var audioInputSelect = document.querySelector('select#audioSource');

var hashinput;
var hashroom;
var hashvideo;
var hashaudio;
var hashquality;


var configuration = {
	"iceServers": 
		[
			{"url": "stun:mmt-stun.verkstad.net"},
			{"url": "turn:mmt-turn.verkstad.net","username": "webrtc","credential": "secret"}
		]
};

var buttonGenerator = null;

window.onload = function () {

	buttonGenerator = new ButtonGenerator('sl-button-wrapper');

	getdevices = new getdevices();
	console.log(navigator.userAgent,' UserAgent');

	if (!navigator.mediaDevices) {
		console.log("getUserMedia() not supported.");
	}

	if (/Smartphoneclient/i.test(navigator.userAgent) ) {
		console.log(navigator.userAgent,'navigator.userAgent');
		IstHandy = true;
	}

	if (!window.hasOwnProperty("orientation")) {
		window.orientation = -90;
	}
  
	if (navigator.webkitGetUserMedia) {
		console.log("This appears to be Chrome");
	}


	function errorCallback(error) {
		console.log('navigator.getUserMedia error:aaaa ', error);
	}



	console.log(navigator.userAgent,' onLoad');

	selfView = document.getElementById("self_view");
	remoteView = document.getElementById("remote_view");
	joinButton = document.getElementById("join_but");
	chatText = document.getElementById("chat_txt");
	chatButton = document.getElementById("chat_but");
	chatDiv = document.getElementById("chat_div");
	
	loadButton = document.getElementById("load_but");
	saveButton = document.getElementById("save_but");

	if (IstHandy == false) {
		tout4 = setTimeout(function(){
			joinButton.disabled = !navigator.webkitGetUserMedia;
		}, 8000);
	} else {
		joinButton.disabled = !navigator.webkitGetUserMedia;
	};


	loadButton.onclick = function (evt) {
		apptowebsender("load");
	};

	saveButton.onclick = function (evt) {
		apptowebsender("save:"+buttonGenerator.getButtonString());
		console.log("save:"+buttonGenerator.getButtonString());
	};





	//////von oben das
  
	joinButton.onclick = function (evt) {

	joinButton.disabled = true;

	

		

	if (IstHandy == true) {

		if (hashquality) {
		var constraints = {	audio:hashaudio,video: hashvideo};
		}else{
		var constraints = {	audio:hashaudio,video: { width:90, height: 180}};
		};
		
		

			//video: { width: 320, height: 180}
		console.log(constraints);	
		if (hashvideo==false && hashaudio== false) {
			//justchat
		localStream = "nolocalstream";
		console.log("bothfalse");
		}else{
			navigator.webkitGetUserMedia(constraints,function (stream1) {
			selfView.src = URL.createObjectURL(stream1);
			localStream = stream1;
			},logError);
		};

			
				
	} else {

	     var audioInputSelect = document.querySelector('select#audioSource');
  		 var audioSource = audioInputSelect.value;
  		 console.log("joinbuttonclicked"+audioSource);
  		 if (audioSource=="nomic"){
		//var constraints = {audio: false,video: false };//
		localStream = "nolocalstream";
		console.log("noaudio");
  		 }else{
			var constraints = {audio: {deviceId: audioSource ? {exact: audioSource} : undefined},video: false };//
			navigator.webkitGetUserMedia(constraints,function (stream1) {
				selfView.src = URL.createObjectURL(stream1);
				localStream = stream1;
			},logError);	
  		 };
 		  
	}

	//{"audio": true,"video": true}


		
		peerJoin();
		

		function peerJoin() {
			var sessionId = document.getElementById("session_txt").value;
			signalingChannel = new SignalingChannel(sessionId,IstHandy);

		

			// another peer has joined our session
			signalingChannel.onpeer = function (evt) {
				console.log("in on peer,webseite müsste drücken")

				if (IstHandy == true) {
					Javascriptinterface.Commu("webclient:joined");
					
				
					tout2 = setTimeout(function(){ 
						console.log("insettimeout");
						start(true);
					}, 9100);
				} 

				
				peer = evt.peer;
				peer.onmessage = handleMessage;

				peer.ondisconnect = function () {
					
					clearTimeout(tout2);          
					remoteView.style.visibility = "hidden";
					if (pc) {
						pc.close();
					}
					pc = null;

					if (IstHandy == true) {
						Javascriptinterface.Commu("webclient:disconnect");
					}
					console.log("in on disconnect")
				}
			}
		}

	}; // end of join.onclick

	hashinput=location.hash.substr(1);
	hashinput = hashinput.split('#');

	hashroom = hashinput[0]; //auto join durch direkte Anwahl
	hashvideo = hashinput[1];
	hashaudio = hashinput[2];
	hashquality = hashinput[3];

	if (hashvideo=="on"){
	hashvideo=true;
	}else{
	hashvideo=false;
	};

	if (hashaudio=="on"){
	hashaudio=true;
	}
	else{
	hashaudio=false;
	};

	if (hashquality=="on"){
	hashquality=true;
	}
	else{
	hashquality=false;
	};

	if (hashroom) {
		tout3 = setTimeout(function(){ 
			document.getElementById("session_txt").value = hashroom;
			log("Auto-joining session: " + hashroom);
			joinButton.click();
		}, 2500);
	} else {
		document.getElementById("session_txt").value = 666;
	}
}; // end of onload




// handle signaling messages received from the other peer
function handleMessage(evt) {
	var message = JSON.parse(evt.data);
	console.log(JSON.stringify(message));

	// wenn nachricht ankommt und noch keine peer 
	if (!pc && (message.sdp || message.candidate)) {
		start(false);
		console.log("in handle message");
	}

	if (message.sdp) {
		console.log("in message.sdp= true");
		var desc = new RTCSessionDescription(message.sdp);
		pc.setRemoteDescription(desc, function () {
			// if we received an offer, we need to create an answer
			if (pc.remoteDescription.type == "offer") {
				pc.createAnswer(localDescCreated, logError);
			}
		}, logError);
	} else if (!isNaN(message.orientation) && remoteView) {
		console.log("else if handlemessage");
		var transform = "rotate(" + message.orientation + "deg)";
		remoteView.style.transform = remoteView.style.webkitTransform = transform;
	} else {
		console.log("ende handelMessage");
		pc.addIceCandidate(new RTCIceCandidate(message.candidate), function () {}, logError)
	}
}




// call start() to initiate
function start(isInitiator) {

	console.log("start"+isInitiator);
	pc = new webkitRTCPeerConnection(configuration);

	// send any ice candidates to the other peer
	pc.onicecandidate = function (evt) {
		if (evt.candidate)
		peer.send(JSON.stringify({ "candidate": evt.candidate }));
	};

	// let the "negotiationneeded" event trigger offer generation
	pc.onnegotiationneeded = function () {
		// check signaling state here because Chrome dispatches negotiationeeded during negotiation
		if (pc.signalingState == "stable") {
			pc.createOffer(localDescCreated, logError);
		}
		console.log("onnegotiationneeded=signaling state stable");
	};

	// start the chat

		if (isInitiator) {
			channel = pc.createDataChannel("chat");// entweder macht der eine einen auf und der andere joint
			console.log("eins vor setupchat");// >>initiator oder der andere hat schon einen auf gemacht und der
			setupChat();// eine joint
		} else {
			pc.ondatachannel = function (evt) {
			channel = evt.channel;
			setupChat();
			console.log("setupchat durchlaufen");
			}
		}
		
	// once the remote stream arrives, show it in the remote video element
	pc.onaddstream = function (evt) {
		remoteView.src = URL.createObjectURL(evt.stream);
		remoteView.style.visibility = "visible";
		sendOrientationUpdate();
	};

	if (localStream != "nolocalstream")
	{console.log("innolocalstreamonaddstream");
		pc.addStream(localStream);
	}
		
	// the negotiationneeded event is not supported in Firefox
	if (isMozilla && isInitiator)
		pc.onnegotiationneeded();
}




function localDescCreated(desc) {
	pc.setLocalDescription(desc, function () {
		peer.send(JSON.stringify({ "sdp": pc.localDescription }));
	}, logError);
}

function sendOrientationUpdate() {
	peer.send(JSON.stringify({ "orientation": window.orientation  })); //+ 90 direkt hinter window orientation
}


window.onorientationchange = function () {
	if (peer) {
		sendOrientationUpdate();
	}
	if (selfView) {
		var transform = "rotate(" + (window.orientation ) + "deg)";//+ 90
		selfView.style.transform = selfView.style.webkitTransform = transform;
	}
};

function logError(error) {
	if (error) {
		if (error.name && error.message) {
			log(error.name + ": " + error.message);
		} else {
			log(error);
		}
	} else {
		log("Error (no error message)");
	}
}

function log(msg) {
	// log.div = log.div || document.getElementById("log_div");// log ist in der html definiert...ist die anzeige von den fehlern
	//log.div.appendChild(document.createTextNode(msg));//
	// log.div.appendChild(document.createElement("br"));
}


// setup chat
function setupChat() {
	
	channel.onopen = function () {
		if (IstHandy == true) { //false ist web 
			//channel.send(10);
		}

		if (IstHandy == false) { //false ist web 
			chatDiv.style.visibility = "visible";
			chatText.style.visibility = "visible";
			chatButton.style.visibility = "visible";
			chatButton.disabled = false;
			
			saveButton.disabled = false;
			loadButton.disabled = false;
		}


		//On enter press - send text message.
		chatText.onkeyup = function(event) {
			if (event.keyCode == 13) {
				chatButton.click();
			}
		};

		chatButton.onclick = function () {
			if(chatText.value) {
				postChatMessage(chatText.value, true);
				channel.send(chatText.value);
				chatText.value = "";
				chatText.placeholder = "";
			}
		};
	};


	// recieve data from remote user
	channel.onmessage = function (evt) {
		

		

		if (IstHandy == true) {
			Javascriptinterface.Commu(evt.data);
		}else{
			postChatMessage(evt.data);
			var messageinput = evt.data.split(':');

			if(messageinput[1]=="save"){
				buttonGenerator.setButtonString(evt.data);
				console.log("save received");

			};
		}
	};

	function postChatMessage(msg, author) {
		var messageNode = document.createElement('div');
		var messageContent = document.createElement('div');
		messageNode.classList.add('chatMessage');
		messageContent.textContent = msg;
		messageNode.appendChild(messageContent);

		if (author) {
			messageNode.classList.add('selfMessage');
		} else {
			messageNode.classList.add('remoteMessage');
		}

		chatDiv.appendChild(messageNode);
		chatDiv.scrollTop = chatDiv.scrollHeight;
	}
}


function apptowebsender(a) {
	if (channel!=null) {
		channel.send(a);
	}
}



