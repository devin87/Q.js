/// <reference path="Q.core.js" />
/// <reference path="Q.dom.js" />
/// <reference path="Q.query.js" />
/// <reference path="Q.event.js" />
/// <reference path="Q.ajax.js" />
/*
* Q.$.js DOM操作
* author:devin87@qq.com  
* update:2015/09/28 18:20
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
        removeEle = Q.removeEle,

        ready = Q.ready,

        getChilds = Q.getChilds,
        querySelectorAll = Q.query,
        matchesSelector = Q.matches,

        E = Q.event;

    //是否是html标签
    function isTag(str) {
        return typeof str == "string" && str.charAt(0) == "<" && str.slice(-1) == ">";
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
            if (!isNode && SUPPORT_INSERT_HTML) return ele.insertAdjacentHTML(where, obj);
            if (isNode && SUPPORT_INSERT_ELEMENT) return ele.insertAdjacentElement(where, obj);
        } catch (e) { }

        insertAdjacentElement(ele, where, isNode ? obj : build_fragment(parseHTML(obj, true)));
    }

    //解析并查询
    function query(selector, context) {
        if (typeof selector != "string") return makeArray(selector);

        return isTag(selector) ? makeArray(parseHTML(selector, true)) : querySelectorAll(selector, context);
    }

    function SimpleQuery(selector, context) {
        if (isFunc(selector)) return ready(selector);
        if (selector instanceof SimpleQuery) return selector;

        var self = this;
        self.context = context;
        self._set(query(selector, context));

        self._es = [];
        self._cache = [];
        self._level = 0;
    }

    Q.factory(SimpleQuery).extend({
        //prototype 扩展
        extend: function (source, forced) {
            extend(SimpleQuery.prototype, source, forced);
        },

        //设置元素列表,内部调用
        _set: function (list) {
            var self = this,
                i = 0,
                length = list.length;

            self.list = list;
            self.length = length;

            //支持通过属性方式获取前3个元素 eg: $("a")[0]
            for (; i < 3; i++) self[i] = list[i];

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
            var list = this.list, i = 0, len = list.length;

            for (; i < len; i++) {
                if (fn.call(list[i], i, list[i]) === false) break;
            }
            return this;
        },
        //迭代元素
        //注意:fn参数同jQuery,与Array.map不同 eg:fn.call(element,i,element)
        map: function (fn) {
            var list = this.list,
                i = 0,
                len = list.length,

                ret = [];

            for (; i < len; i++) {
                ret.push(fn.call(list[i], i, list[i]));
            }
            return ret;
        },
        //筛选元素
        filter: function (selector) {
            var self = this,
                list = self.list,
                ret = [];

            if (typeof selector == "string") {
                ret = matchesSelector(list, selector);
            } else if (isFunc(selector)) {
                for (var i = 0, len = list.length; i < len; i++) {
                    if (selector.call(list[i], i, list[i])) ret.push(list[i]);
                }
            }

            return new SimpleQuery(ret);
        },

        //查找元素
        find: function (selector) {
            return new SimpleQuery(selector, this.list);
        },

        //筛选指定索引的元素
        eq: function (i) {
            return new SimpleQuery([this.get(i)]);
        },
        //筛选第一个元素
        first: function () {
            return this.eq(0);
        },
        //筛选最后一个元素
        last: function () {
            return this.eq(-1);
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
        },

        //对每一个元素执行包裹
        wrap: function (html) {
            return this.each(function (i, element) {
                var tag = isFunc(html) ? html.call(element, i, element) : html,
                    el = isTag(tag) ? parseHTML(tag) : tag.cloneNode(true);

                element.parentNode.insertBefore(el, element);
                el.appendChild(element);
            });
        },
        //移出元素的父元素
        unwrap: function () {
            this.map(function (i, element) {
                var pNode = element.parentNode;

                pNode.parentNode.insertBefore(element, pNode);
                return pNode;
            }).forEach(removeEle);

            return this;
        },
        //将每一个匹配的元素的子内容(包括文本节点)用一个HTML结构包裹起来
        wrapInner: function (html) {
            return this.each(function (i, element) {
                var tag = isFunc(html) ? html.call(element, i, element) : html,
                    el = isTag(tag) ? parseHTML(tag) : tag.cloneNode(true),
                    childNodes = element.childNodes;

                makeArray(childNodes).forEach(function (node) {
                    el.appendChild(node);
                });

                element.appendChild(el);
            });
        },
        //将所有匹配的元素用单个元素包裹起来
        wrapAll: function (html) {
            var el = isTag(html) ? parseHTML(html) : html.cloneNode(true);

            return this.each(function (i, element) {
                if (i == 0) element.parentNode.insertBefore(el, element);
                el.appendChild(element);
            });
        },

        //获取所有子元素
        children: function () {
            var list = [];

            this.each(function () {
                list = list.concat(getChilds(this));
            });

            return new SimpleQuery(list);
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
                insertEle(ele[0] || ele, where, this);
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
    ["innerWidth", "innerHeight", "outerWidth", "outerHeight", "getPrev", "getAllPrev", "getNext", "getAllNext", "getFirst", "getLast", "getParent", "getParents", "getChilds", "position"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (value) {
            return this._getVal(fn);
        };
    });

    //2个参数,返回对第一个匹配元素的处理结果
    ["hasClass"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (value) {
            return this._getVal(fn, 0, value);
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

    //获取元素滚动距离
    ["scrollTop", "scrollLeft"].forEach(function (name) {
        sp[name] = function () {
            var el = this.get(0);
            if (el == el.window || el.body) {
                if (!el.body) el = el.document;

                return Math.max(el.documentElement[name], el.body[name]);
            }

            return el[name];
        };
    });

    //3个参数,对元素遍历赋值,若第3个参数不存在,则返回对第一个匹配元素的处理结果
    ["attr", "prop", "css"].forEach(function (name) {
        var fn = get_dom_fn(name);

        sp[name] = function (key, value) {
            if (value === undefined && typeof key == "string") return this._getVal(fn, 0, key);

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