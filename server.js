var express = require('express');
var request = require('request');
var qs = require('querystring');
var nodemailer = require('nodemailer');

var bitcoinApp = express();

// set root of frontend app
bitcoinApp.use(express.static(__dirname + '/public'));

// api start ---------------------------------------------------------------------

// process the callback from blockchain.info
bitcoinApp.get('/process', function(req, res) {

    const bcMethod = 'balance';

    // get info from blockchain
    var blockchainAPIURL = 'https://blockchain.info/merchant/' +
        process.env.BC_WALLET_IDENTIFIER + '/' + bcMethod +
        '?password=' + process.env.BC_WALLET_PASSWORD;

    console.log("URL sent to blockchain.info: "  + blockchainAPIURL);
    /*
        var postData = {
        method: method,
        nonce: new Date().getTime()
    };
    console.log("params: " + qs.stringify(postData));
    */

    request(blockchainAPIURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var blockchainData = JSON.parse(body);
            console.log("Body from Blockchain.info: " + body);
            res.json(blockchainData);
            if(blockchainData.balance) {
                emailAdmin('Balance successfully retrieved',
                           '<h2>Hi! Here is your Blockchain.info</h2><p>Your balance is <strong>' +
                           (blockchainData.balance / 100000000) + ' BTC</strong></p>');
            }
        }
    });

});

bitcoinApp.get('*', function(req, res) {
    res.sendfile('./public/index.html');
});

// end of api ---------------------------------------------------------------------

function emailAdmin(emailSubject, emailMessage) {

    var smtpTransport = nodemailer.createTransport("SMTP",{
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_AUTH_USER,
            pass: process.env.EMAIL_AUTH_PASSWORD
        }
    });

    var mailOptions = {
        from: "Bitcoin Tools <admin@bitcoin.com>",
        to: process.env.EMAIL_RECIPIENT,
        subject: emailSubject,
        html: emailMessage
    }

    // send mail with defined transport object
    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error.message);
        }else{
            console.log("Email '" + emailSubject + "' successfully sent to " + process.env.EMAIL_RECIPIENT);
        }

        smtpTransport.close();
    });
}

// start the server
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
bitcoinApp.listen( port, ipaddress, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});