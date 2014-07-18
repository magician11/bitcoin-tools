'use strict';

var bitcoinToolsApp = angular.module('bitcoinTools', []);

bitcoinToolsApp.controller('btcDisplay', function($scope, $http) {

    //set some sensible defaults
    $scope.loggedIn = false;
    $scope.user = {};
    $scope.btcBalance = 0;

    // instatiate the FirebaseSimpleLogin and monitor the user's auth state
    var appRef = new Firebase('https://luminous-fire-4988.firebaseio.com/');
    var auth = new FirebaseSimpleLogin(appRef, function(error, user) {
        if (error) {

            console.log(error);
        } else if (user && user.email == 'andrewgolightly11@gmail.com') {

            $scope.user.name = user.displayName;
            $scope.loggedIn = true;
            $scope.$apply();

            $http.get('/get_balance')
            .success(function(data) {
                $scope.btcBalance = data.balance / 100000000;
            });

        } else {
            // user is logged out
            $scope.loggedIn = false;
        }
    });

    $scope.loginWithGoogle = function() {
        auth.login('google');
    };

    $scope.logout = function() {
        auth.logout();
        $scope.loggedIn = false;
    };

});