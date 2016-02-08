var fs = require('fs');
var request = require('request');
var restify = require('restify');
var https = require('https');
var http = require('http');
var server = restify.createServer();

restify.CORS.ALLOW_HEADERS.push('authorization');

server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(restify.acceptParser(server.acceptable));
server.use(restify.jsonp());
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.queryParser());

// Add headers
server.use(function (req, res, next) {
    SetCORSHeaders(res);
    next();
});

function SetCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    //res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Response-Time, X-Requested-With, X-PINGOTHER, X-CSRF-Token,Authorization');
    
    //added
    res.setHeader('Access-Control-Expose-Headers', 'X-Api-Version, X-Request-Id, X-Response-Time');
    res.setHeader('Access-Control-Max-Age', '1000');
    //added
    
    res.setHeader('Access-Control-Allow-Credentials', true);
}

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

var Gauth = null;
var gotData = false;

var templateObj = {};
var contractObj = {};

var templateDirName = 'template';
var contractDirName = 'contract';

var templateChildrens = [];
var templatesData = false;
var contractChildrens = [];
var contractData = false;


// works - file listing with query
function getAllFiles(auth, query, callback) {
   service.files.list({
        auth: auth,
        q: query,
        maxResults: 1000
    }, function (err, response) {
        var resp = new ResultObject();
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
                    gotData = true;
                    break;
                }
            }
            
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (item.labels.trashed)
                    continue;
                if (item.parents.length > 0) {
                    var parentId = item.parents[0].id;

                    if (parentId == templateObj.id) {
                        templateChildrens.push(item);
                    }
                }
            }
        }
        callback(resp);
    });
}

function getTemplateChildrens(auth, parentId, callback) {
    getChildrens(auth, parentId, function (res) {
        if (res.error == null) {
            console.log('Got childrens.');
            templatesData = true;
            templateChildrens = res.success;
        }
        callback(res);
    });
}

function getContractChildrens(auth, parentId, callback) {
    getChildrens(auth, parentId, function (res) {
        if (res.error == null) {
            console.log('Got childrens.');
            contractData = true;
            contractChildrens = res.success;
        }
        callback(res);
    });
}

// works - get children by parent id
function getChildrens(auth, parentId, callback) {
    service.children.list({
        auth: auth,
        folderId: parentId
    }, function (err, response) {
        var resp = new ResultObject();
        if (err) {
            console.log('The API returned an error: ' + err);
            resp.error = err;
        } else {
            console.log(response.items.length + ' children found.');
            resp.success = response;
        }
        callback(resp);
    });
}

function getFilesFromFolder() { 

}

// works
function addFileInFolder(auth, parentId, folderName, callback) {
    var fullUrl = "https://www.googleapis.com/drive/v2/files";
    
    var headers = { 'Authorization': auth.credentials.token_type + ' ' + auth.credentials.access_token };
    
    var bodyData = {
        "title": folderName,
        "parents": [{ "id": parentId }],
        "mimeType": "application/vnd.google-apps.folder"
    };
    
    var post_options = {
        method: 'POST',
        url: fullUrl,
        json: bodyData,
        headers: headers
    };
    
    request(post_options, function (error, response, body) {
        var resp = new ResultObject();
        if (error != null) { 
            resp.error = error;
        } else {
            resp.success = body;
        }
        callback(body);
    });
}

// todo
function updateFolderMetadata(auth, fileId) {
    getFileById(auth, fileId, function (res) {
        if (res.error != null) { 
        
        } else { 
            var file = res.success;
            file.mimeType = 'application/vnd.google-apps.folder';
            
            service.files.update({
                auth: auth,
                fileId: file.id,
                resource: file
            }, function (err, response) {
                if (err) {
                    console.log('The API returned an error: ' + err);
                    return;
                } else { 
                
                }
            });
        }

    });
}

