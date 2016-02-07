var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var SCOPES = ['https://www.googleapis.com/auth/drive'];
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
    authorize(JSON.parse(content), onAPIReady);
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



var service = google.drive('v2');

var rootDirName = 'apiTest';

var templateObj = {};
var contractObj = {};

var templateDirName = 'template';
var contractDirName = 'contract';

var templateChildrens = [];
var contractChildrens = [];

var tmpFile = {};


// works - file listing with query
function getAllFiles(auth, query, callback) {
    service.files.list({
        auth: auth,
        q: query
    }, function (err, response) {
        var resp = {error: null, success: null};
        if (err) {
            console.log('The API returned an error: ' + err);
            resp.error = err;
        } else {
            var items = response.items;
            console.log(items.length + ' files found.');
            resp.success = items;

            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                
                if (item.title === templateDirName) {
                    templateObj = item;
                    console.log("Template Folder found!");
                }
                
                if (item.title === contractDirName) {
                    contractObj = item;
                    console.log("Contract Folder found!");
                }

                if (contractObj.id != undefined && templateObj.id != undefined) {
                    break;
                }
            }
        }
        callback(resp);
    });
}

function getTemplateChildrens(auth, parentId) {
    getChildrens(auth, parentId, function (res) {
        if (res.error != null) { 
        
        } else { 
            templateChildrens = res.success;
            console.log('template childrens found.');
        }
    });
}

function getContractChildrens(auth, parentId) {
    getChildrens(auth, parentId, function (res) {
        if (res.error != null) { 
        
        } else {
            contractChildrens = res.success;
            console.log('contract childrens found.');
        }
    });
}

// works - get children by parent id
function getChildrens(auth, parentId, callback) {
    service.children.list({
        auth: auth,
        folderId: parentId
    }, function (err, response) {
        var resp = {error: null, success: null};
        if (err) {
            console.log('The API returned an error: ' + err);
            resp.error = err;
        } else {
            console.log(items.length + ' children found.');
            resp.success = response;
        }
        callback(resp);
    });
}

// works - can't set metadata
function addFileInFolder(auth, parentId, folderName) {
    var body = { title: folderName, mimeTyle: 'application/vnd.google-apps.folder', parents: [{ id: parentId }] };

    service.files.insert({
        auth: auth,
        resource: body
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        } else { 
            console.log('file created.');
        }
    });
}

// todo
function updateFolderMetadata(auth, fileId) {
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

// works - copy file from destination with specific filename
function copyFile(auth, sourceFileId, targetFileId, fileName) {
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
                    console.log("File copied!");
                }
            });
        }
    });
}

// works - get file object - returns only basic data
function getChildrenByParentAndId(auth, parentId, childId, callback) {
    service.children.get({
        auth: auth,
        folderId: parentId,
        childId: childId
    }, function (err, response) {
        var resp = { error: null, success: null };
        if (err) {
            console.log('The API returned an error: ' + err);
            resp.error = err;
        } else {
            resp.success = response;
            console.log("Children by id found!");
        }
        
        callback(resp);
    });
}

// works - get file object by id
function getFileById(auth, fileId, callback) {
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
            console.log("File by id found!");
        }
        
        callback(resp);
    });
}

function onAPIReady(auth) {

    var query = "mimeType='application/vnd.google-apps.folder'";
    
    query = "";

    getAllFiles(auth, query, function (res) {
        if (res.error != null) { 
        
        } else {
            getTemplateChildrens(auth, templateObj.id);
            getContractChildrens(auth, templateObj.id);
        }
    });


    //addFileInFolder(auth, 0);

    //copyFile(auth, "", "", "test123");
}