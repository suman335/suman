'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var process = require('suman-browser-polyfills/modules/process');
var global = require('suman-browser-polyfills/modules/global');
var util = require("util");
var path = require("path");
var cp = require("child_process");
var fs = require("fs");
var chalk = require("chalk");
var semver = require("semver");
var su = require("suman-utils");
var _suman = global.__suman = (global.__suman || {});
exports.makeHandleDifferentExecutables = function (projectRoot, sumanOpts, runnerObj) {
    var execFile = path.resolve(__dirname + '/../run-child.js');
    var istanbulExecPath = 'istanbul' || 'nyc' || _suman.istanbulExecPath || 'istanbul';
    var isExe = function (stats) {
        if (process.platform === 'win32') {
            return true;
        }
        var mode = stats.mode, gid = stats.gid, uid = stats.uid;
        var isGroup = gid ? process.getgid && gid === process.getgid() : true;
        var isUser = uid ? process.getuid && uid === process.getuid() : true;
        return Boolean((mode & parseInt('0001', 8)) ||
            ((mode & parseInt('0010', 8)) && isGroup) ||
            ((mode & parseInt('0100', 8)) && isUser));
    };
    return {
        handleRunDotShFile: function (sh, argz, file, shortFile, cpOptions, cb) {
            _suman.log.info(chalk.bgWhite.underline.black.bold('Suman has found a @run.sh file =>'), chalk.bold(sh));
            debugger;
            cpOptions.cwd = projectRoot;
            fs.chmod(sh, 511, function (err) {
                if (err) {
                    return cb(err);
                }
                var sourceMarkerDir = null;
                var targetMarkerDir = null;
                var start = String(path.resolve(file)).split(path.sep);
                var targetTestPath = String(path.resolve(file)).replace(/@src/g, '@target');
                if (!sumanOpts.allow_in_place && targetTestPath === file) {
                    throw new Error([
                        'target test path did not resolve to a different directory than the source path.',
                        'to override this warning, use the "--allow-in-place" flag, useful for using babel or ts-node, etc.'
                    ].join('\n'));
                }
                while (start.length > 0) {
                    var last = start.pop();
                    if (last === '@src') {
                        sourceMarkerDir = path.resolve(start.concat('@src').join(path.sep));
                        targetMarkerDir = path.resolve(start.concat('@target').join(path.sep));
                        break;
                    }
                }
                if (!sumanOpts.allow_in_place && !sourceMarkerDir) {
                    throw new Error('No source marker dir could be found given the test path => ' + file);
                }
                if (!sumanOpts.allow_in_place && !targetMarkerDir) {
                    throw new Error('No target marker dir could be found given the test path => ' + file);
                }
                var coverageDir = path.resolve(_suman.projectRoot + '/coverage/suman_by_timestamp/' + _suman.timestamp +
                    '/suman_by_process/' + String(shortFile).replace(/\//g, '-'));
                if (sumanOpts.coverage) {
                    _suman.log.warning(chalk.yellow('coverage option was set to true, but we are running your tests via @run.sh.'));
                    _suman.log.warning(chalk.yellow('so in this case, you will need to run your coverage call via @run.sh.'));
                    Object.assign(cpOptions.env, {
                        SUMAN_COVERAGE_DIR: coverageDir,
                        SUMAN_SRC_DIR: sourceMarkerDir,
                        SUMAN_TARGET_DIR: targetMarkerDir,
                        SUMAN_TARGET_TEST_PATH: targetTestPath
                    });
                }
                var n = cp.spawn('bash', [], cpOptions);
                n.stdin.end("\n" + sh + " " + argz.join(' ') + ";\n");
                cb(null, n);
            });
        },
        handleRegularFile: function (file, shortFile, argz, cpOptions, cb) {
            debugger;
            var extname = path.extname(file);
            fs.open(file, 'r', function (err, fd) {
                if (err) {
                    return cb(err);
                }
                var b = Buffer.alloc(184);
                fs.read(fd, b, 0, 184, 0, function (err, bytesRead, buf) {
                    if (err) {
                        return cb(err);
                    }
                    fs.stat(file, function (err, stats) {
                        if (err) {
                            return cb(err);
                        }
                        var isExecutable = isExe(stats);
                        var n, hasHasbang = String(buf).startsWith('#!'), firstLine = String(String(buf).split('\n')[0]).trim(), hashbangIsNode = hasHasbang && firstLine.match(/node$/);
                        if (!hasHasbang) {
                            _suman.log.warning();
                            _suman.log.warning('The following file is missing a hashbang.');
                            _suman.log.warning(file);
                            console.error();
                        }
                        if (extname === '.js') {
                            if (hasHasbang && !hashbangIsNode) {
                                _suman.log.warning('The following test file with a ".js" extension has a hashbang which is not "node".');
                                _suman.log.warning('Hashbang: ', chalk.bold.black(firstLine));
                                _suman.log.warning('File:', file);
                            }
                            if (sumanOpts.coverage) {
                                var coverageDir = path.resolve(_suman.projectRoot + '/coverage/suman_by_timestamp/' + _suman.timestamp +
                                    '/suman_by_process/' + String(shortFile).replace(/\//g, '-'));
                                var argzz_1 = ['cover', execFile, '--report=lcov', '--dir', coverageDir, '--'].concat(argz);
                                n = cp.spawn('bash', [], cpOptions);
                                process.nextTick(function () {
                                    n.stdin.write([istanbulExecPath].concat(argzz_1).join(' '));
                                    n.stdin.end('\n');
                                });
                            }
                            else if (hasHasbang && !hashbangIsNode) {
                                _suman.log.warning();
                                _suman.log.warning('The following file has a ".js" extension but appears to have a hashbang which is not the node executable:');
                                _suman.log.warning('Hashbang: ', firstLine);
                                _suman.log.warning('File:', file);
                                _suman.log.info();
                                _suman.log.info("perl bash python or ruby file? '" + chalk.magenta(file) + "'");
                                if (!isExecutable) {
                                    console.error('\n');
                                    _suman.log.warning("Warning: test file with the following path may not be executable:");
                                    _suman.log.warning(chalk.magenta(file));
                                    su.vgt(6) && _suman.log.warning('fs.Stats for this file were:\n', util.inspect(stats));
                                    console.error();
                                }
                                n = cp.spawn('bash', [], cpOptions);
                                n.usingHashbang = true;
                                process.nextTick(function () {
                                    n.stdin.write(file + " " + argz.join(' ') + ";");
                                    n.stdin.end("\n");
                                });
                            }
                            else {
                                var execArgz_1 = ['--expose-gc'];
                                if (sumanOpts.debug_child) {
                                    execArgz_1.push('--debug=' + (5303 + runnerObj.processId++));
                                    execArgz_1.push('--debug-brk');
                                }
                                if (sumanOpts.inspect_child) {
                                    if (semver.gt(process.version, '7.8.0')) {
                                        execArgz_1.push('--inspect-brk=' + (5303 + runnerObj.processId++));
                                    }
                                    else {
                                        execArgz_1.push('--inspect=' + (5303 + runnerObj.processId++));
                                        execArgz_1.push('--debug-brk');
                                    }
                                }
                                var execArgs = void 0;
                                if (execArgs = sumanOpts.exec_arg) {
                                    execArgs.forEach(function (v) {
                                        v && execArgz_1.push(String(v).trim());
                                    });
                                    String(execArgs).split(/S+/).forEach(function (n) {
                                        n && execArgz_1.push('--' + String(n).trim());
                                    });
                                }
                                var $execArgz = execArgz_1.filter(function (e, i) {
                                    if (execArgz_1.indexOf(e) !== i) {
                                        _suman.log.error(chalk.yellow(' => Warning you have duplicate items in your exec args => '), '\n' + util.inspect(execArgz_1), '\n');
                                    }
                                    return true;
                                });
                                argz.unshift(execFile);
                                var argzz_2 = $execArgz.concat(argz);
                                n = cp.spawn('bash', [], cpOptions);
                                process.nextTick(function () {
                                    n.stdin.write("node " + argzz_2.join(' ') + ";");
                                    n.stdin.end('\n');
                                });
                            }
                        }
                        else {
                            if (!isExecutable) {
                                console.error('\n');
                                _suman.log.warning("Warning: Test file with the following path may not be executable:");
                                _suman.log.warning(chalk.magenta(file));
                                su.vgt(6) && _suman.log.warning('fs.Stats for this file were:\n', util.inspect(stats));
                                console.error();
                            }
                            if (su.vgt(5)) {
                                _suman.log.info();
                                _suman.log.info("perl bash python or ruby file? '" + chalk.magenta(file) + "'");
                            }
                            n = cp.spawn('bash', [], cpOptions);
                            n.usingHashbang = true;
                            process.nextTick(function () {
                                n.stdin.write(file + " " + argz.join(' ') + ";");
                                n.stdin.end("\n");
                            });
                        }
                        cb(null, n);
                    });
                });
            });
        }
    };
};