var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var bodyParser = require("body-parser");

var client_id = 'f6dd883dd6824aec8f9c34afead41b35'; // Your client id
var client_secret = '39f6c6a964bb4daaa35b4fdc7c0b4fc3'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var userArtists = [];
var targetplayListName;
var targetPlaylistCover;
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(bodyParser.urlencoded({extended:true}))
app.set('view engine', 'ejs');

app.use('/public', express.static('public'))
 .use(cors())
   .use(cookieParser());

app.get('/',function(req, res){
	res.render('home');
})
//declare the uri of the targeted playlist globally
var targetPlaylisturi;


app.post('/postlogin', function(req,res){
  //recieves data from front page input field 
  var rawuri = req.body.uri;
  //selects only the uri
  var uri = rawuri.substring(rawuri.indexOf("playlist:")+9);
  //refined uri saved globally for later use after use logins
  targetPlaylisturi = uri;
  res.render('postlogin',{playListName: targetplayListName, playlistCover:targetPlaylistCover});


})



app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // authorization scope 
  var scope = 'user-read-private user-read-email playlist-modify-private user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));



});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;


        //global authetication header to avoid duplicates
        var authHeader = {'Authorization': 'Bearer ' + access_token}

        var currentUserPlaylists = {
          url: 'https://api.spotify.com/v1/me/playlists',
          headers: authHeader,
          json: true
        };

        // use the access token to access the Spotify Web API

        //target playlist tracks 
        var targetPlaylistTracks = {
          url: "https://api.spotify.com/v1/playlists/"+ targetPlaylisturi+ "/tracks",
          headers: authHeader,
          json: true
          };

               //access each of currrent user's playlists
               
               request.get(currentUserPlaylists, function(error, response, body) {
            
                //loop through all playlists
                body.items.forEach(function(playlist){
                  var trackHref = playlist.tracks.href;
                  
                  var currentUserPlaylistsTracks = {
                  url: trackHref,
                  headers: authHeader,
                  json: true
                };
    
                  //loop through tracks of current playlist
                  request.get(currentUserPlaylistsTracks, function(error,  response, body){
                      body.items.forEach(function(track){
                        
                        track.track.artists.forEach(function(artist){
                            if (userArtists.indexOf(artist.name) === -1){
                              //if not duplicate, add
                                userArtists.push(artist.name);
                            } 
                        })           
                      })             
            })
           
          })    

          var currentUserTopArtists = {
            url: 'https://api.spotify.com/v1/me/top/artists?limit=50',
            headers: authHeader,
            json: true
          };

          request.get(currentUserTopArtists, function(error, response, body){
              body.items.forEach(function(artist){
                  //if artist not in array of user artists, add the artist
                  if(userArtists.indexOf(artist.name) == -1){
                    userArtists.push(artist.name);
                  }
              });

          });
    //promise for playlist cover image
    var promise4 = new Promise(function(resolve, reject){
      var playlistCover ={
        url: 	"https://api.spotify.com/v1/playlists/" + targetPlaylisturi +"/images",
        headers: authHeader
      }
      request.get(playlistCover, function(error,response, body){
        resolve(JSON.parse(body)[0].url);
      })
    });

    //promise for name of target playlist
    var promise3 = new Promise(function(resolve, reject){
      var targetPlaylist = {
        url: "https://api.spotify.com/v1/playlists/"+ targetPlaylisturi,
        headers: authHeader,
        json: true
              };
       
      request.get(targetPlaylist, function(error, response, body){   
        resolve(body.name);
      });
    });

    //promise for display name of current user
    var promise2 = new Promise(function(resolve, reject) {
      var userInfo = {
        url: "https://api.spotify.com/v1/me",
        headers: authHeader,
        json: true
      }

      request.get(userInfo, function(error,response, body){
              console.log(body.id);
              resolve(body.id);
      });

   

        });
        //waits until request recieves both current user's username and the name of the target playlist
        Promise.all([promise2,promise3,promise4]).then(function(values){
          //  creates the playlist
          targetplayListName = values[1];
          targetPlaylistCover = values[2];
          var newPlaylist = {
           url: 'https://api.spotify.com/v1/users/' + values[0] + '/playlists',
           body: JSON.stringify({
               'name': " ' "+ values[1] +"'" +" personalized just for you!" ,
               'public': false,
               'description': 'github.com/KevinGe00/SpotifyPlaylistPersonalizer'
           }),
           dataType:'json',
           headers: {
               'Authorization': 'Bearer ' + access_token,
               'Content-Type': 'application/json',
           }
            };
         
           //promise object used to fix problems caused by asynchronous javascript, 
           //ensure data from post request is saved properly
           var promise1 = new Promise(function(resolve, reject) {
             request.post(newPlaylist, function(error, response, body) {
               var data = JSON.parse(body);
               resolve(data.id);
               })
           });
           
   
           promise1.then(function(id){
             //loops through target playlists and perform an action based on 
             request.get(targetPlaylistTracks, function(error, response, body){    
               var duplicates = [];
   
               body.items.forEach(function(track){
                       var songArtists = track.track.artists;
                       var trackuri = track.track.uri;
   
                       //mechanism to avoid duplicates when adding songs with multiple artists
                       if (songArtists.length>1){
                           duplicates.push(trackuri)
                       }
                       
                       songArtists.forEach(function(artist){
                         //checks if song artist is listened to by user and that it hasn't already been added
                           if (userArtists.includes(artist.name)&&(duplicates.indexOf(trackuri)==-1)){
   
                             var songToAdd = {
                               url: "https://api.spotify.com/v1/users/" + "citatlon" +"/playlists/"+ id + "/tracks?",
                               body: JSON.stringify({
                                   'uris': [trackuri],
                               }),
                               dataType:'json',
                               headers: {
                                   'Authorization': 'Bearer ' + access_token,
                                   'Content-Type': 'application/json',
                               }
                             };
                           
                             request.post(songToAdd, function(error, response, body){
                             })
                            
                       }
                     })
   
                   })
   
                 })
   
             
           });
   
                 
       })
    
      });
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});


console.log('Listening on 8888');
app.listen(8888);
