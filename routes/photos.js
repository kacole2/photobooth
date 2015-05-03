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
	twitter = require('twitter'),
	CCClient = require('constantcontact');

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
    Twitter_access_token_secret = nconf.get('Twitter_access_token_secret'),
    ConstantContactKey = nconf.get('ConstantContactKey'),
    ConstantContactToken = nconf.get('ConstantContactToken'),
    ConstantContactList = nconf.get('ConstantContactList');

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

//build the Constant Contact Client for automatically subscribing new users
var constantContactClient = new CCClient();
constantContactClient.useKey(ConstantContactKey);
constantContactClient.useToken(ConstantContactToken);

//used for taking the registration of attendees and capitilizing the first letter of the String
String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

//use this for ALL requests
router.use(bodyParser.urlencoded({ extended: true }))
router.use(methodOverride(function(req, res){
  	if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    	// look in urlencoded POST bodies and delete it
    	var method = req.body._method
    	delete req.body._method
    	return method
  	}
}))

//get the index page that shows everything
router.route('/')
	.get(function(req, res, next) {
		//get all records and sort by lastname
		mongoose.model('Photo').find({}, null, {sort: {lname: 1}}, function (err, photos) {
		  	if (err) {
		  		return console.error(err);
		  	} else {
		  		//calculate the total stats for each section
		  		var totalphotos = 0;
		  		var totalpictures = 0;
		  		var subscribers = 0;
		  		async.each(photos, function(photo, done){
		  			totalphotos +=1;
		  			if(photo.newsletter == true){
		  				subscribers += 1;
		  			}
		  			if(photo.photos.length > 0){
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
						    	res.render('photos/index', {
						  			title: "Everyone's Info",
						  			"photos" : photos, //all photos and use dot notation for attributes for each
						  			"totalphotos" : totalphotos,
						  			"totalpictures" : totalpictures,
						  			"subscribers" : subscribers
					  			});
							},
							json: function(){
						    	res.json(photos);
							}
						});
				    }
		  		});
		  	} 	
		});
	})
	.post(function(req, res) {
	    // Get our form values. These rely on the "name" attributes. Used to create new records/documents in MongoDB
	    var fname = req.body.fname;
	    var lname = req.body.lname;
	    var email = req.body.email;
	    var twitter = req.body.twitter;
	    var company = req.body.company;
	    var title = req.body.title;
	    var newsletter = req.body.newsletter;
	    var contentlearn = req.body.contentlearn;
	    var contentcode = req.body.contentcode;
	    var contentdeploy = req.body.contentdeploy;
	    var contentsession = req.body.contentsession;
 		
 		//Iterator to allow the same person to come to the photobooth as many times as they want
	    var uniqueurlIterator = 0;
	    //need to find in mongo by uniqueurl. if exists then add 1 to fname+lname
	    var goodurl = false;

	    async.until(	
	    	function (){ return goodurl == true }, 
	    	function(done){
	    		//uniqueurl concatenates fname, lname, and iterator and removes whitespaces
	    		var uniqueurl = fname.replace(/\s+/g, '').toLowerCase() + lname.replace(/\s+/g, '').toLowerCase() + uniqueurlIterator.toString();
	    		fname = fname.capitalizeFirstLetter();
	    		lname = lname.capitalizeFirstLetter();
	    		console.log('Trying: ' + uniqueurl);
	    		//look to see if the uniqueurl exists
	    		mongoose.model('Photo').findOne({ uniqueurl: uniqueurl}, function (err, photo) {
		    		if (err) {
		    			console.log(err);
		    		} else {
		    			//if it doesn't and there are no photos yet, then lets create the record. the done() callback will kill the async until loop
		    			if (photo == null){
		    				//set the goodurl to true so it won't run again
		    				goodurl = true;
		    				mongoose.model('Photo').create({
						    	fname : fname,
						    	lname : lname,
						    	email : email,
						    	twitter : twitter,
						    	company : company,
						    	title : title,
						    	newsletter : newsletter,
						    	contentlearn : contentlearn,
						    	contentcode : contentcode,
						    	contentdeploy : contentdeploy,
						    	contentsession : contentsession,
						    	uniqueurl : uniqueurl
						    }, function (err, photo) {
							  	if (err) {
							  		console.log(err);
							  		//return handleError(err);
							  		res.send("There was a problem adding the information to the database.");
							  	} else {
							  		console.log('POST creating new photo: ' + photo);
							  		res.format({
										html: function(){
											res.render('photos/thanks', {
										   		title: "Photo Booth Registration Success"
									  		});
											/* If it worked, set the header so the address bar doesn't still say /adduser
									    	res.location("Photo Booth Registration Success");
									    	// And forward to success page
						            		res.redirect("../");*/
										},
										json: function(){
									    	res.json(photo);
										}
									});
									//automatically subscribe new users to ConstantContact
									if (newsletter == 'on'){
										//create the new contact structure
										var newContact = {
											"lists": [
												{
												"id": ConstantContactList
												}
											],
											  "company_name": company,
											  "confirmed": true,
											  "email_addresses": [
												{
												"email_address": email
												}
											],
										  "first_name": fname,
										  "job_title": title,
										  "last_name": lname
										};
										//add the new contact
										constantContactClient.contacts.post(newContact, true, function (err, res) {
										    if (err){ 
										    	console.log('Error adding to Constant Contact: ' + err); 
										    } else {
										    	console.log('New Constant Contact: \n' + res);
										    }
										});
									}
						      	}
							})
		    			} else {
		    				//didn't find anything so add 1 and try again
		    				uniqueurlIterator += 1;
		    				done();
		    			}
		    		}
		    	});
	    	}, function(err){}
	    )
	});

