var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	async = require('async'),
	nconf = require('nconf'),
	AWS = require('aws-sdk');

nconf.file('creds.json');
var S3accessKeyId = nconf.get('S3accessKeyId'),
    S3secretAccessKey = nconf.get('S3secretAccessKey'),
    S3endpoint = nconf.get('S3endpoint'),
    S3url = nconf.get('S3url');

router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
  	if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    	// look in urlencoded POST bodies and delete it
    	var method = req.body._method
    	delete req.body._method
    	return method
  	}
}))

router.route('/')
	.get(function(req, res, next) {
		mongoose.model('Infophoto').find({}, function (err, infophotos) {
		  	if (err) {
		  		return console.error(err);
		  	} else {
		  		res.format({
					html: function(){
				    	res.render('infophotos/index', {
				  			title: 'All my infophotos',
				  			"infophotos" : infophotos
			  			});
					},
					json: function(){
				    	res.json(infophotos);
					}
				});
		  	} 	
		});
	})
	.post(function(req, res) {
	    // Get our form values. These rely on the "name" attributes
	    var fname = req.body.fname;
	    var lname = req.body.lname;
	    var email = req.body.email;
	    var twitter = req.body.twitter;
	    var company = req.body.company;
	    var title = req.body.title;
	    var newsletter = req.body.newsletter;
	    var interests = req.body.interests;
	    var favoritedemo = req.body.favoritedemo;

	    console.log(favoritedemo);
	    console.log(interests);

	    var uniqueurlIterator = 0;
	    var uniqueurl = fname.toLowerCase() + lname.toLowerCase() + uniqueurlIterator.toString();
	    //need to find in mongo by uniqueurl. if exists then add 1 to fname+lname
	    var goodurl = false;

	    async.until(	
	    	function (){ return goodurl == true }, 
	    	function(done){
	    		uniqueurl = fname.toLowerCase() + lname.toLowerCase() + uniqueurlIterator.toString();
	    		console.log('Trying: ' + uniqueurl);
	    		mongoose.model('Infophoto').findOne({ uniqueurl: uniqueurl}, function (err, infophoto) {
		    		if (err) {
		    			console.log(err);
		    		} else {
		    			if (infophoto == null){
		    				goodurl = true;
		    				mongoose.model('Infophoto').create({
						    	fname : fname,
						    	lname : lname,
						    	email : email,
						    	twitter : twitter,
						    	company : company,
						    	title : title,
						    	newsletter : newsletter,
						    	interests : interests,
						    	favoritedemo : favoritedemo,
						    	uniqueurl : uniqueurl
						    }, function (err, infophoto) {
							  	if (err) {
							  		console.log(err);
							  		//return handleError(err);
							  		res.send("There was a problem adding the information to the database.");
							  	} else {
							  		console.log('POST creating new infophoto: ' + infophoto);
							  		res.format({
										html: function(){
											// If it worked, set the header so the address bar doesn't still say /adduser
									    	res.location("infophotos");
									    	// And forward to success page
						            		res.redirect("/infophotos");
										},
										json: function(){
									    	res.json(infophoto);
										}
									});
						      	}
							})
		    			} else {
		    				uniqueurlIterator += 1;
		    				done();
		    			}
		    		}
		    	});
	    	}, function(err){}
	    )
	});

/* GET New Infophoto page. */
router.get('/new', function(req, res) {
    res.render('infophotos/new', { title: 'Add New infophoto' });
});

/* GET List of Pictures to be taken */
router.get('/list', function(req, res) {
    mongoose.model('Infophoto').find({photos : []}, function (err, infophotos) {
		if (err) {
			console.log('GET Error: There was a problem retrieving: ' + err);
		} else {
			//console.log('GET Retrieving all empty infophotos: ' + infophotos);
			res.format({
				html: function(){
				   	res.render('infophotos/list', {
				  		"infophotos" : infophotos
			  		});
			 	},
				json: function(){
			   		res.json(infophoto);
			 	}
			});
		}
	});
});

/* GET Take Pictures */
router.get('/takepic/:uniqueurl', function(req, res) {
    mongoose.model('Infophoto').findOne({uniqueurl : req.params.uniqueurl}, function (err, infophoto) {
		if (err) {
			console.log('GET Error: There was a problem retrieving: ' + err);
		} else {
			//console.log('GET Retrieving all empty infophotos: ' + infophotos);
			res.format({
				html: function(){
				   	res.render('infophotos/takepic', {
				  		"infophoto" : infophoto
			  		});
			 	}
			});
		}
	});
});

