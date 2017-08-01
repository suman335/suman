'use strict';

//typescript
import {ITestSuite} from "../../dts/test-suite";
import {ISuman} from "../../dts/suman";
import {TTestSuiteMaker} from "../../dts/test-suite-maker";
import {IDescribeFn, IDescribeOpts, TDescribeHook} from "../../dts/describe";

//polyfills
const process = require('suman-browser-polyfills/modules/process');
const global = require('suman-browser-polyfills/modules/global');

//core
import fs = require('fs');
import path = require('path');
import util = require('util');
import assert = require('assert');
import EE = require('events');
import cp = require('child_process');
import domain = require('domain');

//npm
const fnArgs = require('function-arguments');
const pragmatik = require('pragmatik');
const _ = require('underscore');
import async = require('async');
import * as chalk from 'chalk';
import su from 'suman-utils';
import {VamootProxy} from 'vamoot';

//project
const _suman = global.__suman = (global.__suman || {});
const rules = require('../helpers/handle-varargs');
import {constants} from '../../config/suman-constants';
import acquireIoCDeps from '../acquire-dependencies/acquire-ioc-deps';
import {IInjectionDeps} from "../../dts/injection";
import {IPseudoError} from "../../dts/global";
const handleSetupComplete = require('../handle-setup-complete');
import {makeBlockInjector} from '../injection/make-block-injector';
import {handleInjections} from '../test-suite-helpers/handle-injections';
import parseArgs from '../helpers/parse-pragmatik-args';
import evalOptions from '../helpers/eval-options';

///////////////////////////////////////////////////////////////////////

function handleBadOptions(opts: IDescribeOpts) {
  // TODO
  return;
}

///////////////////////////////////////////////////////////////////////

