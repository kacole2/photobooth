photobooth
======================
Photobooth is exactly what you think it is, it's an application to run a photobooth! This application was/is/will be used at EMC World 2015 in the EMC {code} booth. 

## Description
The photobooth uses the following technologies:
- MongoDB
- Node.js
- Express.js w/ Jade Templating
- AJAX
- jQuery
- S3 (can be AWS or ECS)
- Twitter API
- SMTP
- and more...

The photobooth has a 2 Station system to it. The first station is used for registration where users can enter their information to put their names in the queue. The second station is the actual photobooth itself where a user chooses their name to begin taking photos. There is an additional Admin dashboard where you have the ability to delete and edit objects as well as see some basic statistics

## Installation
There are a few methods to running this photobooth. You can run it locally on your laptop for development purposes, you can run it on a server, or run it on a PaaS of your choice. The `manifest.yml` is included for Cloud Foundry deployments

1. For Local Desktop or Server configurations
    1. Copy this repo
    2. create a mongoDB instance called `emcphotobooth` or change the instance name and location in `/model/db.js`.
    3. create a new file called `creds.json` and store the following credentails for environment variables:
        ```{ 
            "S3accessKeyId": "something...",
            "S3secretAccessKey": "something...",
            "S3endpoint": "",
            "S3url" : "something...",
            "smtpHost" : "something...",
            "smtpUN" : "something...",
            "smtpPW" : "something..."
        }```
    4. Run `npm install` within the photobooth directory to install all the neccesary modules from `package.json`
    5. Start the application with `npm start`
    6. Start Google Chrome with the appended flag `--use-fake-ui-for-media-stream`. This allows Chrome to access the Webcam & Audio without requiring the user to click Allow.
        - Mac: `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --use-fake-ui-for-media-stream`
        - Windows: `start chrome --use-fake-ui-for-media-stream`
        - GNU/Linux: `google-chrome --use-fake-ui-for-media-stream` 
    7. For the Registration Kiosk, navigate to `http://127.0.0.1:3000` (substitute 127 for your IP/DNS)
    8. For the Photobooth, navigate to `http://127.0.0.1:3000/infophotos/list` (substitute 127 for your IP/DNS)

2. For Cloud Foundry deployments

## Usage Instructions
Will fill out


## Contribution
Create a fork of the project into your own reposity. Make all your necessary changes and create a pull request with a description on what was added or removed and details explaining the changes in lines of code. If approved, project owners will merge it.

Licensing
---------
Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at <http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Support
-------
Please file bugs and issues at the Github issues page. For more general discussions you can contact the EMC Code team at <a href="https://groups.google.com/forum/#!forum/emccode-users">Google Groups</a> or tagged with **EMC** on <a href="https://stackoverflow.com">Stackoverflow.com</a>. The code and documentation are released with no warranties or SLAs and are intended to be supported through a community driven process.