/* GET Take Pictures */
router.post('/addpic/:uniqueurl', function(req, res) {
	buf = new Buffer(req.body.photo.replace(/^data:image\/\w+;base64,/, ""),'base64')
    var s3 = new AWS.S3({accessKeyId: S3accessKeyId, secretAccessKey: S3secretAccessKey});
    var params = {
		Bucket: 'emcphotobooth', /* required */
		Key: req.params.uniqueurl + '/' + req.body.number + '.png', /* required */
		ACL: 'public-read',
		Body: buf,
		ContentType:  'image/png',
		ContentEncoding: 'base64'
	};
	s3.putObject(params, function(err, data) {
		if (err) console.log(err, err.stack); // an error occurred
		else     console.log(data);           // successful response
	});

	mongoose.model('Infophoto').findOneAndUpdate({uniqueurl : req.params.uniqueurl},
			{$push: {'photos': 'https://' + S3url + '/emcphotobooth/' + req.params.uniqueurl + '/' + req.body.number + '.png'}},
		    {safe: true, upsert: true},
		    function(err, model) {
		        //console.log(err);
		        //console.log(model);
		    }
	);

	res.format({
		text: function(){
			res.send('success');
	 	},
		json: function(){
	   		res.json({message : 'success'});
	 	}
	});

});

// route middleware to validate :uniqueurl
router.param('uniqueurl', function(req, res, next, uniqueurl) {
    //console.log('validating ' + uniqueurl + ' exists');
    mongoose.model('Infophoto').findOne({uniqueurl: uniqueurl}, function (err, infophoto) {
		if (err) {
			console.log(uniqueurl + ' was not found');
			res.status(404)
			var err = new Error('Not Found');
			err.status = 404;
			res.format({
				html: function(){
					next(err);
			 	},
				json: function(){
			   		res.json({message : err.status  + ' ' + err});
			 	}
			});
		} else if (infophoto === null) {
			console.log(uniqueurl + ' was not found');
			res.status(404)
			var err = new Error('Not Found');
			err.status = 404;
			res.format({
				html: function(){
					next(err);
			 	},
				json: function(){
			   		res.json({message : err.status  + ' ' + err});
			 	}
			});
		} else {
			//console.log(infophoto);
			// once validation is done save the new item in the req
			req.uniqueurl = uniqueurl;
			// go to the next thing
    		next(); 
		} 
	});
});

router.route('/:uniqueurl')
	.get(function(req, res) {
		mongoose.model('Infophoto').findOne({uniqueurl : req.params.uniqueurl}, function (err, infophoto) {
			if (err) {
				console.log('GET Error: There was a problem retrieving: ' + err);
			} else {
				console.log('GET Retrieving uniqueurl: ' + infophoto.uniqueurl);
				res.format({
					html: function(){
					   	res.render('infophotos/show', {
					  		"infophoto" : infophoto
				  		});
				 	},
					json: function(){
				   		res.json(infophoto);
				 	}
				});
			}
		});
	});

router.route('/:uniqueurl/edit')
	.get(function(req, res) {
		mongoose.model('Infophoto').findOne({uniqueurl : req.params.uniqueurl}, function (err, infophoto) {
			if (err) {
				console.log('GET Error: There was a problem retrieving: ' + err);
			} else {
				console.log('GET Retrieving uniqueurl: ' + infophoto.uniqueurl);
				res.format({
					html: function(){
					   	res.render('infophotos/edit', {
					  		"infophoto" : infophoto
				  		});
				 	},
					json: function(){
				   		res.json(infophoto);
				 	}
				});
			}
		});
	})
	.put(function(req, res) {
		// Get our form values. These rely on the "name" attributes
	    var fname = req.body.fname;
	    var lname = req.body.lname;
	    var twitter = req.body.twitter;
	    var company = req.body.company;
	    var title = req.body.title;
	    var newsletter = req.body.newsletter;
	    var interests = req.body.interests;
	    var favoritedemo = req.body.favoritedemo;

	    //find the document by uniqueurl and then update it
		mongoose.model('Infophoto').findOne({uniqueurl : req.params.uniqueurl}, function (err, infophoto) {
			infophoto.update({
		    	fname : fname,
		    	lname : lname,
		    	twitter : twitter,
		    	company : company,
		    	title : title,
		    	newsletter : newsletter,
		    	interests : interests,
		    	favoritedemo : favoritedemo
		    }, function (err, infophotoID) {
			  if (err) {
			  	//return handleError(err);
			  	res.send("There was a problem updating the information to the database: " + err);
			  } 
			  else {
			  		//console.log('PUT updating uniqueurl: ' + infophoto.uniqueurl);
			  		res.format({
			  			html: function(){
						   	res.redirect("/infophotos/" + infophoto.uniqueurl);
					 	},
						json: function(){
					   		res.json(infophoto);
					 	}
			  		});
		       }
			})
		});
	})
	.delete(function (req, res){
		mongoose.model('Infophoto').findOne({uniqueurl : req.params.uniqueurl}, function (err, infophoto) {
			if (err) {
				return console.error(err);
			} else {
				infophoto.remove(function (err, infophoto) {
					if (err) {
						return console.error(err);
					} else {
						console.log('DELETE removing uniqueurl: ' + infophoto.uniqueurl);
						res.format({
				  			html: function(){
							   	res.redirect("/infophotos");
						 	},
							json: function(){
						   		res.json({message : 'deleted',
						   			item : infophoto
						   		});
						 	}
				  		});
					}
				});
			}
		});
	});

module.exports = router;
