var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	async = require('async'),
	nconf = require('nconf'),
	AWS = require('aws-sdk'),
	nodemailer = require('nodemailer'),
	sesTransport = require('nodemailer-ses-transport'),
	request = require('request').defaults({ encoding: null }),
	twitter = require('twitter');

//Pull in credentials from JSON file for everything
nconf.file('creds.json');
var S3accessKeyId = nconf.get('S3accessKeyId'),
    S3secretAccessKey = nconf.get('S3secretAccessKey'),
    S3endpoint = nconf.get('S3endpoint'),
    S3url = nconf.get('S3url'),
    smtpHost = nconf.get('smtpHost'),
    SESaccessKeyId = nconf.get('SESaccessKeyId'),
    SESsecretAccessKey = nconf.get('SESsecretAccessKey'),
    Twitter_consumer_key = nconf.get('Twitter_consumer_key'),
    Twitter_consumer_secret = nconf.get('Twitter_consumer_secret'),
    Twitter_access_token = nconf.get('Twitter_access_token'),
    Twitter_access_token_secret = nconf.get('Twitter_access_token_secret');

//build the transport layer for creating emails
var transporter = nodemailer.createTransport(sesTransport({
    accessKeyId: SESaccessKeyId,
    secretAccessKey: SESsecretAccessKey
}));

