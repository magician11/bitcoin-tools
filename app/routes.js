module.exports = function(bitcoinApp) {

    var qs = require('querystring');
    var request = require('request');

    //global variables for this app
    var btcExchanges = [];
    var latestGlobalAvg = 0;
    var bcIdSells = [];

    // initialise the the data.. and then update it every minute
    fetchExchangeData();
    setInterval(fetchExchangeData, 60000);

    var emailAdmin = require('./utils.js');

    // api start ---------------------------------------------------------------------

    // allow this API of mine to be called from any external apps
    bitcoinApp.all('*', function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        next();
    });

    // expose the latest sells from bitcoin.co.id
    bitcoinApp.get('/latest_sells_bcid', function(req, res) {

        res.json(bcIdSells);

    });

    // expose the latest global average
    bitcoinApp.get('/latest_global_average', function(req, res) {

        res.json(latestGlobalAvg);

    });

    // expose a list of exchanges
    bitcoinApp.get('/exchanges', function(req, res) {

        res.json(btcExchanges);

    });

    // Callback from blockchain.info
    bitcoinApp.get('/process_payment', function(req, res) {

        console.log("Parameters received: ", req.query);

        const minReqConfirmations = 6;
        const validIncomingIpAddress = '127.0.0.1'; // blockchain.info IP address: 190.93.243.195

        // get required parameters
        const secret = req.query.bitcoinToGolightlyPlus;
        const confirmations = req.query.confirmations;
        const satoshiValue = req.query.value;
        const receivingAddress = req.query.input_address;
        const paymentType = req.query.paymentType;

        // check parameters exist
        if(!confirmations || !satoshiValue || !receivingAddress || !paymentType) {
            res.send("Malformed request: expected parameters missing.");
            console.log('Malformed request: ' + req.query);
            return;
        }

        // Security check: check for value of secret and for valid incoming IP address
        if(secret !== 'true') {// || req.ip !== validIncomingIpAddress) {
            res.send("Security check failed.");
            console.log('FYI: the incoming IP address was ' + req.ip);
            return;
        }

        // check for min confirmations and alert the admin that a payment was received anyway
        if(confirmations < minReqConfirmations) {
            res.send("Not enough confirmations to process.");
            emailAdmin("Payment received for " + paymentType, "<p>Payment received of <strong>" + (satoshiValue/100000000) + 
                       " BTC</strong> from " + receivingAddress + "</p><p>There are currently only " + confirmations +
                       " confirmations. So waiting for " + minReqConfirmations + " before processing.</p>");
        }    
        else {

            emailAdmin('Confirmation of received payment for ' + paymentType + '!', "<p>The payment of <strong>" + (satoshiValue/100000000) + 
                       " BTC</strong> received from " + receivingAddress + " is now confirmed.</p><p>There are currently " + confirmations +
                       " confirmations for this transaction.</p>");

            // switch on payment type
            switch(paymentType) {
                case 'savings':
                    // -- if savings, send 10% to registered savings account        
                    processSavings(satoshiValue, receivingAddress);
                    break;
                case 'DAC':
                    // -- if DAC, split up payment received to registered members in decided upon proportions
                    console.log("Processing DAC payment...");
                    break;
                default:
                    console.log("Payment type of '" + paymentType + "' not recognised. Ignoring.");
                    break;
            }

            res.send('*ok*');
        }
    });

    // process the callback from blockchain.info
    bitcoinApp.get('/get_balance', function(req, res) {

        getBalance(res);

    });

    bitcoinApp.get('*', function(req, res) {
        res.sendfile('./public/index.html');
    });

    // end of api ---------------------------------------------------------------------

    // start functions ---------------------------------------------------------------------

    function fetchExchangeData() {

        btcExchanges = [];

        // add exchanges from bitcoin average
        request('https://api.bitcoinaverage.com/exchanges/USD', function (error, response, body) {

            if (!error && response.statusCode == 200) {

                var exchangeData = JSON.parse(body);

                for(var exchange in exchangeData) {
                    if(exchange == 'timestamp')
                        break;

                    btcExchanges.push({name:exchangeData[exchange].display_name, ask: exchangeData[exchange].rates.ask, url:exchangeData[exchange].display_URL});
                }
            }
            else {
                console.error("Error with bitcoin average: " + error + " / Response: " + response + " / Body: " + body);
            }
        });

        // get exchange data from Coinbase
        request('https://coinbase.com/api/v1/prices/sell', function(error, response, data) {

            if (!error && response.statusCode == 200) {

                var cbData = JSON.parse(data);
                btcExchanges.push({name: 'Coinbase', ask: parseFloat(cbData.amount), url: 'https://coinbase.com/'});
            }
            else {
                console.error("Error with coinbase: " + error + " / Response: " + response + " / Body: " + data);
            }
        });

        // get latest global average from Bitcoin Average
        request('https://api.bitcoinaverage.com/ticker/global/USD/', function(error, response, data) {

            if (!error && response.statusCode == 200) {

                var tickerData = JSON.parse(data);
                latestGlobalAvg = tickerData.last;
            }
            else {
                console.error("Error with bitcoin average ticker: " + error + " / Response: " + response + " / Body: " + data);
            }
        });

        // get latest global average from Bitcoin Average
        request('https://vip.bitcoin.co.id/api/btc_idr/depth', function(error, response, data) {

            if (!error && response.statusCode == 200) {

                var bcIdData = JSON.parse(data);
                bcIdSells = bcIdData.sell;
            }
            else {
                console.error("Error with bitcoin.co.id: " + error + " / Response: " + response + " / Body: " + data);
            }
        });

        // get latest buy price from Cryptsy
        request('http://pubapi.cryptsy.com/api.php?method=singlemarketdata&marketid=2', function(error, response, data) {

            if (!error && response.statusCode == 200) {

                var cryptsyData = JSON.parse(data);
                var recentTrades = cryptsyData.return.markets.BTC.recenttrades;

                for(var trade = 0, totTrades = recentTrades.length; trade < totTrades; trade++) {
                    if(recentTrades[trade].type == 'Buy') {
                        btcExchanges.push({name: 'Cryptsy', ask: parseFloat(parseFloat(recentTrades[trade].price).toFixed(2)), url: 'https://www.cryptsy.com/'});
                        break;
                    }
                }
            }
            else {
                console.error("Error with cryptsy.com: " + error + " / Response: " + response + " / Body: " + data);
            }
        });
    }


    function processSavings(satoshiValue, receivingAddress) {

        if(receivingAddress === process.env.BC_WALLET_REGISTERED_ADDRESS) {

            console.log("Moving 10% of " + satoshiValue + " from " + receivingAddress + " to the registered savings account.");

            var postData = {
                to: process.env.BC_WALLET_SAVINGS_ADDRESS,
                amount: Math.round(satoshiValue * 0.1),
                password: process.env.BC_WALLET_PASSWORD,
                second_password: process.env.BC_WALLET_SECOND_PASSWORD
            };

            //   console.log("Let's pretend it worked fine..");

            callBlockchainWalletAPI('payment', qs.stringify(postData), function(blockchainResponse) {

                console.log(blockchainResponse);

                emailAdmin("Transfer to savings completed!", "<p>A payment of <strong>" + (Math.round(satoshiValue * 0.1)/100000000) +
                           " BTC</strong> was successfully sent to " + process.env.BC_WALLET_SAVINGS_ADDRESS + "</p>");
            });

        }
        else {
            console.log(receivingAddress + ' is not registered for the automated savings tool. No transaction performed.');
        }
    }

    function getBalance(res) {

        var postData = {
            password: process.env.BC_WALLET_PASSWORD
        };

        callBlockchainWalletAPI('balance', qs.stringify(postData), function(blockchainResponse) {

            res.json(blockchainResponse);


            if(blockchainResponse.balance) {
                emailAdmin('Your Blockchain.info wallet balance',
                           '<p>Your wallet balance at Blockchain.info is <strong>' +
                           (blockchainResponse.balance / 100000000) + ' BTC</strong></p>');
            }

        });
    }

    function callBlockchainWalletAPI(bcMethod, params, callback) {

        var blockchainAPIURL = 'https://blockchain.info/merchant/' + process.env.BC_WALLET_IDENTIFIER + '/' +
            bcMethod + '?' + params;

        console.log("Calling Blockchain API with " + blockchainAPIURL);

        request(blockchainAPIURL, function (error, response, body) {

            if (!error && response.statusCode == 200) {
                callback(JSON.parse(body));
            }
            else {
                callback("Error: " + error + " / Response: " + response + " / Body: " + body);
            }
        });
    }

    // end of functions ---------------------------------------------------------------------

};