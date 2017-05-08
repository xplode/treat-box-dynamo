# treat-box-dynamo
Functions for managing treat-box user state.

## Installation
```
npm install git://github.com/xplode/treat-box-dynamo.git
```

## Use
Basic setup:
```
tbd = require("treat-box-dynamo");
tbd.setTable("TreatBox");
tbd.setRegion('us-west-1');
```

For functions that should have a session cookie, the cookie can be authenticated
and the user fetched by calling getUserFromSessionCookie:
```
tbd.getUserFromSessionCookie(headers, callback);
```

Then, in the callback you can reference the fetched user and do what you need to:
```
tbd.addCredit(user, callback);
tbd.useCredit(user, callback);
tbd.logoutUser(user, callback);
```

When you don't have a session cookie, but have verified that the user is valid,
use loginUser to create a new user or update the users sessionid.
```
user.sessionid = sessionid;
tbd.loginUser(user, callback);
```
