'use strict';

//dts
import {IBeforeFn, IBeforeOpts} from "suman-types/dts/before";
import {IAllOpts, ITestSuite, IAcceptableOptions} from "suman-types/dts/test-suite";
import {IGlobalSumanObj} from "suman-types/dts/global";
import {ISuman, Suman} from "../suman";

//polyfills
const process = require('suman-browser-polyfills/modules/process');
const global = require('suman-browser-polyfills/modules/global');

//core
import cp = require('child_process');
import fs = require('fs');
import path = require('path');
import util = require('util');
import assert = require('assert');
import EE = require('events');

//npm
const pragmatik = require('pragmatik');
import async = require('async');
import * as chalk from 'chalk';
import su from 'suman-utils';

//project
const _suman: IGlobalSumanObj = global.__suman = (global.__suman || {});
const rules = require('../helpers/handle-varargs');
const {constants} = require('../../config/suman-constants');
const {handleSetupComplete} = require('../handle-setup-complete');
import evalOptions from '../helpers/eval-options';
import {parseArgs} from '../helpers/parse-pragmatik-args';

//////////////////////////////////////////////////////////////////////////////

const typeName = 'before';
const acceptableOptions = <IAcceptableOptions> {
  plan: true,
  throws: true,
  fatal: true,
  cb: true,
  timeout: true,
  skip: true,
  events: true,
  successEvents: true,
  errorEvents: true,
  __preParsed: true
};

const handleBadOptions = function (opts: IBeforeOpts) {

  Object.keys(opts).forEach(function (k) {
    if (!acceptableOptions[k]) {
      const url = `${constants.SUMAN_TYPES_ROOT_URL}/${typeName}.d.ts`;
      throw new Error(`'${k}' is not a valid option property for a ${typeName} hook. See: ${url}`);
    }
  });

  if (opts.plan !== undefined && !Number.isInteger(opts.plan)) {
    _suman.logError(new Error('Suman usage error => "plan" option is not an integer.').stack);
    process.exit(constants.EXIT_CODES.OPTS_PLAN_NOT_AN_INTEGER);
  }
};

///////////////////////////////////////////////////////////////////////////////

export const makeBefore = function (suman: ISuman): IBeforeFn {

  return function ($$desc: string, $opts: IBeforeOpts) {

    const zuite = suman.ctx;
    handleSetupComplete(zuite, 'before');

    const args = pragmatik.parse(arguments, rules.hookSignature, {
      preParsed: su.isObject($opts) ? $opts.__preParsed : null
    });

    const vetted = parseArgs(args);
    const [desc, opts, fn] = vetted.args;
    const arrayDeps = vetted.arrayDeps;
    handleBadOptions(opts);

    if (arrayDeps.length > 0) {
      evalOptions(arrayDeps, opts);
    }

    if (opts.skip) {
      suman.numHooksSkipped++;
    }
    else if (!fn) {
      suman.numHooksStubbed++;
    }
    else {

      zuite.getBefores().push({
        ctx: zuite,
        desc: desc || fn.name || '(unknown before-hook name)',
        timeout: opts.timeout || 11000,
        cb: opts.cb || false,
        throws: opts.throws,
        planCountExpected: opts.plan,
        fatal: !(opts.fatal === false),
        fn: fn,
        type: 'before/setup',
        warningErr: new Error('SUMAN_TEMP_WARNING_ERROR')
      });
    }

    return zuite;

  };

};
