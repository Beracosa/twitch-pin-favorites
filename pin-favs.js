const CHANNEL_NAME_CLASS = "sc-AxirZ eAXpco InjectLayout-sc-588ddc-0 ispdkM";
const NAVBAR_LIST_CLASS = "InjectLayout-sc-588ddc-0 igUkRe tw-transition-group";
const SHOW_MORE_BTN_CLASS = "ScCoreLink-udwpw5-0 fNSjov tw-link";
const RERUN_CLASS = "ScFigure-sc-1j5mt50-0 laJGEQ tw-svg";
const DEBUGMODE = false;        // Set false for production. Set true for debugging
const STAR = '⭐';               // Emoji for a star to be displayed next to a pinned channel
let navBarList = null;          // Followed channels navigation bar where each child is a channel
let showMoreBtn = null;         // The 'Show More' button which expands the followed channels list
let lastChangeTime = "0";       // Last time pinFavs() was called in format '21:15' 
let starred = new Set();        // Currently pinned channels
let re = /^\d+ new video[s]?$/; // Regular expression for when channel is offline but has videos
let showReruns = false;         // Whether to include reruns or strictly live channels as part of the results

main(); // Entry point


function main(){
	
	const gettingRerun = browser.storage.sync.get('showReruns');
	gettingRerun.then((res) => {
		showReruns = res.showReruns || false;
	});
	
	var gettingDelay = browser.storage.sync.get('delay');
	gettingDelay.then((res) => {
		
		/* Wait for page to load. DOM needs to be full loaded before script is executed */
		const delay = res.delay || 7;
		
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
	navBarList = document.getElementsByClassName(NAVBAR_LIST_CLASS)[0];
	showMoreBtn = document.getElementsByClassName(SHOW_MORE_BTN_CLASS)[0];
}


/* Unpins all starred channels. */
function unpinAllChannels(){
	// Remove pinned channels so they can be updated
	for(let item of starred){
		const node = getChannel(item); // Gets only the first node, which is pinned
		node.remove();
	}
	starred.clear();
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
		const config = { attributes: true, childList: true, subtree: true };
		const observer = new MutationObserver(onFollowersUpdated);
		observer.observe(navBarList, config);
	});
}


/* Callback function to update pinned channels */
const onFollowersUpdated = function(mutationsList, observer) {
	// Only update pinFavs() once a minute, since this will be called 
	// many times for a single change in the follower list.
	var date = new Date();
	var dt = date.getHours() + ":" + date.getMinutes();

	if(lastChangeTime !== dt){
		let favs = new Set();
		// Fetch from persistance onload
		var gettingItem = browser.storage.sync.get('favs');
		gettingItem.then((res) => {
			for(var i = 0; i < res.favs.length; i++){
				favs.add(res.favs[i].toLowerCase());
			}

			pinFavs(favs);
			lastChangeTime = dt;
		});
	}
};


/* Pins the list of favorites from config to top of nav bar. */
function pinFavs(favs){

	const map = getAllLive(navBarList);
	
	var pinned = [];
	
	for (const [key, value] of Object.entries(map)) {
		const channelName = key.toLowerCase();
		if(favs.has(channelName)){
			if(showReruns){
				pinned.push([channelName, value]);
			} else {
				if(isChannelLive(channelName)){
					pinned.push([channelName, value]);
				}
			}			
		}
	}

	// Sort favourite channels from lowest viewcount to highest
	pinned.sort(function(a, b) {
		return a[1] - b[1];
	});
	
	unpinAllChannels();

	// Pin channels to top by deep cloning
	for(let i = 0; i < pinned.length; i++) {
		
		const channelName = pinned[i][0];
		const node = getChannel(channelName);

		let cloned = node.cloneNode([true]); // Clone, DO NOT modify original node as it will cause syncing issues
		
		// Override onclick so only stream portion refreshes
		cloned.addEventListener("click", function(event) {
			node.childNodes[0].childNodes[0].childNodes[0].click();
			event.preventDefault();
		}, true);

		let displayName = cloned.getElementsByClassName(CHANNEL_NAME_CLASS)[0].innerHTML;
		if(!displayName.includes(STAR)){
			cloned.getElementsByClassName(CHANNEL_NAME_CLASS)[0].innerHTML = addStar(displayName);
		}
		starred.add(channelName);		
		navBarList.insertBefore(cloned, navBarList.firstChild);
	}
}


/* Adds a star emoji in front of a string. */
function addStar(str){
	const cleanHTML = DOMPurify.sanitize(STAR + " " + str);
	return cleanHTML;
}


/* Retrives a node in the DOM given the channel name. */
function getChannel(channelName){
	const href = "a[href='/" + channelName + "']";
	var els = document.querySelectorAll(href);
	var node = els[0].parentNode.parentNode.parentNode;

	return node;
}

/* Returns true if a channel is live, false if it is a rerun. */
function isChannelLive(channelName){
	const href = "a[href='/" + channelName + "']";
	var els = document.querySelectorAll(href);

	// Channel is rerun
	if(els[0].childNodes[1].childNodes[1].childNodes[0].childNodes[0].className === RERUN_CLASS){
		return false;
	}	
	
	// Channel is live
	return true;
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
				const channelName = channelStatus[0].replace(STAR, '').replace(' ', '');
				let channelViewCount = channelStatus[channelStatus.length - 1];
				if(channelViewCount.slice(-1) == 'K'){
					channelViewCount = kToInt(channelViewCount);
				}
				if(!re.test(channelStatus[1])){
					liveMap[channelName] = channelViewCount;
				}
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
	var date = new Date();
	var dt = date.toLocaleString();
	console.log(dt + " OUTPUT: " + s);
}