// works - copy file from destination with specific filename
function copyFile(auth, sourceFileId, targetFileId, fileName, callback) {
    getFileById(auth, sourceFileId, function (response) {
        if (response.error != null) {
            callback(response);
        } else {
            var newFile = response.success;
            newFile.parents = [{ id: targetFileId }];
            newFile.title = fileName;
            service.files.copy({
                auth: auth,
                fileId: sourceFileId,
                resource: newFile
            }, function (err, response) {
                var resp = new ResultObject();
                if (err) {
                    console.log('The API returned an error: ' + err);
                    resp.error = err;
                } else {
                    console.log("File copied!");
                    resp.success = response;
                }
                callback(resp);
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
        var resp = new ResultObject();
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
        var resp = new ResultObject();
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
    
    Gauth = auth;

    getAllFiles(auth, query, function (res) {
        if (res.error != null) { 
        
        } else {
            //getTemplateChildrens(auth, templateObj.id, function (result) { });
            getContractChildrens(auth, templateObj.id, function (result) { });
        }
    });

}

// Get Templates
server.get('/gdrive/gettemplates', function (req, res, next) {
    if (CheckForData()) {
        res.end(JSON.stringify(templateChildrens));
        return next();

    } else {
        getAllFiles(Gauth, "", function (result) {
            if (result.error != null) {
                res.statusCode = 409;
                res.end(result.error);
                return next();
            } else {
                res.end(JSON.stringify(templateChildrens));
                return next();
            }
        });
    }
});

// Get Files From Contract Folder
server.get('/gdrive/files/list', function (req, res, next) {
    if (CheckForData()) {
        if (contractData == false) {
            getContractChildrens(Gauth, templateObj.id, function (result) {
                if (result.error != null) {
                    res.statusCode = 409;
                    res.end(result.error);
                    return next();
                } else {
                    res.end(JSON.stringify(result.success));
                    return next();
                }
            });
        } else {
            res.end(JSON.stringify(contractChildrens));
            return next();
        }
    } else {
        getAllFiles(Gauth, "", function (result) {
            if (result.error != null) {
                res.statusCode = 409;
                res.end(result.error);
                return next();
            } else {
                getContractChildrens(Gauth, templateObj.id, function (result) {
                    if (result.error != null) {
                        res.statusCode = 409;
                        res.end(result.error);
                        return next();
                    } else {
                        res.end(JSON.stringify(result.success));
                        return next();
                    }
                });
                return next();
            }
        });
    }
});

// Create Folder in Contract Folder
server.post('/gdrive/folder/create/:contractid', function (req, res, next) {
    if (CheckForData()) {
        var result = new ResultObject();
        if (IsNullOrEmpty(req.params.contractid) == false) {
            var contractid = req.params.contractid;
            
            var filename = "Contract" + contractid;

            addFileInFolder(Gauth, contractObj.id, filename, function (result) {
                if (result.error != null) {
                    res.statusCode = 409;
                    res.end("Error creating folder");
                    return next();
                } else {
                    res.end(JSON.stringify(result.success));
                    return next();
                }
            });
        }
        else {
            res.statusCode = 409;
            res.end("Missing parameters");
            return next();
        }
    } else {
        res.statusCode = 409;
        res.end("Couldn't load Google Drive Data");
        return next();
    }
});

// Copy File
server.post('/gdrive/files/copy/:templateid/:contractid/:filename', function (req, res, next) {
    if (CheckForData()) {
        var result = new ResultObject();
        if (IsNullOrEmpty(req.params.templateid) == false && IsNullOrEmpty(req.params.contractid) == false && IsNullOrEmpty(req.params.filename) == false) {
            var templateid = req.params.templateid;
            var contractid = req.params.contractid;
            var filename = req.params.filename;
            
            copyFile(Gauth, templateid, contractid, filename, function (result) {
                if (result.error != null) {
                    res.statusCode = 409;
                    res.end("Error copying file");
                    return next();
                } else {
                    res.end(JSON.stringify(result.success));
                    return next();
                }
            });
        }
        else {
            res.statusCode = 409;
            res.end("Missing parameters");
            return next();
        }
    } else {
        res.statusCode = 409;
        res.end("Couldn't load Google Drive Data");
        return next();
    }
});

// PDF
server.post('/gdrive/files/pdf/:documentid/:contractid', function (req, res, next) {
    return next();
});

server.listen(3000, function () {
    console.log('%s listening at %s', server.name, server.url);
});


function ResultObject() {
    this.success = null;
    this.error = null;
};

function CheckForData() {
    if (gotData)
        return true;
    else
        return false;
}

function IsNullOrEmpty(value) {
    if (!value || 0 === value.length) {
        return true;
    }
    if (value === "null") {
        return true;
    }
    return false;
}