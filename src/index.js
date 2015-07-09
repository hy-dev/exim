import {Action, Actions} from './Actions';
import Store from './Store';
import helpers from './helpers';
let createView, Router, DOM;
if (window.React && window.ReactRouter) {
  let DOMHelpers = require('./DOMHelpers');
  createView = DOMHelpers.createView;
  DOM = DOMHelpers.DOM;
  Router = DOMHelpers.Router;
}

const Exim = {Action, Actions, Store, Router, DOM, helpers, createView};

Exim.createAction = function (args) {
  return new Action(args);
};

Exim.createActions = function (args) {
  return new Actions(args);
};

Exim.createStore = function (args) {
  return new Store(args);
};

export default Exim;
