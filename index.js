/**
 *  Provides an interfaces for getting, creating, and updating items.
 *  Interfaces with the dynamodb and the configured table.
 */
"use strict";
console.log("Loading event");

var aws = require("aws-sdk");
var docClient = new aws.DynamoDB.DocumentClient();
var table = "TreatBox"; // Change this to whatever table you want to work with.

/* Gets a user identified by the given session and calls back with error and result.
 */
function get(key, value, callback) {
  console.log("Getting items where " + key " = " + value);
  // Scan def doesn"t seem like the best way to achieve this, but I"m in a hurry :P
  var params = {
    TableName: table,
    ProjectedExpression: key,
    FilterExpression: key + " = :value",
    ExpressionAttributeValues: {
      ":value": value
    }
  };

  docClient.scan(params, function(err, data) {
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
function getSingle(key, value, callback) {
  get(key, value, function(err, items) {
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

function updateUser(key, value, expression, updates, callback) {
  console.log("Updating user.");
  getSingle(key, value, function(err, user) {
    if (err) {
      callback(err, null);
    } else {
      var userid = user['user-id'];
      var params = {
          TableName: table,
          Key: {
            "user-id": userid
          },
          UpdateExpression: expression,
          ExpressionAttributeValues: updates,
          ReturnValues: "UPDATED_NEW"
      };
      docClient.update(params, function(err, data) {
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

function clearSession(sessionId, callback) {
  console.log("Clearing user session.");
  var expression = "set sessionid = :sid";
  var updates =  { ":sid": false };
  updateUser('sessionid', sessionId, expression, updates, function(err, result) {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
}

exports.handler = (event, context, callback) => {
  console.log("Running handler.");
  console.log(JSON.stringify(event, null, 2));

  switch (event.action) {
    case 'get':
      get(event.key, event.value, function(err, result) {
        callback(err, result);
      });
      break;
    default:
      console.log("Bad data given in event.");
      callback("Bad event data.", null);
  }
};
