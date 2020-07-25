/* Adds a channel to persistance. */
function updateRow(e) {
	
	const channel = document.querySelector("#channelInput").value;
	
	var gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		let channels = res.favs;
		if(channels === undefined){
			channels = [];
		}
		const index = channels.indexOf(channel);
		
		// Only add channel if it is not already saved
		if (index == -1) {
			channels.push(channel);
			
			var settingItem = browser.storage.sync.set({
				favs: channels
			});	
			settingItem.then((res) => {
				restoreOptions();
				document.querySelector("#channelInput").value = "";
			});	
		}
	});
	
	e.preventDefault();
}


/* Updates when the delay is saved. */
function updateDelay(e) {
	var settingItem = browser.storage.sync.set({
		delay: document.querySelector("#delayInput").value
	});	
	settingItem.then((res) => {
		restoreOptions();
	});	
	e.preventDefault();
}


/* Refreshes the display. */
function restoreOptions() {
	const table = document.getElementById("favsTable");
	table.innerHTML = "";
	
	var gettingDelay = browser.storage.sync.get('delay');
	gettingDelay.then((res) => {
		const delay = res.delay || 7.5;
		document.querySelector("#delayInput").value = delay;
	});
	
	var gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		for(var i = 0; i < res.favs.length; i++){
			addRow(res.favs[i]);
		}
	});
}


/* Adds a row to the table of channels. */
function addRow(channel) {
	const table = document.getElementById("favsTable");
	const row = table.insertRow(0);
	const cell1 = row.insertCell(0);
	const cell2 = row.insertCell(1);
	
	const cleanChannel = DOMPurify.sanitize(channel);
	cell1.innerHTML = cleanChannel;

	// Button removes the channel from persistance when clicked
	var btn = document.createElement("button");
	var t = document.createTextNode("X");
	btn.appendChild(t);       
	btn.addEventListener("click", function(){
		var row = btn.parentNode.parentNode;
		row.parentNode.removeChild(row);	
		var gettingItem = browser.storage.sync.get('favs');
		gettingItem.then((res) => {
			const channels = res.favs;
			const index = channels.indexOf(channel);
			if (index > -1) {
				channels.splice(index, 1);
			}
			var settingItem = browser.storage.sync.set({
				favs: channels
			});	
		});		
	});   
	cell2.appendChild(btn);
}


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("channelBtn").addEventListener("click", updateRow);
document.getElementById("delayBtn").addEventListener("click", updateDelay);
