// set up ====================================================================================

var express = require('express');
var bitcoinApp = express();

// config ====================================================================================

bitcoinApp.use(express.static(__dirname + '/public')); // set root of frontend app

// routes ====================================================================================

require('./app/routes.js')(bitcoinApp);

// start the server
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
bitcoinApp.listen( port, ipaddress, function() {
    console.log('Server started listening on port 8080 on ' + (new Date()));
});