/**
 * Created by amills001c on 4/17/16.
 */



const suman = require('../../lib');

const Test = suman.init(module, {});

Test.describe('2', {parallel:true}, function () {


    this.it('one', function (done) {

        setTimeout(function () {
            done();
        }, 2000);
    });

    this.it('two', function (done) {

        setTimeout(function () {
            done();
        }, 2000);
    });

    this.it('three', function (done) {

        setTimeout(function () {
            done();
        }, 2000);
    });


});