# treat-box-dynamo
Functions for managing treat-box user state.

## Installation
```
npm install git://github.com/xplode/treat-box-dynamo.git
```

## Use
```
tbd = require("treat-box-dynamo");
tbd.setTable("TreatBox");
tbd.setRegion('us-west-1');
tbd.clearSession("abc", function(err, result){});
```
