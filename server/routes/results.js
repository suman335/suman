/**
 * Created by amills001c on 12/16/15.
 */


var path = require('path');

//#config
var config = require('univ-config')(module, '*suman*', 'server/config/conf');

//#core
var express = require('express');
var router = express.Router();
var path = require('path');
var appRootPath = require('app-root-path');
var fs = require('fs');
var os = require('os');


//#helpers
var helpers = require('./helpers');
var sumanUtils = require('../../lib/suman-utils');
var findSumanServer = require('../../lib/find-suman-server');


router.post('/done/:run_id', function (req, res, next) {

    var data = body.data;

    try {
        var json = JSON.stringify(data.test);

        if (data.outputPath) {
            fs.appendFileSync(data.outputPath, json += ','); //we write synchronous because we have to ensure data doesn't get malformed in files on disk
            req.sumanData.success = {msg: 'appended data to ' + data.outputPath};
        }
        else{
            console.error(new Error('no outputPath property on data: ' + data).stack);
        }
        next();
    }
    catch (err) {
        next(err);
    }
});


router.post('/finalize', function (req, res, next) {

    var body = req.body;
    var rendered = body.rendered;
    var config = body.config;
    var timestamp = body.timestamp;

    try {
        var server = findSumanServer(config);

        //if (server.host != os.hostname()) {
        //    console.error('hostnames dont match');
        //    return next(new Error('hostnames dont match'));
        //}

        if (!server.outputDir) {
            console.error('no outputDir defined');
            return next(new Error('no outputDir defined'));
        }

        var outputDir = server.outputDir;
        var outputPath = path.resolve(outputDir + '/' + timestamp + '/temp.html');

        fs.writeFile(outputPath, rendered, (err) => {
            if (err) {
                console.log(err.stack);
                next(err);
            }
            else {
                res.json({success: 'wrote rendered .ejs file'});
            }
        });

    }
    catch (err) {
        next(err);
    }
});


router.post('/make/new', function (req, res, next) {

    var body = req.body;
    var config = body.config;
    var timestamp = body.timestamp;

    try {
        var server = findSumanServer(config);
        //if (server.host != os.hostname()) {
        //    console.error('hostnames dont match');
        //    return next(new Error('hostnames dont match - ' + os.hostname() + ' vs ' + server.host));
        //}

        if (!server.outputDir) {
            console.error('no outputDir defined');
            return next(new Error('no outputDir defined'));
        }

        var outputDir = server.outputDir;
        var outputPath = path.resolve(outputDir + '/' + timestamp);

        fs.mkdir(outputPath, function (err) {
            if (err) {
                console.error(err.stack);
                next(err);
            }
            else {
                console.log('created dir at ' + outputPath);
                req.sumanData.success = {msg: 'created dir at ' + outputPath};
                next();
            }

        });
    }
    catch (err) {
        next(err);
    }
});


router.get('/latest', function (req, res, next) {

    var config = require(path.resolve(appRootPath + '/' + 'suman.conf.js')); //TODO need to fix this path - if this is global suman then this won't work

    //note: see: https://www.dropbox.com/s/mv3mply6k2052du/Screenshot%202016-02-04%2021.37.58.png?dl=0

    var server = findSumanServer(config);

    if (!server.outputDir) {
        console.error('no outputDir defined');
        return next(new Error('no outputDir defined'));
    }

    var folder = path.resolve(server.outputDir);
    var runId = helpers.getPathOfMostRecentSubdir(folder);

    if (runId) {
        var file = path.resolve(folder, runId, 'temp.html');
        console.log('***:', file);
        res.sendFile(file);
    }
    else {
        next(new Error('no latest results exist'));
    }

});

router.get('/:run_id/:test_num', function (req, res, next) {

    var config = require(path.resolve(appRootPath + '/' + 'suman.conf.js'));

    var server = findSumanServer(config);

    if (!server.outputDir) {
        console.error('no outputDir defined');
        return next(new Error('no outputDir defined'));
    }

    var folder = path.resolve(server.outputDir);

    var runId = req.params.run_id;
    var testNum = req.params.test_num;

    res.sendFile(path.resolve(folder, runId, testNum), {
        maxAge: '58h'
    });

});

router.get('/:run_id', function (req, res, next) {

    var config = require(path.resolve(appRootPath + '/' + 'suman.conf.js'));

    var server = findSumanServer(config);

    if (!server.outputDir) {
        console.error('no outputDir defined');
        return next(new Error('no outputDir defined'));
    }

    var folder = path.resolve(server.outputDir);

    var runId = req.params.run_id;

    var file = path.resolve(folder, runId, 'temp.html');
    console.log(file);
    res.sendFile(file);

});


//router.get('/:run_id/:test_num',function(req,res,next){
//
//    var runId = req.params.run_id;
//    var testNum = req.params.test_num;
//
//    res.sendFile(path.resolve('results',runId,testNum));
//
//});


module.exports = router;