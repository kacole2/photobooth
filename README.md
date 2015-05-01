photobooth
======================
Photobooth is exactly what you think it is, it's an application to run a Photo Booth! This application was/is/will be used at EMC World 2015 in the EMC {code} booth. 

## Description
The photobooth uses the following technologies:
- MongoDB
- Node.js
- Express.js w/ Jade Templating
- AJAX
- jQuery
- EMC ECS S3 API
- Twitter API
- Amazon SES API
- Constant Contact API
- and more...

The Photo Booth has a 2 station system to it. 

The first station is used for registration where users can enter their information to put their names in the queue, like a kiosk. There can be multiple kiosks to load people up in a queue after registration.

The second station is the actual photobooth itself. A person will enter the booth, choose their name from the list, and begin taking photos. After photos have been taken, a tweet is sent as well as an email.

There is an additional Admin dashboard where you have the ability to delete and edit objects as well as see some basic statistics.

## Installation
There are a few methods to running this Photo Booth. It can run locally on your laptop for development purposes, on a server, or on a PaaS of your choice. The `manifest.yml` is included for Cloud Foundry deployments.

1. For Local Desktop or Server configurations
    1. Copy this repo
    2. create a mongoDB instance called `emcphotobooth` or change the instance name and location in `/model/db.js`.
    3. create a new file called `creds.json` and store the following credentails for environment variables (mongoLab was used for our production instance):
        ```{ 
            "S3accessKeyId": "something...",
            "S3secretAccessKey": "something...",
            "S3endpoint": "",
            "S3url" : "something...",
            "SESaccessKeyId" : "something...",
            "SESsecretAccessKey" : "something...",
            "Twitter_consumer_key" : "something...",
            "Twitter_consumer_secret" : "something...",
            "Twitter_access_token" : "something...",
            "Twitter_access_token_secret" : "something...",
            "ConstantContactKey" : "something...",
            "ConstantContactToken" : "something...",
            "ConstantContactList" : "something...",
            "MongoLab" : "something..."
        }```
    4. Run `npm install` within the photobooth directory to install all the neccesary modules from `package.json`
    5. Start the application with `npm start`
    6. Start Google Chrome with the appended flag `--use-fake-ui-for-media-stream`. This allows Chrome to access the Webcam & Audio without requiring the user to click Allow.
        - Mac: `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --use-fake-ui-for-media-stream`
        - Windows: `start chrome --use-fake-ui-for-media-stream`
        - GNU/Linux: `google-chrome --use-fake-ui-for-media-stream` 
    7. For the Registration Kiosk, navigate to `http://127.0.0.1:3000` (substitute 127 for your IP/DNS)
    8. For the Photobooth, navigate to `http://127.0.0.1:3000/photos/list` (substitute 127 for your IP/DNS)

2. For Cloud Foundry deployments
    1. edit the `manifest.yml` file to suit your needs
    2. Change the `/model/db.js` file to use the MongoLab Sandbox provided by Cloud Foundry or edit it for MongoLab production and point to a public instance. It is currently tailored for MongoLab production.

## Usage Instructions
The Kiosks for registration will use a different process than the Photo Booth.

Kiosks (preference to laptop/Chromebook/iPad with BT Keyboard):
After the application is running go to the root of the application in Chrome using the `--use-fake-ui-for-media-stream` flag (ie `http://127.0.0.1:3000`). Click on the big green button.
![root page](https://s3.amazonaws.com/kennyonetime/emc_photobooth_01.png)

The page is automatically directed to `http://ipordns/photos/new?` Fill out the information and click on 'Put Me In The Queue'. [jQuery Validate](https://github.com/jzaefferer/jquery-validation) is used to make sure any fields marked with a red `*` is filled out. Once submitted, a POST request is done to add a new record/document into MongoDB. If the `newsletter` attribute is checked, the application will use the ConstantContact API to automatically add the user to a ConstantContact List using the information that was filled out. A `uniqueurl` is generated for every registration using `fname` + `lname` + `uniqueIterator`. This allows a person to go through the Photo Booth multiple times.
![new registration](https://s3.amazonaws.com/kennyonetime/emc_photobooth_02.png)

The `thanks.jade` file is then rendered. Using Javascript it waits 2.5 seconds and then goes back to the root/start page.
![thanks](https://s3.amazonaws.com/kennyonetime/emc_photobooth_03.png)

Photo Booth (sized for ELO Touch 2440L):
The Photo Booth address is `http://ipordns/photos/list`. This page lists everyone has registered but has NOT taken any pictures. This is determined by grabbing all MongoDB documents and searching for records that have an empty array where the pictures would be. This page uses jQuery to automatically refresh itself every 30 seconds. By the time someone registers and gets to the booth, it will have been enough time to reload. If they can't find their name, then there is a refresh button in the bottom corner. Would like to make this real-time by using Socket.io but didn't have the cycles to implement it. The touch screen interface will make it easy for a user to scroll the list and find their name.
![list names](https://s3.amazonaws.com/kennyonetime/emc_photobooth_04.png)

The next displayed page is `http://ipordns/photos/takepic/:uniqueurl`. jQuery will present a page that allows a user to go back if the wrong name was selected.
![take pic](https://s3.amazonaws.com/kennyonetime/emc_photobooth_05.png)

[webcam.js](https://github.com/jhuckaby/webcamjs) will invoke the webcam. Using jQuery, a 5 second countdown timer is shown and once a photo is taken it is displayed on the page. An AJAX POST call is done to `/addpic/:uniqueurl` which will add the photo to EMC's ECS via S3 API. This non-blocking process allows the image the upload in the background without effecting the application and continue taking more pictures. This step is repeated 4 times.
![taking pictures](https://s3.amazonaws.com/kennyonetime/emc_photobooth_06.png)

After the photos are displayed, jQuery will show a Thank You page. Multiple AJAX calls are made from this page. The first AJAX call will POST to `/sendmail/:uniqueurl` that creates a customized email using the content they checked during registration. [nodemailer](https://github.com/andris9/Nodemailer) is used to talk to Amazon's SES API to send an email to that user. Since this process is non-blocking, at almost the same time another AJAX POST is made to `/sendtweet/:uniqueurl` that uses [node-twitter](https://github.com/desmondmorris/node-twitter) to send a tweet using the @EMCCodeBot account if the user provided their Twitter handle during registration. This process will download the second photo taken in the Photo Booth and upload that picture to twitter. The link tweeted goes to the `show.jade` page to view all the pictures. After a few seconds, this page will redirect to `http:ipordns/photos/list` for the next person to choose their name.
![ajax calls](https://s3.amazonaws.com/kennyonetime/emc_photobooth_07.png)

Within the email and tweet, a link to `/photos/:uniqueurl` will be given for a user to be able to get to their pictures from any device. This is rendered with `show.jade`.
![show](https://s3.amazonaws.com/kennyonetime/emc_photobooth_08.png)

## Contribution
Create a fork of the project into your own reposity. Make all your necessary changes and create a pull request with a description on what was added or removed and details explaining the changes in lines of code. If approved, project owners will merge it.

Licensing
---------
Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Support
-------
Please file bugs and issues at the Github issues page. For more general discussions you can contact the EMC Code team at <a href="https://groups.google.com/forum/#!forum/emccode-users">Google Groups</a> or tagged with **EMC** on <a href="https://stackoverflow.com">Stackoverflow.com</a>. The code and documentation are released with no warranties or SLAs and are intended to be supported through a community driven process.