/*
 *       0
 *      111
 *     01000
 *    1101111
 *   011000010
 *  11_0_0_1_00     @name         TOAD - Twitter OAuth Adapter Daemon
 *   (0)---(0)      @desc         A javascript resource object for interacting with the Twitter API using OAuth.io
 *  /._______.\     @author       @EnglishCriminal for HOD (hod.io)
 *  \_________/     @project      Twirc    - http://twirc.io
 * ./ T.O.A.D \.    @license      M.I.T    - http://opensource.org/licenses/MIT
 *( .         , )   @requirements RSVP.js  - http://rsvpjs-builds.s3.amazonaws.com/rsvp-latest.js
 * \ \_\\ //_/ /                  OAuth.js - https://oauth.io/auth/download/latest/oauth.js
 *  ~011~1~010~
 *   001101111
 *    0110000
 *     10110
 *      010
 *       0
 *
 * About
 * =====
 * I know what you're thinking, this is not a daemon, it's a couple of
 * promises wrapped together to generate a response object taking up a
 * great namespace. You are right. TOAD is not meant to be a complete
 * interface for the Twitter API, at least I don't have time to make
 * it that way. If you'd like it to be that way please feel free to
 * make a pull request.
 *
 * Generic run function w/ possible options
 * =========================================
 * Basic Usage
 *
 * Toad.run('https://api.twitter.com/1.1/search/tweets.json?q=twirc').then(
 *   function(success){
 * 	   console.log(JSON.stringify(success));
 *   },
 *   function(error){
 * 	   console.log('Error');
 *   }
 * );
 *
 * Other
 * =====
 * Don't forget to throttle your requests! See the Twitter API for details.
 *
 * TOAD Aliases (For the Lazy & Efficacious)
 * =============================================
 * Toad.authorize(method); // Method can be popup or redirect, popup is default
 * Toad.search(term);
 * Toad.stream(term); // Not yet working
 * Toad.tweet(content);
 * Toad.sendMessage(recipient,message);
 * Toad.getMessages(); // Gets direct messages
 * Toad.credentials(); // Returns response from verify_credentials call
 * Toad.getScreenName(); // Returns current username
 *
 * This adapter was written using the Twitter v1.1 API specs found here :
 * https://dev.twitter.com/docs/api/1.1
 *
 */

// Create Pseudo Class & Initialize
function Toad(){

	// OAuth Object
	this.oauth = false;
	this.setOAuth = function(oauth){
		this.oauth = oauth;
		// Make this available to other apps
		localStorage.setItem('toad-oauth-token',JSON.stringify(oauth));
	}
	this.getOAuth = function(){return this.oauth;}
	
}
Toad = new Toad();

// Authorize, This isn't usually called directly
Toad.authorize = function(){

	var promise = new RSVP.Promise(function(resolve, reject) {


		OAuth.callback('twitter',function(error, success){
	
			// Success
			if ( error == null ){
				
				// Define Result and make available globally
				Toad.setOAuth(success);
						
				// If we nest this in the below promise, it will never return
				resolve(success); 
				Toad.getScreenName().then(function(result){
					localStorage.setItem('toad-screen_name',result);			
				});
						
			}else{
	
				// Error
				error = 'Unable to Authenticate';
				reject(error);
			}
	
		});

	});

	// Dynamic redirecting
	var oauth_sent = localStorage.getItem('toad-oauth_sent');
	if ( oauth_sent != 1 ){
		localStorage.setItem('toad-oauth_sent',1);
		OAuth.redirect('twitter', window.location.hash);
	}else{
		localStorage.setItem('toad-oauth_sent',0);
	}
	return promise;
}

// Generic Run Mechanism - CURLesque
Toad.run = function(url,method){

	var promise = new RSVP.Promise(function(resolve, reject) {

		// Already Authorized
		if ( Toad.oauth !== false  ){
			if ( method == 'post' ){
				// POST Request
				Toad.oauth.post(url).done(function(response){
					resolve(response);
				});
			}else{
				// GET Request (Default)
				Toad.oauth.get(url).done(function(response){
					resolve(response);
				});
			}

		}else{
			// Let's Authorize
			Toad.authorize().then(function(value) {
				// Now let's run our query
				if ( method == 'post' ){
					// POST Request
					Toad.oauth.post(url).done(function(response){
						resolve(response);
					});
				}else{
					// GET Request (Default)
					Toad.oauth.get(url).done(function(response){
						resolve(response);
					});
				}
			}, function(error) {
				// Failure
				resolve(error);
			});
		}

	});

	return promise;

}

Toad.logout 		= function(){
	// Clear out all token & screen name
	localStorage.setItem('toad-screen_name',null);
	localStorage.setItem('toad-oauth-token',null);
	localStorage.removeItem('toad-screen_name');
	localStorage.removeItem('toad-oauth-token');
}


// Aliases
Toad.search			= function(term){
	url = 'https://api.twitter.com/1.1/search/tweets.json?q='+term+'&result_type=recent&count=100';
	return Toad.run(url);
}
Toad.stream			= function(term){
	url = 'https://stream.twitter.com/1.1/statuses/filter.json?track='+term;
	return Toad.run(url,term,'post');
}
Toad.tweet			= function(status){
	url = 'https://api.twitter.com/1.1/statuses/update.json?status='+status;
	return Toad.run(url,'post');
}
Toad.sendMessage	= function(screen_name,text){
	url = 'https://api.twitter.com/1.1/direct_messages/new.json?screen_name='+screen_name+'&text='+text;
	return Toad.run(url,'post');
}
Toad.getMessages	= function(){
	url = 'https://api.twitter.com/1.1/direct_messages.json';
	return Toad.run(url);
}
Toad.getCredentials = function(){
	url = 'https://api.twitter.com/1.1/account/verify_credentials.json';
	return Toad.run(url);
}
Toad.getScreenName = function(){
	
	// If we already have a screen name, let's not re-check it to prevent exceeding our rate limit 15 requests per 15 min
	if ( localStorage.getItem('toad-screen_name') ){
		return new RSVP.Promise(function(resolve, reject) {
			resolve(localStorage.getItem('toad-screen_name'));
		});
	}else{	
		// Request Twitter Screen Name
		return new RSVP.Promise(function(resolve, reject) {
			Toad.getCredentials().then(function(result){
				resolve(result.screen_name);
			});
		});		
	}
}
Toad.favorite = function(tweet_id){
	url = 'https://api.twitter.com/1.1/favorites/create.json?id='+tweet_id;
	return Toad.run(url,'post');
}
Toad.follow = function(screen_name){
	url = 'https://api.twitter.com/1.1/friendships/create.json?screen_name='+screen_name;
	return Toad.run(url,'post');
}
Toad.retweet = function(tweet_id){
	url = 'https://api.twitter.com/1.1/statuses/retweet/'+tweet_id+'.json';
	return Toad.run(url,'post');
}
