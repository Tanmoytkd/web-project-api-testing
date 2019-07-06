'use strict';

const axios = require('axios');
var cookieParser = require('cookie-parser');
var fs = require('fs'), path = require('path');

module.exports = function(app) {
  app.use(cookieParser('123456'));

  app.set('view engine', 'ejs');

  app.get('/', function(req, res) {
    var accessToken = req.signedCookies.bank_access_token;
    var email = req.signedCookies.email;
    var bankAccountNumber = req.signedCookies.bankAccountNumber;

    var filePath = '', data = {};
    if (!accessToken) {
      filePath = path.join(__dirname, '/../../client/login');
      res.render(filePath);
    } else {
      ////////////
      app.models.userInfo.findOne({
        where: {
          email: email,
        },
      }, function(err, userInfo) {
        if (err) {
          var errorMsg = 'error occured when trying to find userInfo in Bank';
          console.log(errorMsg, err);
        }

        var bankBalance = userInfo.bankBalance;
        var bankAccountNumber = userInfo.bankAccountNumber;

        var cookieOptions = {signed: true, maxAge: 3000000};

        res.cookie('email', email, cookieOptions);
        res.cookie('bank_access_token', accessToken, cookieOptions);
        res.cookie('bankAccountNumber', bankAccountNumber, cookieOptions);

        res.write('Bank Account Number: ' + bankAccountNumber);
        res.write('\n<br>Bank Balance: ' + bankBalance);
        res.end('\n<br>Bank Account Secret: ' + accessToken);
      });

      ////////////
    }
  });

  app.get('/getAccount', function(req, res) {
    var email = req.signedCookies.email;
    if (req.query.email) email = req.query.email;
    console.log(email);
    console.log(req.query);
    // console.log(req);
    app.models.userInfo.findOne({
      where: {
        email: email,
      },
    }, function(err, userInfo) {
      console.log(userInfo);
      res.send(userInfo);
    });
  });

  app.post('/transferBalance', function(req, res) {
    var fromAccountNumber = req.body.fromAccountNumber;
    console.log("from account received: ", fromAccountNumber);
    var toEmail = req.body.toEmail;
    var amount = req.body.amount;

    app.models.userInfo.findOne({
      where: {
        bankAccountNumber: fromAccountNumber,
      },
    }, function(err, senderUserInfo) {
      var fromBankBalance = senderUserInfo.bankBalance;
      if (fromBankBalance >= amount) {
        senderUserInfo.bankBalance -= amount;
        senderUserInfo.save();

        app.models.userInfo.findOne({
          where: {
            email: toEmail,
          },
        }, function(err, receiverUserInfo) {
          receiverUserInfo.bankBalance += amount;
          receiverUserInfo.save();

          console.log(senderUserInfo);
          var postData = {
            fromAccountNumber: senderUserInfo.bankAccountNumber,
            toEmail: toEmail,
            amount: amount,
          };

          // console.log(postData);

          axios.post('http://localhost:4000/api/transactions', postData).then(function(result) {
            res.send(result.data);
          });
        });
      } else {
        res.send('Insufficient balance');
      }
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

      var accessToken = token.id;

      app.models.userInfo.findOne({
        where: {
          email: email,
        },
      }, function(err, userInfo) {
        if (err) {
          var errorMsg = 'error occured when trying to find userInfo in Bank';
          console.log(errorMsg, err);
        }

        var bankBalance = userInfo.bankBalance;
        var bankAccountNumber = userInfo.bankAccountNumber;

        var cookieOptions = {signed: true, maxAge: 3000000};

        res.cookie('email', email, cookieOptions);
        res.cookie('bank_access_token', accessToken, cookieOptions);
        res.cookie('bankAccountNumber', bankAccountNumber, cookieOptions);

        res.write('Bank Account Number: ' + bankAccountNumber);
        res.write('\n<br>Bank Balance: ' + bankBalance);
        res.end('\n<br>Bank Account Secret: ' + accessToken);
      });
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
        res.redirect(302, '/');
        // res.send('user account created');
      });

      console.log(response.data);
    })
    .catch(function(error) {
      console.log(error);
    });
  });
};