export const makeDescribe = function (suman: ISuman, gracefulExit: Function, TestSuiteMaker: TTestSuiteMaker,
                                      zuite: ITestSuite, notifyParentThatChildIsComplete: Function): IDescribeFn {

  const blockInjector = makeBlockInjector(suman);
  const allDescribeBlocks = suman.allDescribeBlocks;

  return function ($$desc: string, $opts: IDescribeOpts) {

    handleSetupComplete(zuite, 'describe');

    const args = pragmatik.parse(arguments, rules.blockSignature, {
      preParsed: su.isObject($opts) ? $opts.__preParsed : null
    });

    const vetted = parseArgs(args);
    const [desc, opts, cb] = vetted.args;
    const arrayDeps = vetted.arrayDeps;

    handleBadOptions(opts);

    if (arrayDeps.length > 0) {
      evalOptions(arrayDeps, opts);
    }

    const isGenerator = su.isGeneratorFn(cb);
    const isAsync = su.isAsyncFn(cb);

    if (isGenerator || isAsync) { //TODO: need to check for generators or async/await as well
      const msg = constants.ERROR_MESSAGES.INVALID_FUNCTION_TYPE_USAGE;
      console.log('\n\n' + msg + '\n\n');
      console.error(new Error(' => Suman usage error => invalid arrow/generator function usage.').stack);
      process.exit(constants.EXIT_CODES.INVALID_ARROW_FUNCTION_USAGE);
      return;
    }

    if (zuite.parallel && opts.parallel === false) {
      console.error('\n');
      _suman.logWarning('warning => parent block ("' + zuite.desc + '") is parallel, ' +
        'so child block ("' + desc + '") will be run in parallel with other sibling blocks.');
      _suman.logWarning('\nTo see more info on this, visit: sumanjs.org.\n');
    }

    if (zuite.skipped) {
      let msg = ' => Suman implementation warning => Child suite entered when parent was skipped.';
      console.error(msg);
      console.error(' => Please open an issue with the following stacktrace:', '\n');
      console.error(new Error(msg).stack);
    }

    if (opts.skip || zuite.skipped || (!opts.only && suman.describeOnlyIsTriggered)) {
      suman.numBlocksSkipped++;
      return;
    }

    // note: zuite is the parent of suite; aka, suite is the child of zuite
    const suite = TestSuiteMaker({desc, title: desc, opts});

    // if parent is skipped, child is skipped,
    suite.skipped = opts.skip || zuite.skipped;

    if (!suite.only && suman.describeOnlyIsTriggered) {
      suite.skipped = suite.skippedDueToDescribeOnly = true;
    }

    Object.defineProperty(suite, 'parent', {value: zuite, writable: false});
    zuite.getChildren().push(suite);
    allDescribeBlocks.push(suite);


    const deps = fnArgs(cb);
    const suiteProto: Object = Object.getPrototypeOf(suite);

    suiteProto._run = function run(val: any, callback: Function) {

      if (zuite.skipped || zuite.skippedDueToDescribeOnly) {
        _suman.logWarning(' => Now entering dubious routine in Suman lib.');
        if (zuite.parent) {
          notifyParentThatChildIsComplete(zuite.parent, zuite, callback);
        }
        return;
      }

      const d = domain.create();

      d.once('error', function (err: IPseudoError) {
        console.error('\n');
        _suman.logError('Error executing test block => \n', err.stack || err);
        err.sumanExitCode = constants.EXIT_CODES.ERROR_IN_CHILD_SUITE;
        gracefulExit(err);
      });

      d.run(function () {

        // note: *very important* => each describe block needs to be invoked in series, one by one,
        // so that we bind skip and only to the right suite

        suite.getResumeValue = function (): any {
          return val;
        };

        suite.__bindExtras();

        Object.defineProperty(suite, 'shared', {
          value: zuite.shared.clone(),
          //Object.assign({}, zuite.shared)
          writable: false
        });


        acquireIoCDeps(deps, suite, function (err: Error, deps: IInjectionDeps) {

          if (err) {
            console.log('\n', err.stack || err, '\n');
            process.exit(constants.EXIT_CODES.ERROR_ACQUIRING_IOC_DEPS);
          }
          else {

            process.nextTick(function () {

              let $deps;

              try {
                $deps = blockInjector(suite, zuite, deps);
              }
              catch (err) {
                console.error(err.stack || err);
                return gracefulExit(err);
              }

              suite.fatal = function (err: IPseudoError) {
                err = err || new Error(' => suite.fatal() was called by the developer => fatal unspecified error.');
                console.log(err.stack || err);
                err.sumanExitCode = constants.EXIT_CODES.ERROR_PASSED_AS_FIRST_ARG_TO_DELAY_FUNCTION;
                gracefulExit(err);
              };

              const delayOptionElected = !!opts.delay;

              if (!delayOptionElected) {

                suiteProto.__resume = function () {
                  _suman.logWarning('usage warning => suite.resume() has become a no-op since delay option is falsy.');
                };

                // Object.freeze(suite);
                // Object.freeze(suiteProto);
                cb.apply(suite, $deps);

                handleInjections(suite, function (err: Error) {

                  if (err) {
                    console.error(err.stack || err);
                    gracefulExit(err);
                  }
                  else {
                    d.exit();
                    suiteProto.isSetupComplete = true;
                    process.nextTick(function () {
                      zuite.__bindExtras();  //bind extras back to parent test
                      suite.__invokeChildren(null, callback);
                    });
                  }
                });

              }

              else {
                suiteProto.isDelayed = true;

                const str = cb.toString();
                //TODO this will not work when delay is simply commented out

                if (!su.checkForValInStr(str, /resume/g, 0)) {

                  process.nextTick(function () {
                    console.error(new Error(' => Suman usage error => delay option was elected, so suite.resume() ' +
                      'method needs to be called to continue,' +
                      ' but the resume method was never referenced in the needed location, so your test cases would ' +
                      'never be invoked before timing out => \n\n' + str).stack);
                    process.exit(constants.EXIT_CODES.DELAY_NOT_REFERENCED);
                  });

                  return; //hard, ugly and visible
                }

                const to = setTimeout(function () {
                  console.error('\n\n => Suman fatal error => delay function was not called within alloted time.');
                  process.exit(constants.EXIT_CODES.DELAY_FUNCTION_TIMED_OUT);
                }, 11000);

                let callable = true;

                suiteProto.__resume = function (val: any) {
                  if (callable) {
                    callable = false;
                    clearTimeout(to);
                    d.exit();
                    //need to make sure delay is called asynchronously, but this should take care of it
                    process.nextTick(function () {
                      suiteProto.isSetupComplete = true; // keep this, needs to be called asynchronously
                      zuite.__bindExtras();  //bind extras back to parent test
                      suite.__invokeChildren(val, callback); // pass callback
                    });
                  }
                  else {
                    let w = ' => Suman usage warning => suite.resume() was called more than once.';
                    console.error(w);
                    _suman._writeTestError(w)
                  }

                };

                // Object.freeze(suite);
                // Object.freeze(suiteProto);
                cb.apply(suite, $deps);
              }

            });
          }
        });

      });
    };
  };

};
