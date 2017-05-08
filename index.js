/**
 *  Provides an interfaces for getting, creating, and updating items.
 *  Interfaces with the dynamodb and the configured table.
 */
"use strict";

module.exports = new function () {
    // We'll be talking to dynamoDB, so set that up.
    this.aws = require("aws-sdk");
    this.docClient = new this.aws.DynamoDB.DocumentClient();

    this.setTable = function (table) {
      var self = this;
      self.table = table;
    }

    this.setRegion = function (region) {
      // If the region was changed, get a new handle to dynamo.
      var self = this;
      self.aws.config.region = region;
      self.docClient = new self.aws.DynamoDB.DocumentClient();
    }

    // Get items from the database where column 'attribute' has value 'value'.
    this.get = function (attribute, value, callback) {
      console.log("Getting items where " + attribute + " = " + value);

      var self = this;

      var params = {
        TableName: self.table,
        ProjectedExpression: attribute,
        FilterExpression: attribute + " = :value",
        ExpressionAttributeValues: {
          ":value": value
        }
      };

      self.docClient.scan(params, function(err, data) {
        // If there was in error while calling dynamodb, let the call know about it.
        if (err) {
          var error = "Unable to scan the table." + JSON.stringify(err, null, 2);
          console.log(error);
          callback(error, null);
        } else {
          // Log the found items and return them to the user.  NOTE: This method
          // doesn't attempt to continually fetch items.  Only intended to retrieve
          // a few small items.
          data.Items.forEach(function(item) {
            console.log(JSON.stringify(item, null, 2));
          });
          callback(null, data.Items);
        }
      });
    }

    // proxy for get by value, raises an error if exactly one item is not found.
    this.getSingle = function (attribute, value, callback) {
      var self = this;
      self.get(attribute, value, function(err, items) {
        if (err) {
          callback(err, null);
        } else {
          if (items.length !== 1) {
            callback("Expected a single item, instead found: " + items.length, null);
          } else {
            callback(null, items[0]);
          }
        }
      });
    }

    // Used when you simply need to know if the user with the id exists.
    this.userExists = function (userid, callback) {
      var self = this;
      console.log("Checking to see if user exists: " + userid);

      var params = {
        TableName: self.table,
        Key:{ "user-id": userid}
      };

      self.docClient.get(params, function(err, data) {
        if (err) {
          console.error("Unable to read item.", JSON.stringify(err, null, 2));
          callback(err, null);
        } else {
          console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
          // If we got back an item, then the user exists.
          var result = data["Item"];
          if (result) {
            console.log('The user exists.');
          } else {
            console.log('The user does not exist.');
          }
          callback(null, result);
        }
      });
    }

    // Updates the user by userid.
    this.updateUser = function (userid, updateEx, condEx, attVals, callback) {
      console.log("Updating user.");

      var self = this;

      var params = {
          TableName: self.table,
          Key: {
            "user-id": userid
          },
          UpdateExpression: updateEx,
          ExpressionAttributeValues: attVals,
          ReturnValues: "UPDATED_NEW"
      };
      if (condEx) {
        params.ConditionExpression = condEx;
      }

      console.log(JSON.stringify(params, null, 2));

      self.docClient.update(params, function(err, data) {
        if (err) {
          callback(err, null);
        } else {
          console.log("User successfully updated.");
          callback(null, data);
        }
      });
    }


    // Returns the user for the given sessionid.
    this.getUserForSession = function (sessionid, callback) {
      console.log("Finding user for sessionid: " + sessionid);

      var self = this;

      self.getSingle('sessionid', sessionid, function(err, user) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, user);
        }
      });
    }

    // Creates the user, assumes the user model is in the correct format.
    this.createUser = function (user, callback) {
      console.log("Creating user: " + JSON.stringify(user, null, 2));
      user['credits'] = 0;

      var self = this;

      var params = {
          TableName: self.table,
          Item: user
      };

      self.docClient.put(params, function(err, data) {
        if (err) {
          console.error("Unable to create user:", JSON.stringify(err, null, 2));
          callback(err, null);
        } else {
          console.log("Successfully created user.", JSON.stringify(data, null, 2));
          callback(null, "success");
        }
      });
    }

    // Sets the session for the given user.
    this.setSession = function (userid, sessionid, callback) {
      console.log("Setting user session.");

      var self = this;

      var updateEx = "set sessionid = :sid";
      var attVals =  { ":sid": sessionid };
      self.updateUser(userid, updateEx, null, attVals, function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      });
    }

    // Clears the user's session.
    this.clearSession = function (userid, callback) {
      console.log("Clearing user session.");

      var self = this;

      var updateEx = "set sessionid = :sid";
      var attVals =  { ":sid": false };
      self.updateUser(userid, updateEx, null, attVals, function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      });
    }

    // Alias for clearSession.
    this.logoutUser = function (user, callback) {
      var self = this;
      console.log("Logging out user: " + JSON.stringify(user, null, 2));

      self.clearSession(user['user-id'], function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      });
    };

    // Will create the user if it doesn't exist, otherwise just sets the session.
    this.loginUser = function (user, callback) {
      var self = this;
      console.log("Logging in user: " + JSON.stringify(user, null, 2));

      self.userExists(user['user-id'], function(err, exists) {
        if (err) {
          callback(err, null);
        } else {
          if(exists) {
            // The user already exists, so just set the sessionid.
            self.setSession(user['user-id'], user['sessionid'], callback);
          } else {
            // We need to create a new user.
            self.createUser(user, callback);
          }
        }
      });
    }

    // Updates the user's credit count by 1.
    this.addCredit = function (user, callback) {
      console.log("Adding a credit for the user.");

      var self = this;

      var updateEx = "set credits = credits + :val";
      var attVals =  { ":val": 1};
      self.updateUser(user['user-id'], updateEx, null, attVals, function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      });
    }

    // Decrements the users credit count by 1.  An error will be raised if
    // an attempt is made to decrement below zero.
    this.useCredit = function (user, callback) {
      console.log("Decrementing a credit from the user.");

      var self = this;

      var updateEx = "set credits = credits - :val";
      var condEx = "credits > :min";
      var attVals =  { ":val": 1, ":min": 0};
      self.updateUser(user['user-id'], updateEx, condEx, attVals, function(err, result) {
        if (err) {
          callback("The user has no credits to spend :(", null);
        } else {
          callback(null, "The credit has been spent!");
        }
      });
    }

    // This is a helper function to get the session cookie and then use that
    // to get the user... really doesn't belong here, but I'll move it when
    // I get around to creating a node module for these http related helpers.
    this.getUserFromSessionCookie = function(headers, callback) {
      var self = this;
      console.log("Getting user from session cookie.");
      console.log("Headers are: " + JSON.stringify(headers, null, 2));

      if (headers === null ||
        headers === undefined ||
        headers.Cookie === undefined) {
        callback("Headers are bad.", null); // The caller must check for a null user.
      } else {

        var list = {},
          rc = headers.Cookie;
          rc && rc.split(';').forEach(function( cookie ) {
            var parts = cookie.split('=');
            var key = parts.shift().trim()
            var value = decodeURI(parts.join('='));
            if (key != '') {
                list[key] = value
            }
        });

        var sessionid = list['sessionid'];
        self.getUserForSession(sessionid, function(err, user) {
          if (err) {
            callback("Couldn't get a user for sessionid: "+sessionid, null);
          } else {
            callback(null, user);
          }
        });
      }
    }
  };
