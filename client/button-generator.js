 var ButtonGenerator = function(parentElementId) {
	var public_properties = {};
	
	// parent DOM element for buttons
	var parentElement;

	// holds string encoded representation of buttons
	var buttonString;

	// DOM element that shows current buttonString to user
	var buttonStringVisual;

	// holds buttons
	var button = [];

	// boolean that signals wheter user is typing in input fields
	var userIsTyping = false;

	/* #################### private properties #################### */

	var parseButtonString = function() {
		button = [];
		var rawArray = buttonString.split(',');
		for (var i=1 ; i<rawArray.length ; i+=5) {
			var tempButton = {};
			tempButton.name = rawArray[i].trim();
			tempButton.key = rawArray[i+1].trim().toUpperCase();
			tempButton.commandKeyDown = rawArray[i+2].trim();
			tempButton.commandKeyUp = rawArray[i+3].trim();
			tempButton.timeout = parseInt(rawArray[i+4]);
			tempButton.domElement = null;
			tempButton.keyIsPressedDown = false;

			button.push(tempButton);
		}
		generateButtons();
	};

	var generateButtonString = function() {
		var buttonString = "";
		for (var i=0 ; i<button.length ; i++) {
			buttonString += ",";
			buttonString += button[i].name + ",";
			buttonString += button[i].key + ",";
			buttonString += button[i].commandKeyDown + ",";
			buttonString += button[i].commandKeyUp + ",";
			buttonString += button[i].timeout + "\r\n";
		}

		buttonStringVisual.value = buttonString;
	};

	var generateButtons = function() {
		while (parentElement.hasChildNodes()) {
			parentElement.removeChild(parentElement.lastChild);
		}

		for (var i=0 ; i<button.length ; i++) {
			
			// create delete button for control button
			var buttonDeleteDomReference = document.createElement("div");
			buttonDeleteDomReference.setAttribute("class", "sl-delete-button");
			buttonDeleteDomReference.setAttribute("data-button-num", i);
			buttonDeleteDomReference.innerHTML = "X";
			parentElement.appendChild(buttonDeleteDomReference);

			buttonDeleteDomReference.onclick = function(e) {
				var buttonNum = e.target.getAttribute("data-button-num");
				button.splice(buttonNum, 1);
				generateButtons();
			}

			// create control button
			var buttonDomReference = document.createElement("div");
			
			button[i].domElement = buttonDomReference;
			buttonDomReference.setAttribute("class", "sl-control-button");
			buttonDomReference.setAttribute("data-button-num", i);
			buttonDomReference.innerHTML = button[i].name + " (" + button[i].key +")";
			
			parentElement.appendChild(buttonDomReference);

			buttonDomReference.onclick = function(e) {
				var buttonNum = e.target.getAttribute("data-button-num");
				console.log(button[buttonNum].commandKeyDown);
				apptowebsender(button[buttonNum].commandKeyDown); // #################################################################
				button[buttonNum].domElement.setAttribute("class", "sl-control-button down");
				setTimeout(function(){
					console.log(button[buttonNum].commandKeyUp);
					apptowebsender(button[buttonNum].commandKeyUp); // #################################################################
					button[buttonNum].domElement.setAttribute("class", "sl-control-button");
				},button[buttonNum].timeout);
			};
		}

		window.onkeydown = function(e) {
			if (!userIsTyping) {
				var pressedKey = String.fromCharCode(e.charCode || e.keyCode);
				for (var i=0 ; i<button.length ; i++) {
					if (button[i].key == pressedKey && !button[i].keyIsPressedDown) {
						button[i].domElement.setAttribute("class", "sl-control-button down");
						console.log(button[i].commandKeyDown);
						apptowebsender(button[i].commandKeyDown); // #################################################################
						button[i].keyIsPressedDown = true;
					}
				}
			}
		}

		window.onkeyup = function(e) {
			if (!userIsTyping) {
				var pressedKey = String.fromCharCode(e.charCode || e.keyCode);
				for (var i=0 ; i<button.length ; i++) {
					if (button[i].key == pressedKey) {
						console.log(button[i].commandKeyUp);
						apptowebsender(button[i].commandKeyUp); // #################################################################
						button[i].domElement.setAttribute("class", "sl-control-button");
						button[i].keyIsPressedDown = false;
					}
				}
			}
		}
		generateButtonString();
	};


	/* #################### public properties #################### */

	public_properties.setButtonString = function(buttonStr) {
		buttonString = buttonStr;
		parseButtonString();
	};

	public_properties.getButtonString = function() {
		return buttonStringVisual.value;
	};

	/* #################### constructor #################### */

	var construct = function() {
		parentElement = document.getElementById(parentElementId);

		document.getElementById('sl-b-create').onclick = function() {
			var tempButton = {};
			tempButton.name = document.getElementById('sl-b-name').value.trim();
			tempButton.key = document.getElementById('sl-b-key').value.trim().toUpperCase();
			tempButton.commandKeyDown = document.getElementById('sl-b-commandKeyDown').value.trim();
			tempButton.commandKeyUp = document.getElementById('sl-b-commandKeyUp').value.trim();
			tempButton.timeout = parseInt(document.getElementById('sl-b-timeout').value);
			tempButton.domElement = null;
			tempButton.keyIsPressedDown = false;

			button.push(tempButton);

			generateButtons();
		};

		var inputField = [
			"sl-b-name",
			"sl-b-key",
			"sl-b-commandKeyDown",
			"sl-b-commandKeyUp",
			"sl-b-timeout"
		];
		for (var i=0 ; i<inputField.length ; i++) {
			var inputDom = document.getElementById(inputField[0]);
			inputDom.onfocus = function() {
				userIsTyping = true;
			};
			inputDom.onblur = function() {
				userIsTyping = false;
			};
		}

		buttonStringVisual = document.getElementById('sl-buttonString-input');

		buttonStringVisual.onfocus = function() {
			userIsTyping = true;
		};
		buttonStringVisual.onblur = function() {
			userIsTyping = false;
		};
		buttonStringVisual.onchange = function() {
			public_properties.setButtonString(buttonStringVisual.value);
		}

	};

	construct();
	return public_properties;
};