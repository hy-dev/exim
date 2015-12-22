'use strict';

let chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(sinonChai);
chai.should();

import Store from '../src/Store'
import { Action, Actions } from '../src/Actions'

let dummyConfig = {
  path: 'test'
}

describe('Action', () => {
  describe('#constructor()', () =>  {
    it('creates an action', () => {
      let action = new Action({});

      action.should.be.an.instanceOf(Object);
    });

    it('initializes the name', () => {
      let name = 'somename', params = {name}
      let action = new Action(params);

      action.name.should.equal(name);
    });

    it('initializes a single store', () => {
      let store = 'single store', params = {store}
      let action = new Action(params);

      action.stores.should.deep.equal([store]);
    });

    it('initializes multiple stores', () => {
      let stores = ['store1', 'store2'], params = {stores}
      let action = new Action(params);

      action.stores.should.deep.equal(stores);
    });
  });
});
