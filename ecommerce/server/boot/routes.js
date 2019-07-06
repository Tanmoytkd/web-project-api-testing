'use strict';

const axios = require('axios');
var cookieParser = require('cookie-parser');

module.exports = function(app) {
  var cookieOptions = {signed: true, maxAge: 3000000};
  app.use(cookieParser('123456'));

  app.post('/confirmPurchaseRequest', function(req, res) {
    var purchaseRequest = req.body.purchaseRequest;
    purchaseRequest.status = 'confirmed';
    app.models.purchaseRequest.upsert(purchaseRequest, function(err, obj) {
      res.send(obj);
    });
  });

  app.post('/makePurchaseRequest', function(req, res) {
    var ecommerceEmail = 'admin@gmail.com';
    var ecommerceBankAccountNumber = 'k3duo6ymto';
    var buyerAccountNumber = req.signedCookies.bankAccountNumber;
    var status = 'pending';

    var productID = req.body.productID;
    var productQuantity = req.body.productQuantity;
    var price = req.body.price;

    axios.post('http://localhost:4000/transferBalance', {
      fromAccountNumber: buyerAccountNumber,
      toEmail: ecommerceEmail,
      amount: price,
    }).then(function(transferBalanceResponse) {
      var transaction1 = transferBalanceResponse.data;
      var transaction1ID = transaction1.id;
      var buyerID = buyerAccountNumber;

      app.models.product.findOne({
        where: {
          id: productID,
        },
      }, function(err, productInfo) {
        productInfo.productQuantity = productQuantity;
        productInfo.price = price;

        axios.post('http://localhost:3000/api/purchaseRequests', {
          buyerAccountNumber: transaction1.fromAccountNumber,
          ecommerceEmail: ecommerceEmail,
          ecommerceBankAccountNumber: ecommerceBankAccountNumber,
          supplierEmail: productInfo.supplier,
          product_info: productInfo,
          transaction1ID: transaction1ID,
          status: status,
        }).then(function(response) {
          var purchaseRequest = response.data;
          axios.post('http://localhost:5000/processPurchaseRequest', {
            purchaseRequest: purchaseRequest,
          }).then(function(results) {
            res.send(results.data);
          });
          
        //   res.send(response.data); // notify user that purchase request created
        });
      });
    });
  });

  

  app.post('/setBankInformation', function(req, res) {
    var bankAccountNumber  = req.body.bankAccountNumber;
    var bankAccountSecret = req.body.bankAccountSecret;

    var accessToken = req.signedCookies.access_token;
    var email = req.signedCookies.email;

    app.models.userInfo.findOne({
      where: {
        email: email,
      },
    }, function(err, userInfo) {
      userInfo.bankAccountNumber = bankAccountNumber;
      userInfo.bankAccountSecret = bankAccountSecret;
      userInfo.save();

      res.cookie('bankAccountNumber', bankAccountNumber, cookieOptions);
      res.cookie('bankAccountSecret', bankAccountSecret, cookieOptions);
      res.send('bank information setup correctly');
    });
  });

  app.post('/login', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;

    app.models.User.login({
      email: email,
      password: password,
    }, 'user', function(err, token) {
      if (err) {
        res.send('Login Failed');
        return;
      }

      app.models.userInfo.findOne({
        where: {
          email: email,
        },
      }, function(err, userInfo) {
        if (err) {
          var errorMsg = 'error occured when trying to find userInfo in Bank';
          console.log(errorMsg, err);
        }

        var bankAccountNumber = userInfo.bankAccountNumber;
        var bankAccountSecret = userInfo.bankAccountSecret;
        res.cookie('email', email, cookieOptions);
        res.cookie('bankAccountNumber', bankAccountNumber, cookieOptions);
        res.cookie('bankAccountSecret', bankAccountSecret, cookieOptions);
        res.cookie('access_token', token.id, cookieOptions);
        res.send('Login Successful');
      });
    });
  });

  app.post('/register', function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var fullName = req.body.fullName;
    var accountType = req.body.accountType;

    axios.post('http://localhost:3000/api/Users', {
      email: email,
      password: password,
    })
    .then(function(response) {
      var userData = response.data;
      axios.post('http://localhost:3000/api/userInfos', {
        fullName: fullName,
        email: email,
        accountType: accountType,
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
