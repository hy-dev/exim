let chai = require('chai');
chai.should();
import Store from '../src/Store'

let dummyConfig = {
  path: 'test'
}

describe('Store', () => {
  describe('#constructor()', () =>  {
    it('should create store', () => {
      let config = Object.create(dummyConfig);
      let store = new Store(config);

      store.should.be.an.instanceOf(Object);
    });

    it('should initialize actions', () => {
      let action = 'action1';
      let config = Object.create(dummyConfig);
      config.actions = [action];

      let store = new Store(config);

      store.actions.should.be.instanceOf(Object);
      store.actions.should.include.keys(action);
    });

    it('should set initial values', () => {
      let initial = {testValue: 'abc'}
      let config = Object.create(dummyConfig);
      config.initial = initial;

      let store = new Store(config);

      store.initial.should.be.instanceOf(Object);
      store.initial.should.include.keys('testValue');
      store.initial.testValue.should.equal(initial.testValue);
    });
  });
});
