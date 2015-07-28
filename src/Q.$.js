/// <reference path="Q.core.js" />
/// <reference path="Q.dom.js" />
/// <reference path="Q.query.js" />
/// <reference path="Q.event.js" />
/// <reference path="Q.ajax.js" />
/*
* Q.$.js DOM操作
* author:devin87@qq.com  
* update:2015/07/28 16:46
*/
(function (undefined) {
    "use strict";

    var window = Q.G,

        isFunc = Q.isFunc,

        slice = Array.prototype.slice,

        extend = Q.extend,
        makeArray = Q.makeArray,
        createEle = Q.createEle,
        parseHTML = Q.parseHTML,

        ready = Q.ready,

        querySelectorAll = Q.query,
        matchesSelector = Q.matches,

        E = Q.event;

    //是否是html标签
    function isTag(str) {
        return str.substr(0, 1) == "<" && str.substr(str.length - 1, 1) == ">";
    }

    //插入元素对象
    //ele:box
    //node:要插入的元素对象
    function insertAdjacentElement(ele, where, node) {
        switch (where) {
            //case "before":                                                                                                        
            case "beforeBegin":  //before
                ele.parentNode.insertBefore(node, ele);
                break;
                //case "prepend":                                                                                                        
            case "afterBegin":  //prepend
                ele.insertBefore(node, ele.firstChild);
                break;
                //case "append":                                                                                                        
            case "beforeEnd":  //append
                ele.appendChild(node);
                break;
                //case "after":                                                                                                        
            case "afterEnd":  //after
                if (ele.nextSibling) ele.parentNode.insertBefore(node, ele.nextSibling);
                else ele.parentNode.appendChild(node);
                break;
        }
    }

    //构建文档碎片
    function build_fragment(nodes) {
        if (nodes.length == 1) return nodes[0];

        var fragment = document.createDocumentFragment(), node;
        while ((node = nodes[0])) {
            fragment.appendChild(node);
        }

        return fragment;
    }

    var _node = createEle("div"),

        SUPPORT_INSERT_ELEMENT = !!_node.insertAdjacentElement,   //直到Firefox 36尚未支持
        SUPPORT_INSERT_HTML = !!_node.insertAdjacentHTML;         //Firefox 8+

    //插入元素或html
    //where:插入位置 eg:beforeBegin、afterBegin、beforeEnd、afterEnd
    //obj:要插入的节点、文本或html字符串
    function insertEle(ele, where, obj) {
        var isNode = obj.nodeType;

        try {
            if (!isNode && SUPPORT_INSERT_HTML) ele.insertAdjacentHTML(where, obj);
            else if (isNode && SUPPORT_INSERT_ELEMENT) ele.insertAdjacentElement(where, obj);

            return;
        } catch (e) { }

        insertAdjacentElement(ele, where, isNode ? obj : build_fragment(parseHTML(obj, true)));
    }

    //解析并查询
    function query(selector) {
        if (typeof selector != "string") return makeArray(selector);

        return isTag(selector) ? makeArray(parseHTML(selector, true)) : querySelectorAll(selector);
    }

    function SimpleQuery(selector, context) {
        if (isFunc(selector)) return ready(selector);

        var self = this;
        self.context = context;
        self.list = query(selector);

        self._es = [];
        self._cache = [];
        self._level = 0;
    }

    Q.factory(SimpleQuery).extend({
        extend: function (source, forced) {
            extend(SimpleQuery.prototype, source, forced);
        },

        //缓存元素列表,内部调用
        _set: function () {
            var self = this;

            self._cache.push({ list: self.list, _es: self._es });
            self._level++;

            return self;
        },
        //回到上一级元素
        end: function () {
            var self = this,
                level = self._level;

            if (level > 0) level--;
            self._level = level;

            var data = self._cache[level];
            self.list = data.list;
            self._es = data._es;

            if (level > 1) self._cache.pop();

            return self;
        },

        //获取元素数量
        size: function () {
            return this.list.length;
        },
        //获取指定索引的元素
        get: function (i) {
            return this.list.get(i);
        },
        //获取经过fn处理的指定元素的值,若元素不存在,则返回null
        _getVal: function (fn, i) {
            var node = this.get(i || 0);
            return node ? fn.apply(undefined, [node].concat(slice.call(arguments, 2))) : null;
        },

        //遍历元素
        //注意:fn参数同jQuery,与Array.forEach不同 eg:fn.call(element,i,element)
        each: function (fn) {
            var list = this.list;

            for (var i = 0, len = list.length; i < len; i++) {
                if (fn.call(list[i], i, list[i]) === false) break;
            }
            return this;
        },
        //迭代元素
        //注意:fn参数同jQuery,与Array.forEach不同 eg:fn.call(element,i,element)
        map: function (fn) {
            var list = this.list,
                ret = [];

            for (var i = 0, len = list.length; i < len; i++) {
                ret.push(fn.call(list[i], i, list[i]));
            }
            return ret;
        },
        //筛选元素
        filter: function (selector) {
            var self = this,
                list = this.list,
                ret = [];

            self._set();

            if (typeof selector == "string") ret = matchesSelector(list, selector);
            else if (isFunc(selector)) {
                for (var i = 0, len = list.length; i < len; i++) {
                    if (selector.call(list[i], i, list[i])) ret.push(list[i]);
                }
            }

            self.list = ret;

            return self;
        },

        //筛选指定索引的元素
        eq: function (i) {
            var self = this;

            self._set();
            self.list = [self.get(i)];

            return self;
        },
        //筛选第一个元素
        first: function () {
            return this.eq(0);
        },
        //筛选最后一个元素
        last: function () {
            return this.eq(-1);
        },

        //联合新元素
        concat: function (selector) {
            var self = this;

            self._set();
            self.list = self.list.concat(query(selector, self.context));

            return self;
        },
        //查找元素
        find: function (selector) {
            var self = this;

            self._set();
            self.list = query(selector, self.list);

            return self;
        },

        //添加事件绑定
        on: function (types, selector, handle, once) {
            var self = this,
                list = self.list;

            var api = E.add(list, types, selector, handle, once);
            if (!once) self._es.push(api);

            return self;
        },
        //解除事件绑定
        off: function (types, selector) {
            this._es.forEach(function (api) {
                api.off(types, selector);
            });

            return this;
        },
        //添加事件绑定,执行一次后销毁
        one: function (types, selector, handle) {
            return this.on(types, selector, handle, true);
        },
        //添加鼠标移近移出事件
        hover: function (selector, over, out) {
            if (isFunc(selector)) {
                out = over;
                over = selector;
                selector = undefined;
            }

            return this.mouseenter(selector, over).mouseleave(selector, out || over);
        }
    });

    var sp = SimpleQuery.prototype;

    Object.forEach({
        html: "innerHTML",
        text: _node.textContent != undefined ? "textContent" : "innerText",
        val: "value"
    }, function (name, prop) {
        sp[name] = function (value) {
            var node = this.get(0);
            if (value === undefined) return node && node[prop];

            return this.each(function () {
                this[prop] = value;
            });
        };
    });

    Object.forEach({
        before: "beforeBegin",
        prepend: "afterBegin",
        append: "beforeEnd",
        after: "afterEnd"
    }, function (name, where) {
        sp[name] = function (obj) {
            return this.each(function () {
                insertEle(this, where, obj);
            });
        };
    });

    Object.forEach({
        insertBefore: "beforeBegin",
        prependTo: "afterBegin",
        appendTo: "beforeEnd",
        insertAfter: "afterEnd"
    }, function (name, where) {
        sp[name] = function (ele) {
            return this.each(function () {
                insertEle(ele, where, this);
            });
        };
    });

    var map_dom_fn = {
        center: "setCenter",
        remove: "removeEle",
        position: "getPos"
    };

    //获取对应的DOM操作方法
    function get_dom_fn(name) {
        return Q[map_dom_fn[name] || name];
    }

    //操作所有元素,1-3个参数,无返回值
    ["center", "show", "hide", "toggle", "addClass", "removeClass", "replaceClass", "toggleClass", "remove"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (arg1, arg2) {
            return this.each(function () {
                fn(this, arg1, arg2);
            });
        };
    });

    //1个参数,返回对第一个匹配元素的处理结果
    ["innerWidth", "innerHeight", "outerWidth", "outerHeight", "getPrev", "getAllPrev", "getNext", "getAllNext", "getFirst", "getLast", "getParent", "getParents", "getChilds", "position", "hasClass"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (value) {
            return this._getVal(fn);
        };
    });

    //3个参数,对元素遍历赋值,若第2个参数不存在,则返回对第一个匹配元素的处理结果
    ["width", "height"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (value, f) {
            if (value === undefined) return this._getVal(fn);

            return this.each(function () {
                fn(this, value, f);
            });
        };
    });

    //3个参数,对元素遍历赋值,若第3个参数不存在,则返回对第一个匹配元素的处理结果
    ["attr", "prop", "css"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (key, value) {
            if (value === undefined) return this._getVal(fn, 0, key);

            return this.each(function () {
                fn(this, key, value);
            });
        };
    });

    //4个参数,对元素遍历赋值,若第2和第3个参数同时不存在,则返回对第一个匹配元素的处理结果
    ["offset"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (v1, v2, flag) {
            if (v1 === undefined && v2 === undefined) return this._getVal(fn);

            return this.each(function () {
                fn(this, v1, v2, flag);
            });
        };
    });

    //注册事件
    ["blur", "focus", "click", "dblclick", "mousedown", "mouseup", "mousemove", "mouseover", "mouseout", "mouseenter", "mouseleave", "change", "select", "submit", "keydown", "keypress", "keyup"].forEach(function (type) {
        sp[type] = function (selector, fn, ops) {
            if (isFunc(selector)) {
                ops = fn;
                fn = selector;
                selector = undefined;
            }

            if (isFunc(fn)) return this.on(type, selector, fn, ops);

            if (type == "blur" || type == "focus") {
                var node = this.get(0);
                return node && node[type]();
            }

            //触发事件
            return this.each(function (ele) {
                E.trigger(ele, type);
            });
        };
    });

    //---------------------- export ----------------------

    function $(selector, context) {
        return new SimpleQuery(selector, context);
    }

    $.fn = SimpleQuery.prototype;

    extend($, Q.Ajax);

    window.$ = Q.$ = $;
    window.$$ = $.find = querySelectorAll;

})();