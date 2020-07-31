const innerClassName = "tw-c-text-alt tw-ellipsis tw-ellipsis tw-flex-grow-1 tw-font-size-5 tw-line-height-heading tw-semibold";
const debugMode = true;    // Set false for production. Set true for debugging
const star = '⭐';           // Emoji for a star to be displayed next to a pinned channel
const config = {            // Configuration of observer
	attributes: true, 
	childList: true, 
	subtree: true 
};
let navBarList = null;      // Followed channels navigation bar where each child is a channel
let showMoreBtn = null;     // The 'Show More' button which expands the followed channels list
let lastChangeTime = "0";   // Last time pinFavs() was called in format '21:15' 
let starred = new Set();    // Currently pinned channels
let observer = null;        // Observer that detects change in followers list, ie viewcount change

main(); // Entry point


function main(){
		
	var gettingDelay = browser.storage.sync.get('delay');
	gettingDelay.then((res) => {
		
		/* Wait for page to load. DOM needs to be full loaded before script is executed */
		const delay = res.delay || 7.5;
		if(debugMode){
			logd("Starting with delay: " + delay + " secs");
		}
		
		// Expand navigation bar
		setTimeout(function(){			
			init();
			expand(navBarList, showMoreBtn);
		
			// Once nav bar is expanded, initialize main script
			setTimeout(function(){
				setup_observer();
			}, 2000);
			
		}, delay * 1000);

	});
}


/* Search and store key elements. */
function init(){
	navBarList = document.getElementsByClassName('tw-relative tw-transition-group')[0];
	showMoreBtn = document.getElementsByClassName('tw-interactive tw-link tw-link--button')[0];
}


/* Load initial configuration and run code on detecting change. */
function setup_observer(){

	let favs = new Set();

	// Fetch from persistance onload
	var gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		for(var i = 0; i < res.favs.length; i++){
			favs.add(res.favs[i].toLowerCase());
		}
		pinFavs(favs);		

		// Create an observer to update when changes occur in the follower list
		// ie) channels go live, viewcount changes, category changes, etc
		observer = new MutationObserver(onFollowersUpdated);
		observer.observe(navBarList, config);
		
		if(debugMode){
			logd("Observer setup and waiting for changes to the DOM");
		}
	});
}


/* Callback function to update pinned channels */
const onFollowersUpdated = function(mutationsList) {

	observer.disconnect();
	let favs = new Set();
	// Fetch from persistance onload
	var gettingItem = browser.storage.sync.get('favs');
	gettingItem.then((res) => {
		for(var i = 0; i < res.favs.length; i++){
			favs.add(res.favs[i].toLowerCase());
		}
		if(debugMode){
			logd("Updating pinned channels");
		}
		pinFavs(favs);
		// Connect observer after a few seconds to prevent being called too many times
		setTimeout(function(){
			observer.observe(navBarList, config);
		}, 10000);
		
	});
};


/* Pins the list of favorites from config to top of nav bar. */
function pinFavs(favs){
	
	let s = ""; // debug string

	const map = getAllLive(navBarList);
	
	var pinned = [];

	for (const [key, value] of Object.entries(map)) {
		const channelName = key.toLowerCase();
		if(favs.has(channelName)){
			pinned.push([channelName, value]);
		}
	}

	// Sort favourite channels from lowest viewcount to highest
	pinned.sort(function(a, b) {
		return a[1] - b[1];
	});
	
	if(debugMode){
		for(let item of starred){
			s += item + " | "
		}
		logd("Currently pinned channel: " + s);
		s = "";
	}
	
	// Remove pinned channels so they can be updated
	for(let item of starred){
		const node = getChannel(item); // Gets only the first node, which is pinned
		node.remove();
		if(debugMode){
			s += item + " | "
		}
	}
	
	if(debugMode){
		logd("Channels removed from pinned: " + s);
		s = "";
	}
	
	starred.clear();

	// Pin channels to top by deep cloning
	for(let i = 0; i < pinned.length; i++) {
		
		const channelName = pinned[i][0];
		const node = getChannel(channelName);	

		let cloned = node.cloneNode([true]); // Clone, DO NOT modify original node as it will cause syncing issues
		let displayName = cloned.getElementsByClassName(innerClassName)[0].innerHTML;
		if(!displayName.includes(star)){
			cloned.getElementsByClassName(innerClassName)[0].innerHTML = addStar(displayName);
		}
		starred.add(channelName);
		if(debugMode){
			s += channelName + " | "		
		}		
		navBarList.insertBefore(cloned, navBarList.firstChild);
	}
	
	if(debugMode){
		logd("Channels added to pinned: " + s);
	}

}


