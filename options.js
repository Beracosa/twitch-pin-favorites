/* Adds a channel to persistance and set it in html. */
function updateRow(e) {
	const channel = document.querySelector("#channelInput").value;
	const gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		let channels = res.favs;
		if(channels === undefined){
			channels = [];
		}
		const index = channels.indexOf(channel);
		
		// Only add channel if it is not already saved
		if (index == -1 && channel !== "") {
			channels.push(channel);
			
			const settingItem = browser.storage.sync.set({
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
	const settingItem = browser.storage.sync.set({
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
	
	const gettingDelay = browser.storage.sync.get('delay');
	gettingDelay.then((res) => {
		const delay = res.delay || 7.5;
		document.querySelector("#delayInput").value = delay;
	});
	
	const gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		for(let i = 0; i < res.favs.length; i++){
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
	const btn = document.createElement("button");
	const t = document.createTextNode("X");
	btn.appendChild(t);       
	btn.addEventListener("click", function(){
		const row = btn.parentNode.parentNode;
		row.parentNode.removeChild(row);	
		const gettingItem = browser.storage.sync.get('favs');
		gettingItem.then((res) => {
			const channels = res.favs;
			const index = channels.indexOf(channel);
			if (index > -1) {
				channels.splice(index, 1);
			}
			const settingItem = browser.storage.sync.set({
				favs: channels
			});	
		});		
	});   
	cell2.appendChild(btn);
}


/* Opens file dialogue selector. */
function openSelectFileDialogue(e){
	document.getElementById('restore').click();
	e.preventDefault();
}


/* Import a list of channels. */
function importFile() {

	const gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		let channels = res.favs;
		if(channels === undefined){
			channels = [];
		}
		
		let file = this.files[0];
		readFileIntoMemory(file, function(fileInfo){
			let restoredSettings = fileInfo.content;
			let favs = restoredSettings.channels;
			for(let i = 0; i < favs.length; i++){
				const channel = favs[i];
				const index = channels.indexOf(channel);
		
				// Only add channel if it is not already saved
				if (index == -1 && channel !== "") {
					channels.push(channel);
				}
			}
			const settingItem = browser.storage.sync.set({
				favs: channels
			});	
			settingItem.then((res) => {
				restoreOptions();
			});	
		});	
	});
}


/* Reads a json file. */
function readFileIntoMemory(file, callback){
    const reader = new FileReader();
    reader.onload = function () {
        callback({
            name: file.name,
            size: file.size,
            type: file.type,
            content: JSON.parse(this.result)
         });
    };
    reader.readAsText(file);
}


/* Export a list of channels. */
function exportFile(e){

	const gettingItem = browser.storage.sync.get('favs');
	
	gettingItem.then((res) => {
		let data = {
			channels: []
		}

		for(let i = 0; i < res.favs.length; i++){
			data.channels.push(res.favs[i]);
		}
		
		const jsonData = JSON.stringify(data);
		const a = document.createElement("a");
		const file = new Blob([jsonData], {type: 'text/plain'});
		a.href = URL.createObjectURL(file);
		a.download = 'restore.json';
		a.click();
	});
	
	e.preventDefault();
}


document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById("channelBtn").addEventListener("click", updateRow);
document.getElementById("delayBtn").addEventListener("click", updateDelay);
const inputElement = document.getElementById("restore");
inputElement.addEventListener("change", importFile, false);
document.getElementById("importBtn").addEventListener("click", openSelectFileDialogue);
document.getElementById("exportBtn").addEventListener("click", exportFile);