/* GET New Photo page. */
router.get('/new', function(req, res) {
    res.render('photos/new', { title: 'Photo Booth Registration' });
});

/* GET List of Pictures to be taken */
router.get('/list', function(req, res) {
    mongoose.model('Photo').find({photos : []}, null, {sort: {lname: 1}}, function (err, photos) {
		if (err) {
			console.log('GET Error: There was a problem retrieving: ' + err);
		} else {
			//console.log('GET Retrieving all empty photos: ' + photos);
			res.format({
				html: function(){
				   	res.render('photos/list', {
				   		title: "Waiting to Take Photos",
				  		"photos" : photos
			  		});
			 	},
				json: function(){
			   		res.json(photo);
			 	}
			});
		}
	});
});

/* GET Take Pictures */
router.get('/takepic/:uniqueurl', function(req, res) {
    mongoose.model('Photo').findOne({uniqueurl : req.params.uniqueurl}, function (err, photo) {
		if (err) {
			console.log('GET Error: There was a problem retrieving: ' + err);
		} else {
			//console.log('GET Retrieving all empty photos: ' + photos);
			res.format({
				html: function(){
				   	res.render('photos/takepic', {
				   		title: "Photo Booth",
				  		"photo" : photo
			  		});
			 	}
			});
		}
	});
});

