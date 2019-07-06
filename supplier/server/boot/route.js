'use strict';

const axios = require('axios');
var cookieParser = require('cookie-parser');

module.exports = function(app) {
  app.use(cookieParser('123456'));

  app.post('/processPurchaseRequest', function(req, res) {
    var purchaseRequest = req.body.purchaseRequest;
    console.log(purchaseRequest);
    var transaction1ID = purchaseRequest.transaction1ID;

    axios.get('http://localhost:4000/api/transactions/' + transaction1ID + '/exists')
    .then(function(response) {
      if (response.data.exists == true) {

        axios.post('http://localhost:4000/transferBalance', {
          fromAccountNumber: purchaseRequest.ecommerceBankAccountNumber,
          toEmail: purchaseRequest.product_info.supplier,
          amount: purchaseRequest.product_info.price,
        }).then(function(results) {
          var transaction = results.data;
          var transaction2ID = transaction.id;
          purchaseRequest.transaction2ID = transaction2ID;
          axios.post('http://localhost:3000/confirmPurchaseRequest', {
            purchaseRequest: purchaseRequest,
          }).then(function(confirmationResult) {
            res.send(confirmationResult.data);
            console.log(confirmationResult.data);
          });
        });
      }
    });
  });

  app.post('/register', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var bankAccountNumber = Math.random().toString(36).substring(2, 15);
    console.log('account number' + bankAccountNumber);
    var bankBalance = Math.random() * 10000;

    axios.post('http://localhost:4000/api/Users', {
      email: email,
      password: password,
    })
    .then(function(response) {
      axios.post('http://localhost:4000/api/userInfos', {
        email: email,
        bankAccountNumber: bankAccountNumber,
        bankBalance: bankBalance,
      })
      .then(function(userInfoResponse) {
        res.send('user account created');
      });

      console.log(response.data);
    })
    .catch(function(error) {
      console.log(error);
    });
  });
};
