// parcel does not support sane polyfilling so let's do this manually.
// https://github.com/parcel-bundler/parcel/issues/2262
import 'babel-polyfill';
import 'whatwg-fetch';


if (!Object.entries) {
  Object.entries = function( obj ){
    var ownProps = Object.keys( obj ),
        i = ownProps.length,
        resArray = new Array(i); // preallocate the Array
    while (i--)
      resArray[i] = [ownProps[i], obj[ownProps[i]]];

    return resArray;
  };
}


if (typeof Object.assign != 'function') {
    // Must be writable: true, enumerable: false, configurable: true
    Object.defineProperty(Object, "assign", {
      value: function assign(target, varArgs) { // .length of function is 2
        'use strict';
        if (target == null) { // TypeError if undefined or null
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var to = Object(target);

        for (var index = 1; index < arguments.length; index++) {
          var nextSource = arguments[index];

          if (nextSource != null) { // Skip over if undefined or null
            for (var nextKey in nextSource) {
              // Avoid bugs when hasOwnProperty is shadowed
              if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                to[nextKey] = nextSource[nextKey];
              }
            }
          }
        }
        return to;
      },
      writable: true,
      configurable: true
    });
  }


  if (!Element.prototype.toggleAttribute) {
    Element.prototype.toggleAttribute = function(name, force) {
      if(force !== void 0) force = !!force

      if (this.getAttribute(name) !== null) {
        if (force) return true;

        this.removeAttribute(name);
        return false;
      } else {
        if (force === false) return false;

        this.setAttribute(name, "");
        return true;
      }
    };
  }
