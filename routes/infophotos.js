var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	bodyParser = require('body-parser'),
	methodOverride = require('method-override'),
	async = require('async');

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
		mongoose.model('Infophoto').findOne({uniqueurl : req.uniqueurl}, function (err, infophoto) {
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

/* GET New Infophoto page. */
router.get('/list', function(req, res) {
    mongoose.model('Infophoto').find({photos : 'undefined'}, function (err, infophotos) {
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

module.exports = router;
