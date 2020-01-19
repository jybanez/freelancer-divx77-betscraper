var Json = JSON;

(function(){
	var inserters = {
		before: function(context, element){
			if (element.parentNode) element.parentNode.insertBefore(context, element);
		},
	
		after: function(context, element){
			if (!element.parentNode) return;
			var next = element.nextSibling;
			(next) ? element.parentNode.insertBefore(context, next) : element.parentNode.appendChild(context);
		},
	
		bottom: function(context, element){
			element.appendChild(context);
		},
	
		top: function(context, element){
			var first = element.firstChild;
			(first) ? element.insertBefore(context, first) : element.appendChild(context);
		}
	};
	inserters.inside = inserters.bottom;
	
	Hash.each(inserters, function(inserter, where){
	
		where = where.capitalize();
	
		Element.implement('inject' + where, function(el){
			inserter(this, document.id(el, true));
			return this;
		});
	
		Element.implement('grab' + where, function(el){
			inserter(document.id(el, true), this);
			return this;
		});
	
	});
}());


/*
---
script: array-sortby.js
version: 1.3.0
description: Array.sortBy is a prototype function to sort arrays of objects by a given key.
license: MIT-style
download: http://mootools.net/forge/p/array_sortby
source: http://github.com/eneko/Array.sortBy

authors:
- Eneko Alonso: (http://github.com/eneko)
- Fabio M. Costa: (http://github.com/fabiomcosta)

credits:
- Olmo Maldonado (key path as string idea)

provides:
- Array.sortBy

requires:
- core/1.3.0:Array

...
*/

(function(){

	var keyPaths = [];

	var saveKeyPath = function(path) {
		keyPaths.push({
			sign: (path[0] === '+' || path[0] === '-')? parseInt(path.shift()+1) : 1,
			path: path
		});
	};

	var valueOf = function(object, path) {
		var ptr = object;
		path.each(function(key) { ptr = ptr[key]; });
		return ptr;
	};

	var comparer = function(a, b) {
		for (var i = 0, l = keyPaths.length; i < l; i++) {
			aVal = valueOf(a, keyPaths[i].path);
			bVal = valueOf(b, keyPaths[i].path);
			if (typeof valueOf(a, keyPaths[i].path) == 'string' && typeof valueOf(b, keyPaths[i].path) == 'string'){
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
			if (aVal > bVal) return keyPaths[i].sign;
			if (aVal < bVal) return -keyPaths[i].sign;
		}
		return 0;
	};

	Array.implement('sortBy', function(){
		keyPaths.empty();
		Array.each(arguments, function(argument) {
			switch (typeof(argument)) {
				case "array": saveKeyPath(argument); break;
				case "string": saveKeyPath(argument.match(/[+-]|[^.]+/g)); break;
			}
		});
		return this.sort(comparer);
	});

})();

Function.implement({
	throttle:function(context,timeout){
	    var self = this;
	    
        if (self.waiting) return;
        self.apply(context, arguments);
        self.waiting = true;
        setTimeout(function(){
            self.waiting = false;
        }, timeout || 100);
	},
	debounce:function(context,timeout){
	    var args = arguments;
	    var self = this;
        clearTimeout(self.timer);
        self.timer = (function(){
            self.apply(context, args);
        }).delay(timeout || 100);
	}
});

function $chk(obj){
	return !!(obj || obj === 0);
};

var $pick = function(){
	return Array.from(arguments).pick();
};

var $defined = function(value){
	return value != null;
};

var $extend = function(original, extended){
	return Object.append(original, extended);
};

var $merge = function(){
	var args = Array.slice(arguments);
	args.unshift({});
	return Object.merge.apply(null, args);
};

var $type = function(object){
	var type = typeOf(object);
	if (type == 'elements') return 'array';
	return (type == 'null') ? false : type;
};

var $empty = function(){};

var $splat = function(obj){
	var type = $type(obj);
	return (type) ? ((type != 'array' && type != 'arguments') ? [obj] : obj) : [];
};