/* Adds a star emoji in front of a string. */
function addStar(str){
	const cleanHTML = DOMPurify.sanitize(star + " " + str);
	return cleanHTML;
}


/* Retrives a node in the DOM given the channel name.*/
function getChannel(channelName){
	const href = "a[href='/" + channelName + "']";
	var els = document.querySelectorAll(href);
	var node = els[0].parentNode.parentNode.parentNode;
	return node;
}


/* Expands the navigation bar to show every live channel. */
function expand(lst, btn){
	// Loop will in worst case break after expanding every following channel or 20 iterations
	const maximumLoops = 20;
	let curLoop = 0;
	let prevLiveCount = 0; // When this no longer increases, every live channel has been found

	while(true){
		curLoop++;
		const res = getAllLive(lst);
		const numLiveChannels = Object.keys(res).length;	

		if(numLiveChannels === prevLiveCount || curLoop === maximumLoops){
			break;
		}
		btn.click();
		prevLiveCount = numLiveChannels;
	}	
}


/* Gets a dictionary of every live channel. Key=channel name, value=view count. */
function getAllLive(navBarList){
	
	const liveMap = {};
	const lines = navBarList.innerText.split('\n');	
	let channelStatus = [];
	
	// Parse channels. Every 6 lines should be a complete channelStatus, but somtimes it's
	// 5 if the category is not set. This finds every live channel.
	// channelStatus[0] = channel name
	// channelStatus[1] = category
	// channelStatus[2] = viewcount
	for(let i = 0; i < lines.length; i++){		
		const line = lines[i];		
		
		if(line != ''){
			channelStatus.push(lines[i]);
			if(isViewCount(line)){
				const channelName = channelStatus[0].replace(star, '').replace(' ', '');
				let channelViewCount = channelStatus[channelStatus.length - 1];
				if(channelViewCount.slice(-1) == 'K'){
					channelViewCount = kToInt(channelViewCount);
				}

				liveMap[channelName] = channelViewCount;
				channelStatus = [];
			}
		}
	}

	return liveMap;
}


/* Turn a number like 2.4k into 2400, or 3k to 3000. */
function kToInt(channelViewCount){
	channelViewCount = channelViewCount.slice(0, channelViewCount.length - 1);	
	channelViewCount = channelViewCount.split(".");
	if(channelViewCount.length == 1){
		channelViewCount = channelViewCount[0] + "000";
	} else if(channelViewCount.length == 2){
		channelViewCount = channelViewCount[0] + channelViewCount[1] + "00";
	}
	return channelViewCount;
}


/* Boolean. Checks if a string refers to the viewcount. This is for when category is null. */
function isViewCount(str){
	let viewCount = str;
	if(str.slice(-1) == 'K'){
		viewCount = str.slice(0, str.length - 1);
	}
	return isFloat(viewCount);
}


/* Checks if a string is a valid float. */
function isFloat(n) {
    const str = String(n).trim();
	return !str ? NaN : Number(str);
}


/* Logs to console with a timestamp. Use 'OUTPUT' to filter out other messages. */
function logd(s){
	if(!debugMode){
		return;
	}
	var date = new Date();
	var dt = date.toLocaleString();
	console.log(dt + " OUTPUT: " + s);
}
