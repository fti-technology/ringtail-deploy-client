ringtail-deploy-client
======================
[![Build Status](https://travis-ci.org/fti-technology/ringtail-deploy-client.svg?branch=master)](https://travis-ci.org/fti-technology/ringtail-deploy-client)

Node.js client for interracting with the Ringtail Deploy Service.

##Usage

Install the module via NPM
```bash
npm install fti-technology/ringtail-deploy-client
```

You can then include it as needed
```javascript
var RingtailDeployClient = require('ringtail-deploy-client');
```

You need to instantiate a client by passing in the host of the service you will connect to
```javascript
var client = new RingtailDeployClient({ serviceHost: '127.0.0.1' });
```

With the instance, you can make calls to the service.  Calls support both callback-passing style as well as Promises 
```javascript
// callback passing style
client.status(function(err, status) {
  // do stuff
});

// promise style
client
  .status()
  .then(function(status) {
    // do stuff
  });
```

## API Reference

Setting a single configuration
```javascript
client.setConfig('Common|BRANCH_NAME', 'MAIN', next);
```

Setting multiple configurations
```javascript
var configs = {
  'Common|BRANCHAN_NAME', 'MAIN',
  'Common|USER_ACCOUNT', 'Person'
};
client.setConfigs(configs, next);
```

Gets the configurations as HTML
```javascript
client.getConfigs(next);
```

Gets the launch keys as HTML from a drop location.
```javascript
client.getLaunchKeys(dropLocation);
```

Starts the installation
```javascript
client.install(next);
```

Updates the service to the latest version
```javascript
client.update(next);
```

Gets the status of an install as HTML
```javascript
client.status(next);
```

Gets the installed builds information as an array
```javascript
client.installed(next);
```

Waits for the service to responds. This is useful after calling `update`. It will timeout after 10 minutes.
```javascript
client.waitForService(next);
```

Waits for a build to complete. This is useful after calling `install`.  It will timeout after 75 minutes if the install is not complete.  The `status` callback argument will be called every 15 seconds and report the information that can be obtained from calling `status` directly.
```javascript
function status(data) {
  console.log(data);
}
client.waitForInstall(status, next);
```




## Contributing

Formatting uses spaces instead of tabs and 2-space tabs.  

Please use JSHint via the grunt task `grunt validate`.

Please add proper unit test coverage in accordance with existing test patterns (API methods do not yet have test coverage or parameter validation).

