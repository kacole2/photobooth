/* USE FOR CF EMBEDDED SERVICES */

var mongoose = require('mongoose'),
	cfenv = require("cfenv");

var appEnv = cfenv.getAppEnv()
var mongoLabUrl = appEnv.getServiceURL('kcoleman-emcphotobooth-mongo');
if (mongoLabUrl == null) {
	//local or prod development
	mongoose.connect('mongodb://localhost/emcphotobooth');
} else {
	//cloud foundry
	mongoose.connect(mongoLabUrl);
}

/* Production running in MongoLab 
var mongoose = require('mongoose'),
	nconf = require('nconf');

nconf.file('creds.json');
var mongoLab = nconf.get('MongoLab');

mongoose.connect(mongoLab);
*/