//build twitter access and key tokens using Twit
var twitterClient = new twitter({
    consumer_key:  Twitter_consumer_key,
    consumer_secret:  Twitter_consumer_secret,
    access_token_key:  Twitter_access_token,
    access_token_secret: Twitter_access_token_secret 
})

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

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
		mongoose.model('Infophoto').find({}, null, {sort: {lname: 1}}, function (err, infophotos) {
		  	if (err) {
		  		return console.error(err);
		  	} else {
		  		var totalinfophotos = 0;
		  		var totalpictures = 0;
		  		var subscribers = 0;
		  		async.each(infophotos, function(infophoto, done){
		  			totalinfophotos +=1;
		  			if(infophoto.newsletter == true){
		  				subscribers += 1;
		  			}
		  			if(infophoto.photos.length > 0){
		  				totalpictures += 4;
		  			}
		  			done();
		  		}, function(err){
				    // if any of the file processing produced an error, err would equal that error
				    if( err ) {
				      // One of the iterations produced an error.
				      // All processing will now stop.
				      console.log('A file failed to process');
				    } else {
					    res.format({
							html: function(){
						    	res.render('infophotos/index', {
						  			title: "Everyone's Info",
						  			"infophotos" : infophotos,
						  			"totalinfophotos" : totalinfophotos,
						  			"totalpictures" : totalpictures,
						  			"subscribers" : subscribers
					  			});
							},
							json: function(){
						    	res.json(infophotos);
							}
						});
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

	    var uniqueurlIterator = 0;
	    var uniqueurl = fname.toLowerCase() + lname.toLowerCase() + uniqueurlIterator.toString();
	    //need to find in mongo by uniqueurl. if exists then add 1 to fname+lname
	    var goodurl = false;

	    async.until(	
	    	function (){ return goodurl == true }, 
	    	function(done){
	    		uniqueurl = fname.toLowerCase() + lname.toLowerCase() + uniqueurlIterator.toString();
	    		fname = fname.capitalizeFirstLetter();
	    		lname = lname.capitalizeFirstLetter();
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
											res.render('infophotos/thanks', {
										   		title: "Photo Booth Registration Success"
									  		});
											/* If it worked, set the header so the address bar doesn't still say /adduser
									    	res.location("Photo Booth Registration Success");
									    	// And forward to success page
						            		res.redirect("../");*/
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
    res.render('infophotos/new', { title: 'Photo Booth Registration' });
});

/* GET List of Pictures to be taken */
router.get('/list', function(req, res) {
    mongoose.model('Infophoto').find({photos : []}, null, {sort: {lname: 1}}, function (err, infophotos) {
		if (err) {
			console.log('GET Error: There was a problem retrieving: ' + err);
		} else {
			//console.log('GET Retrieving all empty infophotos: ' + infophotos);
			res.format({
				html: function(){
				   	res.render('infophotos/list', {
				   		title: "Waiting to Take Photos",
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
				   		title: "Photo Booth",
				  		"infophoto" : infophoto
			  		});
			 	}
			});
		}
	});
});

/* POST Add Picture to ECS/S3 */
router.post('/addpic/:uniqueurl', function(req, res) {
	buf = new Buffer(req.body.photo.replace(/^data:image\/\w+;base64,/, ""),'base64')
    var s3 = new AWS.S3({
    	accessKeyId: S3accessKeyId, 
    	secretAccessKey: S3secretAccessKey, 
    	endpoint: S3endpoint
    });    
    var params = {
		Bucket: 'emcphotobooth', 
		Key: req.params.uniqueurl + '/' + req.body.number + '.jpeg',
		Body: buf,
		ACL: 'public-read',
		ContentType:  'image/jpeg'
	};
	s3.putObject(params, function(err, data) {
		if (err) {
			console.log(err, err.stack); // an error occurred
		} 
		else {
			console.log(data);           // successful response
		}
	});

	mongoose.model('Infophoto').findOneAndUpdate({uniqueurl : req.params.uniqueurl},
			/* IF AWS */
			//{$push: {'photos': 'https://' + S3url + '/emcphotobooth/' + req.params.uniqueurl + '/' + req.body.number + '.jpeg'}},
			/* IF ViPROnline */
			{$push: {'photos': 'http://' + S3url + '/' + req.params.uniqueurl + '/' + req.body.number + '.jpeg'}},
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

/* POST Send Email */
router.post('/sendmail/:uniqueurl', function(req, res) {
	var mailOptions = {
	    from: 'EMC Code Photo Booth <emccode.photobooth@emc.com>', // sender address
	    to: req.body.email, // list of receivers
	    subject: 'Your EMC {code} Photo Booth Photos!', // Subject line
	    html: '<!DOCTYPE html><html><body style="width: 100%;"><div style="width: 90%;margin: 1% 5%;"><center><a href="http://emccode.github.io/"><img src="http://emccode.github.io/images/badge.png" style="width:100px;"></a><h1>EMC {code} Photo Booth Photos</h1><h2>EMC World Las Vegas</h2><h2>May 4-7, 2015</h2></center><p>Thanks for checking out <a href="http://emccode.github.io/">EMC {code}</a> while you were at EMC World! EMC is committed to the open source movement. EMC is constantly releasing new open source bits and it all lives on the <a href="http://emccode.github.io/">EMC {code} Github</a> page. Also be sure to check out the <a href="http://blog.emccode.com/">EMC {code} Blog</a> frequently for information on some of our latest projects.</p><p>Want to relive those Photo Booth moments? Go check out your photos at <a href="http://emccodephotos.cfapps.io/infophotos/' + req.params.uniqueurl + '">' + req.params.uniqueurl + '</a></p><ul style="list-style: none;width: 100%;margin: 0;padding: 0;"><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo1.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo2.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo3.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo4.jpeg" style="width: 100%;"></li></ul></div></body></html>'
	};

	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        console.log(error);
	    }else{
	    	console.log('Sending email to: ' + req.body.email);
	    }
	});
	res.format({
		text: function(){
			res.send('success');
	 	},
		json: function(){
	   		res.json({message : 'email sent successfully'});
	 	}
	});
});

/* POST Send Tweet */
router.post('/sendtweet/:uniqueurl', function(req, res) {
	console.log('sending tweet');
	var twitid = req.body.twitid.toString();
	if(twitid.charAt(0) != '@'){
		twitid = '@' + twitid;
	}

	//get the image from S3/ECS that will post a photo to twitter as well
	request.get('http://' + S3url + '/' + req.params.uniqueurl + '/photo2.jpeg', function (error, response, photoboothPic) {
	    if (!error && response.statusCode == 200) {
	        //post the image to twitter
			twitterClient.post('media/upload', { media: photoboothPic }, function (err, media, response) {
			  // now we can reference the media and post a tweet (media will attach to the tweet)
			  if(err){
			  		console.log(err);
			  } else {
					var status = { 
						status: twitid + ' Check out your EMC World Photo Booth Photos at http://emcphotobooth.cfapps.io/infophotos/' + req.params.uniqueurl + ' #DevOpsEMC',
						media_ids: media.media_id_string
					}

					twitterClient.post('statuses/update', status, function (err, tweet, response) {
						if (!error) {
					        console.log('Sending tweet to: ' + twitid);
					    }
					})
			  }
			})
	    }
	});

	res.format({
		text: function(){
			res.send('success');
	 	},
		json: function(){
	   		res.json({message : 'tweet sent successfully'});
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
					   		title: "Photo Booth for " + infophoto.fname,
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
					   		title: "Edit Info for " + infophoto.fname,
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
