angular.module('leth.controllers')
  .controller('WalletCtrl', function ($scope, $stateParams, $ionicLoading, $ionicModal, $state, 
                                      $ionicPopup, $cordovaBarcodeScanner, $ionicActionSheet, 
                                      $timeout, AppService, Transactions,ExchangeService) {
    var TrueException = {};
    var FalseException = {};

    var setCoin = function(index){
      if(index==0){
        $scope.idCoin = 0;
        $scope.logoCoin = "img/ethereum-icon.png";
        $scope.descCoin = "Eth from main wallet";
        $scope.symbolCoin = "Ξ";
        $scope.xCoin = "XETH";        
        $scope.balance = AppService.balance();
        $scope.listUnit = [
    			{multiplier: "1.0e18", unitName: "Ether"},
    			{multiplier: "1.0e15", unitName: "Finney"},
    			{multiplier: "1",unitName: "Wei"}
    		];
        $scope.unit = $scope.listUnit[0].multiplier;
      }
      else {
      	$scope.getNetwork();
    		var activeCoins=$scope.listCoins.filter( function(obj) {return obj.Network==$scope.nameNetwork;} );
        $scope.idCoin = index;
        $scope.logoCoin = activeCoins[index-1].Logo;
        $scope.descCoin = activeCoins[index-1].Abstract;
        $scope.symbolCoin = activeCoins[index-1].Symbol;
        $scope.xCoin = activeCoins[index-1].Exchange;          
        $scope.methodSend = activeCoins[index-1].Send;
        $scope.contractCoin = web3.eth.contract(activeCoins[index-1].ABI).at(activeCoins[index-1].Address);
        $scope.balance = $scope.contractCoin.balanceOf('0x' + $scope.account)*1;
    		$scope.listUnit = activeCoins[index-1].Units;
        $scope.unit = $scope.listUnit[0].multiplier;
      }
    }

    $scope.$on('$ionicView.enter', function() {
     // refresh();
      $scope.balance = AppService.balance();
      ExchangeService.getTicker($scope.xCoin, JSON.parse(localStorage.BaseCurrency).value).then(function(value){
        $scope.balanceExc = JSON.parse(localStorage.BaseCurrency).symbol + " " + parseFloat(value * $scope.balance).toFixed(2) ;
      });
    })

    //set Eth for default
    setCoin(0);

    $scope.fromAddressBook = false;

    if($stateParams.addr){
      var addr = $stateParams.addr.split('@')[0];
      var coins = $stateParams.addr.split('@')[1];
      $scope.addrTo = addr;
      $scope.amountTo = parseFloat(coins);
      $scope.fromAddressBook = true;
    }else { 
      $scope.fromAddressBook = false;
    }

    $scope.sendCoins = function (addr, amount, unit, idCoin) {
      if( $scope.idCoin!=0){
        AppService.transferCoin($scope.contractCoin, $scope.methodSend, $scope.account, addr, amount);
      }
      else{
        var fromAddr = $scope.account;
        var toAddr = addr;
        var valueEth = amount;
        var value = parseFloat(valueEth) * unit;
        var gasPrice = 50000000000;
        var gas = 50000;
        AppService.sendTransaction(fromAddr, toAddr, value, gasPrice, gas).then(
          function (result) {
            if (result[0] != undefined) {
              var errorPopup = $ionicPopup.alert({
                title: 'Error',
                template: result[0]
              });
              errorPopup.then(function (res) {
                console.log(res);
              });
            } else {
              var successPopup = $ionicPopup.alert({
                title: 'Transaction sent',
                template: result[1]

              });
              successPopup.then(function (res) {
                $state.go('app.transactions');
              });
              //save transaction
              $scope.transactions = Transactions.save(fromAddr, toAddr, result[1], value, new Date().getTime());
              refresh();
            }
          },
          function (err) {
            var alertPopup = $ionicPopup.alert({
              title: 'Error',
              template: err

            });
            alertPopup.then(function (res) {
              console.log(err);
            });
        });
      }//else
    };

    $scope.confirmSend = function (addr, amount,unit) {
      var confirmPopup = $ionicPopup.confirm({
        title: 'Confirm payment',
        template: 'Send ' + parseFloat(amount) + " " + document.querySelector('#valuta option:checked').text + " to " + addr + " ?"
      });
      confirmPopup.then(function (res) {
        if (res) {
          $scope.sendCoins(addr, amount,unit);
        } else {
          console.log('send coins aborted');
        }
      });
    };

    $scope.checkAddress = function (address) {
      try {
        angular.forEach(this.friends, function(value, key) {
          if(value.addr != address){
            throw TrueException;
          }else {
            throw FalseException;
          }
        })
      }catch (e){
        if(e === TrueException){
          $scope.toAdd = true;
        }else if(e===FalseException) {
          $scope.toAdd = false;
        }
      }
    }

    $scope.clearAddrTo = function(){
      $scope.fromAddressBook = false;
    }

    $scope.chooseCoin = function(){  
		  $scope.getNetwork();
      var buttonsGroup = [{text: 'Ether [Ξ]'}];

	   var activeCoins=$scope.listCoins.filter( function(obj) {return obj.Network==$scope.nameNetwork;} );
      for (var i = 0; i < activeCoins.length; i++) {
        var text = {text: activeCoins[i].Name + " [" + activeCoins[i].Symbol + "]"};
        buttonsGroup.push(text);
      }

      var hideSheet = $ionicActionSheet.show({
        buttons: buttonsGroup,
        destructiveText: (ionic.Platform.isAndroid()?'<i class="icon ion-android-exit assertive"></i> ':'')+'Cancel',
        titleText: 'Choose coins to pay with',
        destructiveButtonClicked:  function() {
          hideSheet();
        },
        buttonClicked: function(index) {
          setCoin(index);
          hideSheet();
          $timeout(function() {
           hideSheet();
          }, 20000);
        }
      })
    };
  })