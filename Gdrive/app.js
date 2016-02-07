var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/drive.file', 
    'https://www.googleapis.com/auth/drive.apps.readonly',
    'https://www.googleapis.com/auth/drive.metadata', 
    'https://www.googleapis.com/auth/drive.metadata.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';

TOKEN_DIR = 'C:/.credentials/';

var TOKEN_PATH = TOKEN_DIR + 'drive-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Drive API.
    authorize(JSON.parse(content), whenReady);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */

var rootDirName = 'apiTest';


var templateObj = {};
var contractObj = {};

var templateDirName = 'template';
var contractDirName = 'contract';

var tmpFile = {};

function listFiles(auth) {
    var service = google.drive('v2');
    service.files.list({
        auth: auth,
        //q: "mimeType='application/vnd.google-apps.folder'"
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var items = response.items;
        if (items.length == 0) {
            console.log('No files found.');
        } else {
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                
                if (item.title === templateDirName) {
                    templateObj = item;
                }
                
                if (item.title === contractDirName) {
                    contractObj = item;
                }

                if (item.title == 'excel1') {
                    tmpFile = item;
                }
                
                
                if (contractObj.id != undefined && templateObj.id != undefined && tmpFile.id != undefined) {
                    
                    copyFile(auth, tmpFile.id, contractObj.id, "test123");

                    break;
                }
            }

            //addFileInFolder(auth, contractObj.id, 'test-mite');
        }
    });
}

// works - can't set metadata
function addFileInFolder(auth, parentId, folderName) {
    var body = { title: folderName, mimeTyle: 'application/vnd.google-apps.folder', parents: [{ id: parentId }] };

    var service = google.drive('v2');
    service.files.insert({
        auth: auth,
        resource: body
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }

    });
}

// todo
function updateFolderMetadata(auth, fileId) {
    var service = google.drive('v2');
    service.files.get({
        auth: auth,
        fileId: fileId
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        response.mimeType = 'application/vnd.google-apps.folder';

        service.files.update({
            auth: auth,
            fileId: fileId,
            resource: response
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
        });

    });
}

// works
function copyFile(auth, sourceFileId, targetFileId, fileName) {
    var service = google.drive('v2');
    getFileById(auth, sourceFileId, function (response) {
        if (response.error != null) { 
        
        } else {
            var newFile = response.success;
            newFile.parents = [{ id: targetFileId }];
            newFile.title = fileName;
            service.files.copy({
                auth: auth,
                fileId: sourceFileId,
                resource: newFile
            }, function (err, response) {
                if (err) {
                    console.log('The API returned an error: ' + err);
                } else {
                
                
                }
            });
        }
    });
}

// works
function getFileById(auth, fileId, callback) {
    var service = google.drive('v2');
    service.files.get({
        auth: auth,
        fileId: fileId
    }, function (err, response) {
        var resp = { error: null, success: null };
        if (err) {
            console.log('The API returned an error: ' + err);
            resp.error = err;
        } else {
            resp.success = response;
        }
        
        callback(resp);
    });
}

// todo
function listFilesInFolder(auth, folderId) {
    var service = google.drive('v2');
    service.files.get({
        auth: auth,
        fileId: "0BwinOV1C0lyNa2IydUEtb2lQeWc"
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var items = response.items;

    });
}

function whenReady(auth) {
    listFiles(auth);

    //addFileInFolder(auth, 0);

    //copyFile(auth, "", "", "test123");
}