/* POST Add Picture to ECS/S3 */
router.post('/addpic/:uniqueurl', function(req, res) {
	buf = new Buffer(req.body.photo.replace(/^data:image\/\w+;base64,/, ""),'base64') //takes the photo from AJAX call as a buffer
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

	mongoose.model('Photo').findOneAndUpdate({uniqueurl : req.params.uniqueurl},
			/* IF AWS */
			//{$push: {'photos': 'https://' + S3url + '/emcphotobooth/' + req.params.uniqueurl + '/' + req.body.number + '.jpeg'}},
			/* IF ViPROnline */
			//add photo URL to the array photos
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
	//empty string that will eventually contain HTML that we add to the email to be sent
	var content = '';
	var newsletter = '';

	//the next three sections look at the checkboxes that were checked during registration and adds those to create a custom based email
	if (req.body.contentlearn === undefined || req.body.contentlearn.length == 0) {
    	// empty
	} else {
		content += '<div style="width: 90%; margin: 0 5%;"><h3 style="text-align:center">LEARN</h3><ul>';
		var clToArray = req.body.contentlearn.split(',');
		clToArray.forEach(function(cl) {
		    if(cl == 'Docker Hackday'){
		    	content += '<li><strong>Docker Hackday</strong> | <a href="https://github.com/emccode/training/tree/master/docker-hackday">https://github.com/emccode/training/tree/master/docker-hackday</a></li>';
		    } else if (cl == 'DevOps GeekWeek'){
		    	content += '<li><strong>DevOps GeekWeek</strong> | <a href="https://github.com/emccode/training/tree/master/devops-geekweek">https://github.com/emccode/training/tree/master/devops-geekweek</a></li>';
		    } else if (cl == 'DevOps Field Accred'){
		    	content += '<li><strong>DevOps Field Accred</strong> | <a href="https://github.com/emccode/training/tree/master/accreditation">https://github.com/emccode/training/tree/master/accreditation</a></li>';
		    } else if (cl == 'Web Automation Center'){
		    	content += '<li><strong>Web Automation Center</strong> | <a href="https://github.com/djannot/web-automation-center">https://github.com/djannot/web-automation-center</a></li>';
		    } 
		});
		content += '</ul></div>';
	}

	if (req.body.contentcode === undefined || req.body.contentcode.length == 0) {
    	// empty
	} else {
		content += '<div style="width: 90%; margin: 0 5%;"><h3 style="text-align:center">CODE</h3><ul>';
		var ccToArray = req.body.contentcode.split(',');
		ccToArray.forEach(function(cc) {
			if(cc == 'ScaleIO'){
		    	content += '<li><strong>ScaleIO</strong> <ul><li><a href="https://github.com/emccode/SIOToolKit">https://github.com/emccode/SIOToolKit</a></li><li><a href="https://github.com/virtualswede/vagrant-scaleio">https://github.com/virtualswede/vagrant-scaleio</a></li><li><a href="https://github.com/emccode/puppet-scaleio">https://github.com/emccode/puppet-scaleio</a></li><li><a href="https://github.com/emccode/vagrant-puppet-scaleio">https://github.com/emccode/vagrant-puppet-scaleio</a></li><li><a href="https://github.com/djannot/scaleio-docker">https://github.com/djannot/scaleio-docker</a></li><li><a href="http://vdash.cfapps.io/scaleio">http://vdash.cfapps.io/scaleio</a></li><li><a href="https://github.com/emccode/arrowhead">https://github.com/emccode/arrowhead</a></li></ul>';
		    } else if (cc == 'ViPR/ECS'){
		    	content += '<li><strong>ViPR/ECS</strong> <ul><li><a href="https://github.com/emccode/Vipruby">https://github.com/emccode/Vipruby</a></li><li><a href="https://github.com/emcvipr/dataservices-sdk-java">https://github.com/emcvipr/dataservices-sdk-java</a></li><li><a href="https://github.com/emcvipr/dataservices-sdk-python">https://github.com/emcvipr/dataservices-sdk-python</a></li><li><a href="https://github.com/emcvipr/dataservices-sdk-dotnet">https://github.com/emcvipr/dataservices-sdk-dotnet</a></li><li><a href="https://github.com/chadlung/viperpy">https://github.com/chadlung/viperpy</a></li><li><a href="https://github.com/emcvipr/mnrcli">https://github.com/emcvipr/mnrcli</a></li><li><a href="https://github.com/emccode/s3motion">https://github.com/emccode/s3motion</a></li><li><a href="https://github.com/emccode/socieidos">https://github.com/emccode/socieidos</a></li><li><a href="https://github.com/kacole2/vipr_scripts">https://github.com/kacole2/vipr_scripts</a></li><li><a href="https://github.com/emcvipr/controller-openstack-cinder">https://github.com/emcvipr/controller-openstack-cinder</a></li></ul>';
		    } else if (cc == 'XtremIO'){
		    	content += '<li><strong>XtremIO</strong> <ul><li><a href="https://github.com/bkvarda/xtremlib">https://github.com/bkvarda/xtremlib</a></li><li><a href="https://github.com/evanbattle/XtremIOSnap">https://github.com/evanbattle/XtremIOSnap</a></li><li><a href="https://github.com/shairozan/xsnapcourier">https://github.com/shairozan/xsnapcourier</a></li><li><a href="https://github.com/emc-openstack/xtremio-cinder-driver">https://github.com/emc-openstack/xtremio-cinder-driver</a></li></ul>';
		    } else if (cc == 'VMAX'){
		    	content += '<li><strong>VMAX</strong> <ul><li><a href="https://github.com/seancummins/dockerized_symcli">https://github.com/seancummins/dockerized_symcli</a></li><li><a href="https://github.com/seancummins/fast_report">https://github.com/seancummins/fast_report</a></li><li><a href="https://github.com/wmasry/SAN-Commands-Generator">https://github.com/wmasry/SAN-Commands-Generator</a></li><li><a href="https://github.com/emc-openstack/vmax-cinder-driver">https://github.com/emc-openstack/vmax-cinder-driver</a></li></ul>';
		    } else if (cc == 'VMware NSX'){
		    	content += '<li><strong>VMware NSX</strong> <ul><li><a href="https://github.com/wallnerryan/nvpnsxapi">https://github.com/wallnerryan/nvpnsxapi</a></li><li><a href="https://github.com/WahlNetwork/nsx-tier-builder">https://github.com/WahlNetwork/nsx-tier-builder</a></li></ul>';
		    } else if (cc == 'vCloud Air'){
		    	content += '<li><strong>vCloud Air</strong> <ul><li><a href="https://github.com/emccode/goair">https://github.com/emccode/goair</a></li><li><a href="https://github.com/emccode/core2f">https://github.com/emccode/core2f</a></li></ul>';
		    } else if (cc == 'OpenStack'){
		    	content += '<li><strong>OpenStack</strong> <ul><li><a href="https://github.com/emc-openstack/vnx-faulty-device-cleanup">https://github.com/emc-openstack/vnx-faulty-device-cleanup</a></li><li><a href="https://github.com/emcvipr/controller-openstack-cinder">https://github.com/emcvipr/controller-openstack-cinder</a></li><li><a href="https://github.com/emc-openstack/vnx-direct-driver">https://github.com/emc-openstack/vnx-direct-driver</a></li><li><a href="https://github.com/emc-openstack/vmax-cinder-driver">https://github.com/emc-openstack/vmax-cinder-driver</a></li><li><a href="https://github.com/emc-openstack/xtremio-cinder-driver">https://github.com/emc-openstack/xtremio-cinder-driver</a></li><li><a href="https://github.com/emc-openstack/smis-fc-cinder-driver">https://github.com/emc-openstack/smis-fc-cinder-driver</a></li><li><a href="https://github.com/emc-openstack/smis-iscsi-cinder-driver">https://github.com/emc-openstack/smis-iscsi-cinder-driver</a></li><li><a href="https://github.com/emc-openstack/vnxe-cinder-driver">https://github.com/emc-openstack/vnxe-cinder-driver</a></li></ul>';
		    }
		});
		content += '</ul></div>';
	}

	if (req.body.contentdeploy === undefined || req.body.contentdeploy.length == 0) {
    	// empty
	} else {
		content += '<div style="width: 90%; margin: 0 5%;"><h3 style="text-align:center">DEPLOY</h3><ul>';
		var cdToArray = req.body.contentdeploy.split(',');
		cdToArray.forEach(function(cd) {
		    if(cd == 's3motion'){
		    	content += '<li><strong>s3motion</strong> | <a href="https://github.com/emccode/s3motion">https://github.com/emccode/s3motion</a></li>';
		    } else if (cd == 'Socieidos'){
		    	content += '<li><strong>Socieidos</strong> | <a href="https://github.com/emccode/socieidos">https://github.com/emccode/socieidos</a></li>';
		    } else if (cd == 'VagrantSpice'){
		    	content += '<li><strong>VagrantSpice</strong> | <a href="https://github.com/emccode/vagrantspice">https://github.com/emccode/vagrantspice</a></li>';
		    } else if (cd == 'Vagrant-ScaleIO'){
		    	content += '<li><strong>Vagrant-ScaleIO</strong> | <a href="https://github.com/virtualswede/vagrant-scaleio">https://github.com/virtualswede/vagrant-scaleio</a></li>';
		    } else if (cd == 'Puppet-ScaleIO'){
		    	content += '<li><strong>Puppet-ScaleIO</strong> | <a href="https://github.com/emccode/puppet-scaleio">https://github.com/emccode/puppet-scaleio</a></li>';
		    } else if (cd == 'Dogged'){
		    	content += '<li><strong>Dogged</strong> | <a href="https://github.com/emccode/dogged">https://github.com/emccode/dogged</a></li>';
		    } else if (cd == 'RexRay'){
		    	content += '<li><strong>RexRay</strong> | <a href="https://github.com/emccode/rexray">https://github.com/emccode/rexray</a></li>';
		    } else if (cd == 'GoAir'){
		    	content += '<li><strong>GoAir</strong> | <a href="https://github.com/emccode/goair">https://github.com/emccode/goair</a></li>';
		    } else if (cd == 'Core2F'){
		    	content += '<li><strong>Core2F</strong> | <a href="https://github.com/emccode/core2f">https://github.com/emccode/core2f</a></li>';
		    } else if (cd == 'photobooth'){
		    	content += '<li><strong>photobooth</strong> | <a href="https://github.com/emccode/photobooth">https://github.com/emccode/photobooth</a></li>';
		    } else if (cd == 'VStriker'){
		    	content += '<li><strong>VStriker</strong> | <a href="https://github.com/emccode/VStriker">https://github.com/emccode/VStriker</a></li>';
		    } else if (cd == 'mosaicme'){
		    	content += '<li><strong>mosaicme</strong> | <a href="https://github.com/emccode/mosaicme">https://github.com/emccode/mosaicme</a></li>';
		    }
		});
		content += '</ul></div>';
	}

	if (req.body.contentsession === undefined || req.body.contentsession.length == 0) {
    	// empty
	} else {
		content += '<div style="width: 90%; margin: 0 5%;"><h3 style="text-align:center">Thanks for coming out to DevOps @ EMCWorld! See you next year!<br><a href="http://emccode.github.io/devopsemc/">emccode.github.io/devopsemc</a></h3></div>';
	}

	//create a newsletter signup in case they didn't subscribe during registration
	if(req.body.newsletter == false){
		newsletter += '<p>We noticed you did not get a chance to subscribe to the EMC {code} newletter. Want to now?</p><div style="text-align:center;margin-right:auto;margin-left:auto;"><a href="http://visitor.r20.constantcontact.com/d.jsp?llr=qipf4rsab&amp;p=oi&amp;m=1119442091280&amp;sit=7hqmx8ijb&amp;f=928bf5a1-912d-4bcd-bcf4-422e2f9acb40" class="button" style="border:2px solid rgb(91,91,91);color:rgb(67,177,230);display:inline-block;padding:8px 10px;text-shadow:none;border-radius:5px;background-color:rgb(240,240,240);">EMC {code} Newsletter Sign-up</a></div>'
	}
	//the mailer form
	var mailOptions = {	
	    from: 'EMC Code Photo Booth <emccode.photobooth@emc.com>', // sender address
	    to: req.body.email, // list of receivers
	    subject: 'Your EMC {code} Photo Booth Photos!', // Subject line
	    html: '<!DOCTYPE html><html><body style="width: 100%;"><div style="width: 90%;margin: 1% 5%;"><center><a href="http://emccode.github.io/"><img src="http://emccode.github.io/images/badge_text.png" style="width:150px;"></a><h1>Photo Booth Photos</h1><h2>EMC World Las Vegas</h2><h2>May 4-7, 2015</h2></center><p>Thank you for visiting <a href="http://emccode.github.io/">EMC {code}</a> while you were at EMC World 2015! EMC is committed to the open source software and communities. EMC is constantly releasing new open source projects and it all lives on the <a href="http://emccode.github.io/">EMC {code} Github</a> page. Also be sure to follow <a href="https://twitter.com/emccode">@EMCCode</a> on twitter and check out the <a href="http://blog.emccode.com/">EMC {code} Blog</a> frequently for updates on our latest projects.</p>' + content + newsletter + '<p>Want to relive those Photo Booth moments? Go check out your photos at <a href="http://photobooth.emccode.com/photos/' + req.params.uniqueurl + '">' + req.params.uniqueurl + '</a></p><ul style="list-style: none;width: 100%;margin: 0;padding: 0;"><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo1.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo2.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo3.jpeg" style="width: 100%;"></li><li style="width: 48%;display: inline-block;margin-top: 5px;margin-bottom: 5px;margin-left: 1%;margin-right: 1%;"><img src="http://' + S3url + '/' + req.params.uniqueurl + '/photo4.jpeg" style="width: 100%;"></li></ul><p style="text-align:center;">Powered By: <a href="https://www.emc.com/storage/ecs-appliance/index.htm">EMC ECS</a> & <a href="http://pivotal.io/platform-as-a-service/pivotal-cloud-foundry">Pivotal Cloud Foundry</a></p></div></body></html>',
	    generateTextFromHTML: true
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
						status: twitid + ' Check out your #EMCWorld Photo Booth pictures at http://photobooth.emccode.com/photos/' + req.params.uniqueurl + ' #DevOpsEMC',
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
    mongoose.model('Photo').findOne({uniqueurl: uniqueurl}, function (err, photo) {
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
		} else if (photo === null) {
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
			//console.log(photo);
			// once validation is done save the new item in the req
			req.uniqueurl = uniqueurl;
			// go to the next thing
    		next(); 
		} 
	});
});

/* GET Show page for a particular user */
router.route('/:uniqueurl')
	.get(function(req, res) {
		mongoose.model('Photo').findOne({uniqueurl : req.params.uniqueurl}, function (err, photo) {
			if (err) {
				console.log('GET Error: There was a problem retrieving: ' + err);
			} else {
				console.log('GET Retrieving uniqueurl: ' + photo.uniqueurl);
				res.format({
					html: function(){
					   	res.render('photos/show', {
					   		title: "Photo Booth for " + photo.fname,
					  		"photo" : photo
				  		});
				 	},
					json: function(){
				   		res.json(photo);
				 	}
				});
			}
		});
	});

/* GET the Edit page for a particular user */
router.route('/:uniqueurl/edit')
	.get(function(req, res) {
		mongoose.model('Photo').findOne({uniqueurl : req.params.uniqueurl}, function (err, photo) {
			if (err) {
				console.log('GET Error: There was a problem retrieving: ' + err);
			} else {
				console.log('GET Retrieving uniqueurl: ' + photo.uniqueurl);
				res.format({
					html: function(){
					   	res.render('photos/edit', {
					   		title: "Edit Info for " + photo.fname,
					  		"photo" : photo
				  		});
				 	},
					json: function(){
				   		res.json(photo);
				 	}
				});
			}
		});
	})
	.put(function(req, res) {
		/* PUT the Edit page for a particular user */
		// Get our form values. These rely on the "name" attributes
	    var fname = req.body.fname;
	    var lname = req.body.lname;
	    var twitter = req.body.twitter;
	    var company = req.body.company;
	    var title = req.body.title;
	    var newsletter = req.body.newsletter;
	    var contentlearn = req.body.contentlearn;
	    var contentcode = req.body.contentcode;
	    var contentdeploy = req.body.contentdeploy;

	    //find the document by uniqueurl and then update it
		mongoose.model('Photo').findOne({uniqueurl : req.params.uniqueurl}, function (err, photo) {
			photo.update({
		    	fname : fname,
		    	lname : lname,
		    	twitter : twitter,
		    	company : company,
		    	title : title,
		    	newsletter : newsletter,
		    	contentlearn : contentlearn,
				contentcode : contentcode,
				contentdeploy : contentdeploy
		    }, function (err, photoID) {
			  if (err) {
			  	//return handleError(err);
			  	res.send("There was a problem updating the information to the database: " + err);
			  } 
			  else {
			  		//console.log('PUT updating uniqueurl: ' + photo.uniqueurl);
			  		res.format({
			  			html: function(){
						   	res.redirect("/photos/" + photo.uniqueurl);
					 	},
						json: function(){
					   		res.json(photo);
					 	}
			  		});
		       }
			})
		});
	})
	.delete(function (req, res){
		/* DELETE a particular user */
		mongoose.model('Photo').findOne({uniqueurl : req.params.uniqueurl}, function (err, photo) {
			if (err) {
				return console.error(err);
			} else {
				photo.remove(function (err, photo) {
					if (err) {
						return console.error(err);
					} else {
						console.log('DELETE removing uniqueurl: ' + photo.uniqueurl);
						res.format({
				  			html: function(){
							   	res.redirect("/photos");
						 	},
							json: function(){
						   		res.json({message : 'deleted',
						   			item : photo
						   		});
						 	}
				  		});
					}
				});
			}
		});
	});

module.exports = router;
