/**
 *  Provides an interfaces for getting, creating, and updating items.
 *  Interfaces with the dynamodb and the configured table.
 */
"use strict";

module.exports = new function () {
    // We're gonna be talking to dynamoDB, so set that up.
    this.aws = require("aws-sdk");
    this.docClient = new this.aws.DynamoDB.DocumentClient();

    this.setTable = function (table) {
      var self = this;
      self.table = table;
    }

    this.setRegion = function (region) {
      var self = this;
      self.aws.config.region = region;
      self.docClient = new self.aws.DynamoDB.DocumentClient();
    }

    /* Gets a user identified by the given session and calls back with error and
     * result.*/
    this.get = function (key, value, callback) {
      console.log("Getting items where " + key + " = " + value);

      var self = this;

      // Scan def doesn"t seem like the best way to achieve this, but I"m in a hurry :P
      var params = {
        TableName: self.table,
        ProjectedExpression: key,
        FilterExpression: key + " = :value",
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

    // proxy for get, raises an error if exactly one item is not found.
    this.getSingle = function (key, value, callback) {
      var self = this;
      self.get(key, value, function(err, items) {
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

    this.updateUser = function (key, value, expression, updates, callback) {
      console.log("Updating user.");

      var self = this;

      self.getSingle(key, value, function(err, user) {
        if (err) {
          callback(err, null);
        } else {
          var userid = user['user-id'];
          var params = {
              TableName: self.table,
              Key: {
                "user-id": userid
              },
              UpdateExpression: expression,
              ExpressionAttributeValues: updates,
              ReturnValues: "UPDATED_NEW"
          };
          self.docClient.update(params, function(err, data) {
            if (err) {
              callback(err, null);
            } else {
              console.log("User successfully updated.");
              callback(null, data);
            }
          });
        }
      });
    }

    this.clearSession = function (sessionId, callback) {
      console.log("Clearing user session.");

      var self = this;

      var expression = "set sessionid = :sid";
      var updates =  { ":sid": false };
      self.updateUser('sessionid', sessionId, expression, updates, function(err, result) {
        if (err) {
          callback(err, null);
        } else {
          callback(null, result);
        }
      });
    }
  };

