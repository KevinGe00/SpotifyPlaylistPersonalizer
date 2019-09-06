/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = 'f6dd883dd6824aec8f9c34afead41b35'; // Your client id
var client_secret = '39f6c6a964bb4daaa35b4fdc7c0b4fc3'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri
var userArtists = [];

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

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email playlist-modify-private';
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

        //target playlist object
        var targetPlaylist = {
          url: "https://api.spotify.com/v1/playlists/37i9dQZF1DX4JAvHpjipBk/tracks",
          headers: authHeader,
          json: true
          };

        //  creates the playlist
        var newPlaylist = {
        url: 'https://api.spotify.com/v1/users/' + "citatlon" + '/playlists',
        body: JSON.stringify({
            'name': "test",
            'public': false
        }),
        dataType:'json',
        headers: {
            'Authorization': 'Bearer ' + access_token,
            'Content-Type': 'application/json',
        }
         };
        var newPlaylistid = 1;

        var promise1 = new Promise(function(resolve, reject){

            request.post(newPlaylist, function(error, response, body) {
            var data = JSON.parse(body);
            var newid = data.id;

            if(typeof newid !== "undefined"){
              resolve(newid);
            }else{
              reject("rejected");
            };
              })

            
        });

        promise1.then(function(id){
          newPlaylistid = id;
        })

        console.log(newPlaylistid);
        





        //access each of currrent user's playlists
        request.get(currentUserPlaylists, function(error, response, body) {

          //loop through all playlists
          body.items.forEach(function(playlist){
            // console.log(playlist.tracks);
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
                          // console.log(artist.name); 
                      } 
                  })

         
                })
                 console.log(userArtists.length);

                 

              request.get(targetPlaylist, function(error, response, body){
              body.items.forEach(function(track){
                var songArtists = track.track.artists
                songArtists.forEach(function(artist){
                  // console.log(artist);
                if (userArtists.includes(artist.name)){
                  // console.log(track);
                  // console.log(track.track.name +" by " +artist.name);

                }
              })

            })

          })
              
            })

           
          })       
    




        });

        
        //creates the playlist
        //  var authOptions1 = {
        // url: 'https://api.spotify.com/v1/users/' + "citatlon" + '/playlists',
        // body: JSON.stringify({
        //     'name': "test",
        //     'public': false
        // }),
        // dataType:'json',
        // headers: {
        //     'Authorization': 'Bearer ' + access_token,
        //     'Content-Type': 'application/json',
        // }
        //  };

        // request.post(authOptions1, function(error, response, body) {
        //     console.log(body);
        // });


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

// app.get('/refresh_token', function(req, res) {

//   // requesting access token from refresh token
//   var refresh_token = req.query.refresh_token;
//   var authOptions = {
//     url: 'https://accounts.spotify.com/api/token',
//     headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
//     form: {
//       grant_type: 'refresh_token',
//       refresh_token: refresh_token
//     },
//     json: true
//   };

//   request.post(authOptions, function(error, response, body) {
//     if (!error && response.statusCode === 200) {
//       var access_token = body.access_token;
//       res.send({
//         'access_token': access_token
//       });
//     }
//   });
// });

console.log('Listening on 8888');
app.listen(8888);
