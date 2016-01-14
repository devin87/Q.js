/// <reference path="Q.js" />
/*
* Q.query.js CSS选择器 from mojoQuery v1.5
* Copyright (c) 2009 scott.cgi
* https://github.com/scottcgi/MojoJS

* author:devin87@qq.com
* update:2016/01/14 10:48

* fixed bug:https://github.com/scottcgi/MojoJS/issues/1
* add pseudo (lt,gt,eq) eg:query("a:lt(3)")
* add matches
* fixed space trim bug eg:.a .b => not .a.b
* attr value quote support eg:div[class="a"]
*/
(function (undefined) {
    "use strict";

    var document = window.document,
        makeArray = Q.makeArray;

    var RE_RULE = /[ +>~]/g,
        RE_N_RULE = /[^ +>~]+/g,
		//RE_TRIM_LR = /^ +| +$/g,
		//RE_TRIM = / *([^a-zA-Z*]) */g, //bug eg:.t .a=>.t.a
        RE_TRIM = /\s*([+>~])\s*/g,

		RE_PSEU_PARAM = /\([^()]+\)/g,
		RE_ATTR_PARAM = /[^\[]+(?=\])/g,
		RE_ATTR = /[!\^$*|~]?=/,
		//RE_CLS=/\./g,
		RE_PSEU = /[^:]+/g,
		RE_NUM = /\d+/,
		RE_NTH = /(-?\d*)n([+-]?\d*)/,
		RE_RULES = /((?:#[^.:\[]+)*)([a-zA-Z*]*)([^\[:]*)((?:\[.+\])*)((?::.+)*)/,

        // Identifies HTMLElement whether matched in one query
		tagGuid = 1,

        jo_pseuParams,
        jo_attrParams,

		attrMap = {
		    "class": "className",
		    "for": "htmlFor"
		};

    /**
    * Trim extra space
    * 
    * @param  {String} selector
    * @return {String} Selector after tirm
    */
    function trim(selector) {
        return selector
				    // trim left and right space
				    //.replace(RE_TRIM_LR, "")
                    .trim()

				    // trim space in selector
				    .replace(RE_TRIM, "$1");
    }

    /**
	* Replace attribute and pseudo selector which in "[]" and "()"
	* 
	* @param  {String} selector  
	* @return {Array}  Selector split by comma
	*/
    function replaceAttrPseudo(selector) {
        var pseuParams = [],
            attrParams = [];

        jo_pseuParams = pseuParams;
        jo_attrParams = attrParams;

        selector = selector
                        // remove attribute selector parameter and put in array
                        .replace(RE_ATTR_PARAM, function (matched) {
                            return attrParams.push(matched) - 1;
                        });

        // remove pseudo selector parameter and put in array
        while (selector.indexOf("(") !== -1) {
            selector = selector.replace(RE_PSEU_PARAM, function (matched) {
                return pseuParams.push(matched.substring(1, matched.length - 1)) - 1;
            });
        }

        return selector;
    }

    /**
	* Parse selector and get complex selector
	* 
	* @param  {String} selector
	* @return {Array}  Array of parsed rule
	*/
    function getRules(selector) {
        var rules, attrs, pseudos;

        // rules[1]: id selector 
        // rules[2]: tag selector
        // rules[3]: class selecotr
        // rules[4]: attribute selector
        // rules[5]: pseudo selector  	
        rules = RE_RULES.exec(selector);

        rules[2] = rules[2] || "*";

        //rules[3] = rules[3].replace(RE_CLS, "");

        if (attrs = rules[4]) {
            // array of attritubte parse function
            rules[4] = getAttrRules(attrs.match(RE_ATTR_PARAM), jo_attrParams);
        }

        if (pseudos = rules[5]) {
            // array of pseudo parse function
            rules[5] = getPseudoRules(pseudos.match(RE_PSEU), jo_pseuParams)
        }

        return rules;
    }

    /**
	* Get attribute parse functions
	* 
	* @param  {Array} arrAttr       
	* @param  {Array} attrParams  
	* @return {Array} Array of attribute parse function    
	*/
    function getAttrRules(arrAttr, attrParams) {
        var arr = [],
            i = 0,
            len = arrAttr.length,
            rex = RE_ATTR,
            attrs = attributes,
            attr;

        for (; i < len; i++) {
            attr = attrParams[arrAttr[i]];

            if (rex.test(attr)) {
                attr = RegExp["$'"];
                // [function, name, value] are put in arr
                arr.push(attrs[RegExp["$&"]], RegExp["$`"], attr.replace(/^["']|["']$/g, ""));
            } else {
                // only has attribute name
                arr.push(attrs[" "], attr, "");
            }
        }

        return arr;
    }

    /**
	* Get pesudo parse functions
	* 
	* @param  {Array} arrPseu 
	* @param  {Array} pseuParams
	* @return {Array} Array of pseudo parse function
	*/
    function getPseudoRules(arrPseu, pseuParams) {
        var arr = [],
            i = 0,
            len = arrPseu.length,
            rex = RE_NUM,
            guid = tagGuid++,
            pseus = pseudos,
            pseu, param;

        for (; i < len; i++) {
            pseu = arrPseu[i];

            // pesudo with parameter
            if (rex.test(pseu)) {
                // pseudos's object property
                pseu = pseus[RegExp["$`"]];
                // pesudo parameter					
                param = pseuParams[RegExp["$&"]];


                // arr[0]: whether has parameter
                // arr[1]: pseudo parse function
                // arr[2]: parameter
                arr.push(
                    true,
                    pseu.fn,
                    pseu.getParam ? pseu.getParam(param, guid) : param
                );
            } else {
                arr.push(false, pseus[pseu], null);
            }
        }

        return arr;
    }

    /**
	* Filter HTMLElement whether matched pseudo rules
	* 
	* @param  {Array} els
	* @param  {Array} pseudoRules
	* @return {Array} Matched HTMLElement array   
	*/
    function filterPseudo(els, pseudoRules) {
        var n = 0,
            m = pseudoRules.length,
            matched = els,
            len, el, pseudo, hasParam, param, i;

        for (; n < m; n += 3) {
            pseudo = pseudoRules[n + 1];
            hasParam = pseudoRules[n];
            param = hasParam ? pseudoRules[n + 2] : undefined;
            els = matched;
            matched = [];

            for (i = 0, len = els.length; i < len; i++) {
                el = els[i];

                if (!pseudo(el, i, len, param)) {
                    continue;
                }

                matched.push(el);
            }
        }

        return matched;
    }

    /**
	* Filter HTMLElement whether matched attribute rules
	* 
	* @param  {Array}  els
	* @param  {Array}  attrRules
	* @return {Array}  Matched HTMLElement array
	*/
    function filterAttr(els, attrRules) {
        var len = els.length,
            i = 0,
            m = attrRules.length,
            matched = [],
            n, el, rule, val, name;

        for (; i < len; i++) {
            el = els[i];

            for (n = 0; n < m; n += 3) {
                rule = attrRules[n];
                name = attrRules[n + 1];

                //IE6/7：getAttribute("href") 默认返回完整路径,第二个参数设为2以与其它浏览器保持一致(返回相对路径)
                if (!(val = el.getAttribute(name, name === "href" ? 2 : undefined))) {
                    if (!(val = el[attrMap[name] || name])) {
                        break;
                    }
                }

                if (!rule(val + "", attrRules[n + 2])) {
                    break;
                }
            }

            if (n === m) {
                matched.push(el);
            }
        }

        return matched;
    }

    /**
	* Filter HTMLElement whether matched class attribute
	* 
	* @param  {Array}   els
	* @param  {String}  cls
	* @return {Array}   Matched HTMLElement array
	*/
    function filterClass(els, cls) {
        var matched = [], start = 1, i, len, el, clsName, clsOne, index;

        do {
            len = els.length;
            if (len <= 0) return matched;

            index = cls.indexOf('.', start);
            clsOne = ' ' + cls.slice(start, index == -1 ? undefined : index) + ' ';

            for (i = 0; i < len; i++) {
                el = els[i];
                if (clsName = el.className) {
                    if ((' ' + clsName + ' ').indexOf(clsOne) != -1) matched.push(el);
                }
            }

            if (index == -1) return matched;

            els = matched;
            matched = [];
            start = index + 1;
        } while (true);
    }

    /**
	* Filter HTMLElement 
	* 
	* @param  {HTMLElement} el
	* @param  {String}      tag
	* @param  {String}      cls
	* @param  {Array}       attrRules
	* @param  {Array}       pseudoRules
	* @return {Boolean}     Whether HTMLElement matched
	*/
    function filterEl(el, tag, cls, attrRules, pseudoRules) {
        if (tag !== "*" && el.nodeName.toLowerCase() !== tag) {
            return false;
        }

        if (cls && !filterClass([el], cls).length) {
            return false;
        }

        if (attrRules && !filterAttr([el], attrRules).length) {
            return false;
        }

        if (pseudoRules && !filterPseudo([el], pseudoRules).length) {
            return false;
        }

        return true;
    }

    /**
	* Get the data bind in HTMLElement
	* 
	* @param  {HTMLElement} el
	* @return {Object}      Data bind in HTMLElement
	*/
    function getElData(el) {
        var data = el.__mojo;

        if (!data) {
            data = el.__mojo = {
                x: {
                    tagGuid: 0
                }
            };
        }

        if (!(data = data.x)) {
            data = {
                tagGuid: 0
            };
        }

        return data;
    }

    /**
    * Reomve duplicate HTMLElement
    * 
    * @param  {Array} arr
    * @return {Array} Unique HTMLElement array
    */
    function makeDiff(arr) {
        var guid = tagGuid++,
            len = arr.length,
            diff = [],
            i = 0,
            el, data;

        for (; i < len; i++) {
            el = arr[i];
            data = getElData(el);
            if (data.tagGuid !== guid) {
                diff.push(el);
                data.tagGuid = guid;
            }
        }

        return diff;
    }

    /**
	* Get nth pseudo parameter after parsed
	* 
	* @param  {String} param
	* @param  {Number} guid
	* @return {Array}  Parsed parameter
	*/
    function getNthParam(param, guid) {
        if (RE_NTH.test(param === "odd" && "2n+1" ||
                                 param === "even" && "2n" || param)) {
            param = RegExp.$1;

            param === "" ?
            param = 1 :
            param === "-" ?
            param = -1 :
            param = param * 1;

            if (param !== 0) {
                // param[0]: Identifies HTMLElement
                // param[1]: whether "nth-child()" has "n" parameter
                // param[2]: parameter before "n"
                // param[3]: paramter after "n"
                return [guid, true, param, RegExp.$2 * 1];
            }

            // the "0n" matched
            param = RegExp.$2;
        }

        // param[0]: Identifies HTMLElement
        // param[1]: whether "nth-child()" has "n" parameter
        // param[2]: number in like "nth-child(5)"
        return [guid, false, param * 1, null];
    }

    /**
	* Check nth pseudo parameter whether matched condition
	* 
	* @param  {Array}  param  
	* @param  {Number} index  
	* @return {Boolean} Matched or not 
	*/
    function checkNthParam(param, index) {
        if (param[1]) {
            index = index - param[3];
            param = param[2];
            return index * param >= 0 && index % param === 0;
        }

        return index === param[2];
    }

    /**
	* Check nth child HTMLELement whether matched condition
	* 
	* @param  {HTMLElement} el
	* @param  {Number}      i
	* @param  {Number}      len
	* @param  {Array}       param
	* @return {Booelan}     Matched or not
	*/
    function checkNthChild(el, i, len, param) {
        var data, node, pel, map, index, checkType,
            first = param[4],
            next = param[5],
            guid = param[0];

        data = getElData(pel = el.parentNode);

        if (data.tagGuid !== guid) {
            if (checkType = param[6]) {
                // need to check HTMLElement type
                // so record the type
                map = data.tagMap = {};
            } else {
                index = 0;
            }

            node = pel[first];
            while (node) {
                if (node.nodeType === 1) {
                    if (checkType) {
                        name = node.nodeName;
                        if (!map[name]) {
                            map[name] = 1;
                        }

                        // count child by different type
                        index = map[name]++;
                    } else {
                        // count all child
                        index++;
                    }
                    getElData(node).nodeIndex = index;
                }
                node = node[next];
            }
            data.tagGuid = guid;
        }

        return checkNthParam(param, getElData(el).nodeIndex);
    }

    /**
	* Check el has sibling 
	* 
	* @param {HTMLElement} el
	* @param {String}      next
	* @param {Boolean}     checkType
	* @param {String}      name
	* @return {Boolean}    Has or not
	*/
    function checkSibling(el, next, checkType, name) {
        while (el = el[next]) {
            if (el.nodeType === 1) {
                if (!checkType || name === el.nodeName) {
                    return false;
                }
            }
        }

        return true;
    }

    var relative = {
        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        " ": function (contexts, tag) {
            var
                guid = tagGuid++,
                len = contexts.length,
                arr = [],
                i = 0,
                n, m, nodes, el, pel;

            for (; i < len; i++) {
                el = contexts[i];
                if (pel = el.parentNode) {
                    getElData(el).tagGuid = guid;
                    if (getElData(pel).tagGuid === guid) {
                        continue;
                    }
                }

                nodes = el.getElementsByTagName(tag);
                for (n = 0, m = nodes.length; n < m; n++) {
                    arr.push(nodes[n]);
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        ">": function (contexts, tag) {
            var
                arr = [],
                len = contexts.length,
                i = 0, el;

            for (; i < len; i++) {
                el = contexts[i].firstChild;
                while (el) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                    }
                    el = el.nextSibling;
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        "+": function (contexts, tag) {
            var
                arr = [],
                len = contexts.length,
                i = 0, el;

            for (; i < len; i++) {
                el = contexts[i];
                while (el = el.nextSibling) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                        break;
                    }
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        "~": function (contexts, tag) {
            var
                guid = tagGuid++,
                len = contexts.length,
                arr = [],
                i = 0,
                el, pel, data;

            for (; i < len; i++) {
                el = contexts[i];
                if (pel = el.parentNode) {
                    if ((data = getElData(pel)).tagGuid === guid) {
                        continue;
                    }
                    data.tagGuid = guid;
                }

                while (el = el.nextSibling) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                    }
                }
            }

            return arr;
        }
    };

    var attributes = {
        " ": function () {
            return true;
        },

        "=": function (attrVal, inputVal) {
            return attrVal === inputVal;
        },

        "!=": function (attrVal, inputVal) {
            return attrVal !== inputVal;
        },

        "^=": function (attrVal, inputVal) {
            return attrVal.indexOf(inputVal) === 0;
        },

        "$=": function (attrVal, inputVal) {
            return attrVal.substring(attrVal.length - inputVal.length) === inputVal;
        },

        "*=": function (attrVal, inputVal) {
            return attrVal.indexOf(inputVal) !== -1
        },

        "~=": function (attrVal, inputVal) {
            return (" " + attrVal + " ").indexOf(" " + inputVal + " ") !== -1;
        },

        "|=": function (attrVal, inputVal) {
            return attrVal === inputVal || attrVal.substring(0, inputVal.length + 1) === inputVal + "-";
        }
    };

    var pseudos = {
        //css//
        "nth-child": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("firstChild", "nextSibling", false);
                return param;
            },
            fn: checkNthChild
        },

        "nth-last-child": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("lastChild", "previousSibling", false);
                return param;
            },
            fn: checkNthChild
        },

        "nth-of-type": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("firstChild", "nextSibling", true);
                return param;
            },
            fn: checkNthChild
        },

        "nth-last-of-type": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("lastChild", "previousSibling", true);
                return param;
            },
            fn: checkNthChild
        },

        not: {
            getParam: function (param) {
                // ":not()" may has "," in parameter
                // like: ":not(a, p)"
                var rules = param.split(",");
                param = [];
                while (rules.length) {
                    param.push(getRules(rules.pop()));
                }

                return param;
            },
            fn: function (el, i, len, params) {
                var k = 0,
                    l = params.length,
                    param;

                for (; k < l; k++) {
                    param = params[k];

                    if (param[1]) {
                        if ("#" + el.id !== param[1]) {
                            continue;
                        }
                        return false;
                    }

                    if (filterEl(el, param[2], param[3], param[4], param[5])) {
                        return false;
                    }
                }

                return true;
            }
        },

        "first-child": function (el) {
            return checkSibling(el, "previousSibling", false);
        },

        "last-child": function (el) {
            return checkSibling(el, "nextSibling", false);
        },

        "only-child": function (el) {
            return checkSibling(el, "previousSibling", false) &&
                   checkSibling(el, "nextSibling", false);
        },

        "first-of-type": function (el) {
            return checkSibling(el, "previousSibling", true, el.nodeName);
        },

        "last-of-type": function (el) {
            return checkSibling(el, "nextSibling", true, el.nodeName);;
        },

        "only-of-type": function (el) {
            var name = el.nodeName;
            return checkSibling(el, "previousSibling", true, name) &&
                   checkSibling(el, "nextSibling", true, name);
        },

        enabled: function (el) {
            return el.disabled === false;
        },

        disabled: function (el) {
            return el.disabled === true;
        },

        checked: function (el) {
            return el.checked === true;
        },

        empty: function (el) {
            return !el.firstChild;
        },

        selected: function (el) {
            return el.selected === true;
        },

        radio: function (el) {
            return el.nodeName == "INPUT" && el.type == "radio";
        },
        checkbox: function (el) {
            return el.nodeName == "INPUT" && el.type == "checkbox";
        },
        button: function (el) {
            return el.nodeName == "INPUT" && el.type == "button";
        },
        submit: function (el) {
            return el.nodeName == "INPUT" && el.type == "submit";
        },


        //position//			
        first: function (el, i) {
            return i === 0;
        },

        last: function (el, i, len) {
            return i === (len - 1);
        },

        even: function (el, i) {
            return i % 2 === 0;
        },

        odd: function (el, i) {
            return i % 2 === 1;
        },

        lt: {
            fn: function (el, i, len, param) {
                param = +param;
                return i < (param >= 0 ? param : param + len);
            }
        },
        gt: {
            fn: function (el, i, len, param) {
                param = +param;
                return i > (param >= 0 ? param : param + len);
            }
        },
        eq: {
            fn: function (el, i, len, param) {
                param = +param;
                return i == (param >= 0 ? param : param + len);
            }
        },

        nth: {
            getParam: getNthParam,
            fn: function (el, i, len, param) {
                return checkNthParam(param, i);
            }
        },


        //additions//
        contains: {
            fn: function (el, i, len, param) {
                return (el.textContent || el.innerText || "").indexOf(param) !== -1;
            }
        },

        has: {
            getParam: function (param) {
                var
                    selectors = param.split(","),
                    i = 0,
                    len = selectors.length,
                    selector, rules;

                param = [];

                // each selector split by comma
                for (; i < len; i++) {
                    selector = selectors[i];

                    // relative rule array 
                    // add defalut rule " "
                    rules = (" " + selector).match(RE_RULE);

                    // selector on both sides of relative rule  
                    selector = selector.match(RE_N_RULE);

                    // selector start with relative rule
                    if (rules.length > selector.length) {
                        rules.shift();
                    }

                    param.push(selector, rules);
                }

                return param;
            },
            fn: function (el, i, len, param) {
                var k = 0,
                    l = param.length,
                    results = [],
                    context = [el],
                    selector, rules,
                    contexts, n, m;

                // each selector split by comma
                for (; k < l; k += 2) {
                    contexts = context;

                    selector = param[k];
                    rules = param[k + 1];

                    // parse selector by each relative rule
                    for (n = 0, m = rules.length; n < m; n++) {
                        contexts = parse(selector[n], contexts, rules[n]);
                    }

                    // concat results of comma delimited selector
                    results = results.concat(contexts);
                }

                return results.length !== 0;
            }
        }
    };

    /**
    * Parse selector and get matched HTMLElement array
    * 
    * @param  {String} selector      
    * @param  {Array}  contexts      
    * @param  {String} rule         
    * @return {Array}  Matched HTMLElement array
    */
    function parse(selector, contexts, rule, els) {
        var matched, rules, id, tag, cls, attrs, pseudos, el;

        // rules[1]: id selector 
        // rules[2]: tag selector
        // rules[3]: class selecotr
        // rules[4]: attribute selector
        // rules[5]: pseudo selector  									
        rules = RE_RULES.exec(selector);

        // id selector eg:#id | tag#id | #id.cls
        if ((id = rules[1]) || ((id = rules[3]) && id.charAt(0) == "#")) {
            el = document.getElementById(id.slice(1));
            if (!els) els = el ? [el] : [];

            if (id == rules[0]) return el;
        }

        tag = rules[2];

        matched = els || relative[rule](contexts, tag || "*");

        //eg:div#test
        if (els && tag) {
            matched = [];
            tag = tag.toUpperCase();

            for (var i = 0, len = els.length; i < len; i++) {
                if (els[i].tagName == tag) matched.push(els[i]);
            }
        }

        if ((cls = rules[3]) && cls.charAt(0) == ".") {
            matched = filterClass(matched, cls);
        }

        if (attrs = rules[4]) {
            matched = filterAttr(matched, getAttrRules(attrs.match(RE_ATTR_PARAM), jo_attrParams));
        }

        if (pseudos = rules[5]) {
            matched = filterPseudo(matched, getPseudoRules(pseudos.match(RE_PSEU), jo_pseuParams));
        }

        return matched;
    }

    /**
	* Get HTMLElement array by selector and context
	* 
	* @param  {String} selector  
	* @param  {String | HTMLElement | Array[HTMLElement] | NodeList} context (optional)
	* @return {Array} Array of HTMLElement 
	*/
    function query(selector, context) {
        var results = [],
			selectors, contexts, rules, i, j, n, m;

        switch (typeof context) {
            case "undefined":
                contexts = [document];
                break;

            case "string":
                selector = context + " " + selector;
                contexts = [document];
                break;

            case "object":
                if (context.nodeType) {
                    // HTMLElement
                    contexts = [context];
                } else {
                    // assert HTMLElement Array or NodeList
                    contexts = context;
                }
        }

        selectors = replaceAttrPseudo(trim(selector)).split(",");
        context = contexts;

        // each selector split by comma
        for (i = 0, j = selectors.length; i < j; i++) {
            selector = selectors[i];

            // relative rule array 
            // add defalut rule " "
            rules = (" " + selector).match(RE_RULE);

            // selector on both sides of relative rule  
            selector = selector.match(RE_N_RULE);

            // selector start with relative rule
            // remove defalut rule " "
            if (rules.length > selector.length) {
                rules.shift();
            }

            contexts = context;

            // parse selector by each relative rule
            for (n = 0, m = rules.length; n < m; n++) {
                contexts = parse(selector[n], contexts, rules[n]);
            }

            // concat results of comma delimited selector
            results = results.concat(contexts);
        }

        if (j > 1) {
            // if here, may hava duplicate HTMLElement
            // remove duplicate
            return makeDiff(results);
        }

        return results;
    }

    //查询匹配的元素,返回数组(Array)
    Q.query = function (selector, context) {
        if (document.querySelectorAll && (!context || context.nodeType == 1)) {
            try {
                return makeArray((context || document).querySelectorAll(selector));
            } catch (e) { }
        }

        return query(selector, context);
    };

    //判断元素是否符合指定的选择器
    function matchesSelector(el, selector) {
        if (!el || el.nodeType !== 1) return false;

        var matches = el.matches || el.matchesSelector || el.webkitMatchesSelector || el.mozMatchesSelector || el.oMatchesSelector || el.msMatchesSelector;
        if (matches) return matches.call(el, selector);

        var pNode = el.parentNode, tmpNode;
        if (!pNode) {
            tmpNode = pNode = document.createElement("div");
            pNode.appendChild(el);
        }

        var matched = Q.query(selector, pNode).indexOf(el) != -1;
        if (tmpNode) tmpNode.removeChild(el);

        return matched;
    }

    Q.isMatch = matchesSelector;

    //根据 selector 获取匹配的元素列表
    //els: 要匹配的元素或元素列表
    Q.matches = function (els, selector) {
        return makeArray(els).filter(function (el) {
            return matchesSelector(el, selector);
        });
    };

})();