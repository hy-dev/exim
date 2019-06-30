'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

import Store from '../src/Store';

describe('Connect', () => {
  describe('#get', () =>  {
    it('tracks arrays changes', () => {
      const onHandler = sinon.spy();
      let changerCalled = false;
      let data;

      const config = {
         initial: { data: [] },
         actions: ['action'],
         action: {
            did: function(){ this.set('data', data); },
            on: onHandler
         }
      };
      const store = new Store(config);

      let component = store.connect('data');
      component.state = component.getInitialState();
      component.setState = () => { changerCalled = true; };
      component.componentWillMount();

      data = store.get('data');
      data.push('some-value');

      return store.actions.action().then(() => {
        store.get('data').length.should.equals(1);
        changerCalled.should.equals(true, 'setState should be called on array change');
      });
    });
  });
});
