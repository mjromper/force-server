var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser'),
    argv = require('minimist')(process.argv.slice(2)),
    app = express(),
    root = argv.r || argv.root || process.env.ROOT || '.',
    port = argv.p || argv.port || process.env.PORT || '8200',
    debug = argv.d || argv.debug || process.env.DEBUG || false,
    path = require('path');

//Converter Class
var Converter = require("csvtojson").Converter;
var converter = new Converter( {} ); //for big csv data


if (argv.h || argv.help) {
    console.log('USAGE Example:');
    console.log('force-server --port 8200 --root /users/chris/projects --debug');
    return;
}

app.use(bodyParser.json());

// Server application
app.use(express.static(root));

// Serve default oauthcallback.html during development if one is not available in root
app.use(express.static(__dirname + '/oauth'));

app.all('/*', function(req, res, next) {
    if ( req.originalUrl.indexOf("/services/") !== -1 ||  req.originalUrl.indexOf("/bamtypes") !== -1 ) {
        return next();
    } else {
        res.sendFile(path.resolve(__dirname, '../../'+root+'/index.html'));
    }

});

var activities = [];
converter.on("end_parsed", function (jsonArray) {
    console.log("end_parsed_bamtypes"); //here is your result json object
    activities = jsonArray;
});
request.get("https://dl.dropboxusercontent.com/u/11081420/BAM%20Activities%20v6.csv?t="+Math.random()).pipe(converter);


app.get('/bamtypes', function ( req, res ) {
    res.header("Content-Type", "application/json");
    res.send(activities);
});

app.all('/services/*', function (req, res, next) {

    // Set CORS headers: allow all origins, methods, and headers: you may want to lock this down in a production environment
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
    res.header("Access-Control-Allow-Headers", req.header('access-control-request-headers'));

    if (req.method === 'OPTIONS') {
        // CORS Preflight
        res.send();
    } else {
        var targetURL = req.header('Target-URL');
        if (!targetURL) {
            res.status(500).send({ error: 'Resource Not Found (Web Server) or no Target-URL header in the request (Proxy Server)' });
            return;
        }
        var url = targetURL + req.url;
        console.log(req.method + ' ' + url);
        if (debug) console.log('Request body:');
        if (debug) console.log(req.body);
        request({ url: url, method: req.method, json: req.body, headers: {'Authorization': req.header('Authorization')} },
            function (error, response, body) {
                if (error) {
                    console.error('error: ' + response.statusCode)
                }
                if (debug) console.log('Response body:');
                if (debug) console.log(body);
            }).pipe(res);
    }
});

app.listen(port, function () {
    console.log('force-server listening on port ' + port);
    console.log('Root: ' + root);
});