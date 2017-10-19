#!/usr/bin/env node
'use strict';

const suman = require('suman');
const {Test} = suman.init(module, {
  forceParallel: true,  // parallel, not parallel-max
  __expectedExitCode: 56
});

///////////////////////////////////////////////////////////////////////

let count = 0;

Test.create(function (assert, describe, before, beforeEach, after, afterEach, it, util, domain, beforeAll) {

  beforeAll(h => {
    console.log('before all hook');
  });

  // before.cb(['fatal:false', h => {
  //
  //   const d = domain.create();
  //   d.xxx = 'foo';
  //
  //   const d2 = process.domain;
  //   d2.yyy = 'bar';
  //
  //   debugger;
  //
  //   // throw 'samsam';
  //   // process.on('uncaughtException', function (e) {
  //   //   console.log('ue => ', e);
  //   // });
  //
  //   d.run(function () {
  //
  //     throw new Error('barf');
  //
  //   });
  //
  // }]);

  it.cb('passing', t => {
    t.done();
  });

  it.cb('failing', t => {
    t.done('this test failed');
  });

  afterEach.cb(h => {

    if (h.test.desc === 'passing') {
      h.assert.equal(h.test.result, 'passed');
    }
    else {
      h.assert.equal(h.test.result, 'failed');
    }

    h.ctn();
  });

  describe('here we go', function () {

    before(h => {

    });

    it.cb('failing', t => {
      t.done('buggers')
    });

    afterEach.cb(h => {

      h.ctn();
    });

    afterEach.cb(h => {
      if (h.test.desc === 'passing') {
        h.assert.equal(h.test.result, 'passed');
      }
      else {
        h.assert.equal(h.test.result, 'failed');
      }
      h.ctn();
    });

    describe('here we go', function () {

      before(h => {

      });

      it('passing', t => {

      });

      after(h => {

      });

      describe('here we go', function () {

        before(h => {

        });

        it('failing', t => {
          return Promise.reject('zoomba');
        });

        after.cb(h => {
          h.ctn();
        });

        after(h => {

        });

        describe('here we go', function () {

          before(h => {

          });

          it('passing', t => {

          });

          it.skip('xxx', t => {
            // skipped tests should not reach beforeEach/afterEach hooks
          });

          it('xxx'); // stubbed tests should not reach beforeEach/afterEach hooks

          after.cb(h => {
            h.ctn();
          });

          after(h => {

          });

        });

      });

      describe('here we go', function () {

        before(h => {

        });

        after.cb(h => {
          h.ctn();
        });

        it('passing', t => {

        });

        after(h => {

        });

      });

    });

    describe('here we go', function () {

      before(h => {

      });

      after.cb(h => {

        h.ctn();
      });

      it('passing', t => {

      });

      it.cb('passing', t => {

        t.done();
      });

      after(h => {

      });

    });

  });

});
