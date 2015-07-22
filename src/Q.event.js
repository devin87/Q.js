/// <reference path="Q.core.js" />
/// <reference path="Q.dom.js" />
/// <reference path="Q.query.js" />
/*
* Q.event.js 事件处理
* author:devin87@qq.com  
* update:2015/07/22 14:49
*/
(function (undefined) {
    "use strict";

    var window = Q.G,

        isFunc = Q.isFunc,
        isObject = Q.isObject,
        isArrayLike = Q.isArrayLike,

        makeArray = Q.makeArray,
        containsNode = Q.containsNode,
        query = Q.query,

        factory = Q.factory,

        view = Q.view,
        browser_gecko = Q.gecko;

    //获取原始event对象
    function get_originalEvent(e) {
        if (!e) return window.event;

        return e.originalEvent || e;
    }

    //阻止事件默认行为并停止事件冒泡
    function stop_event(event, isPreventDefault, isStopPropagation) {
        var e = get_originalEvent(event);

        //阻止事件默认行为
        if (isPreventDefault !== false) {
            if (e.preventDefault) e.preventDefault();
            else e.returnValue = false;
        }

        //停止事件冒泡
        if (isStopPropagation !== false) {
            if (e.stopPropagation) e.stopPropagation();
            else e.cancelBubble = true;
        }
    }

    //自定义Event对象
    function QEvent(event) {
        var e = get_originalEvent(event),

            type = e.type,
            target = e.target || e.srcElement,
            relatedTarget = e.relatedTarget || (type == "mouseover" ? e.fromElement : e.toElement),
            rightClick = e.which == 3 || e.button == 2,

            clientX = e.clientX,
            clientY = e.clientY,

            keyCode = e.keyCode,

            deltaY = 0,

            self = this;

        //修正为element元素,即nodeType==1
        while (target && target.nodeType != 1) target = target.parentNode;

        //原生Event对象
        self.originalEvent = e;

        self.type = type;
        self.target = target;
        self.relatedTarget = relatedTarget;

        self.rightClick = rightClick;

        //Mouse Event
        if (clientX !== undefined) {
            var x = e.pageX,
                y = e.pageY;

            if (x == undefined) x = e.x != undefined ? e.x : clientX + view.getScrollLeft();
            if (y == undefined) y = e.y != undefined ? e.y : clientY + view.getScrollTop();

            self.clientX = clientX;
            self.clientY = clientY;
            self.pageX = self.x = x;
            self.pageY = self.y = y;
        }

        //Key Event
        if (keyCode !== undefined) self.keyCode = e.keyCode;

        self.altKey = e.altKey;
        self.ctrlKey = e.ctrlKey;
        self.shiftKey = e.shiftKey;

        //Wheel Event
        if ("wheelDelta" in e) deltaY = e.wheelDelta;
        else if ("wheelDeltaY" in e) deltaY = e.wheelDeltaY;
        else if ("deltaY" in e) deltaY = -e.deltaY;
        else deltaY = -e.detail;

        if (deltaY != 0) deltaY = deltaY > 0 ? 1 : -1;

        //向上滚动为1,向下滚动为-1
        self.delta = deltaY;
    }

    factory(QEvent).extend({
        //阻止事件默认行为
        preventDefault: function () {
            stop_event(this, true, false);
        },
        //停止事件冒泡
        stopPropagation: function () {
            stop_event(this, false, true);
        },
        //阻止事件默认行为并停止事件冒泡
        stop: function () {
            stop_event(this);
        }
    });

    //获取兼容的event对象
    function fix_event(e) {
        return new QEvent(e);
    }

    var EVENT_TYPE_WHEEL = "onwheel" in document || Q.ie >= 9 ? "wheel" : (browser_gecko ? "DOMMouseScroll" : "mousewheel"),

        SUPPORT_W3C_EVENT = !!document.addEventListener,
        SUPPORT_MOUSE_ENTER_LEAVE = "onmouseenter" in Q.html;

    //添加DOM事件,未做任何封装
    function addEvent(ele, type, fn) {
        if (SUPPORT_W3C_EVENT) ele.addEventListener(type, fn, false);
        else ele.attachEvent("on" + type, fn);  //注意:fn的this并不指向ele
    }

    //移除DOM事件
    function removeEvent(ele, type, fn) {
        if (SUPPORT_W3C_EVENT) ele.removeEventListener(type, fn, false);
        else ele.detachEvent("on" + type, fn);
    }

    //获取代理目标元素
    function get_target(root, ele, selector) {
        var nodes = query(selector, root);
        for (var i = 0, len = nodes.length; i < len; i++) {
            if (containsNode(nodes[i], ele)) return nodes[i];
        }
    }

    var map_special = {};

    var bind_as_enter_leave = function (fn) {
        return function (e) {
            var target = this,
                related = e.relatedTarget;

            if (!related || (related !== target && !containsNode(target, related))) {
                e.type = e.type == "mouseover" ? "mouseenter" : "mouseleave";
                fn.call(target, e);
            }
        }
    };

    map_special.mouseenter = {
        type: "mouseover",
        factory: bind_as_enter_leave
    };

    map_special.mouseleave = {
        type: "mouseout",
        factory: bind_as_enter_leave
    };


    //添加事件
    function add_event(ele, type, selector, fn, once, stops) {
        if (type == "wheel" || type == "mousewheel") type = EVENT_TYPE_WHEEL;

        if (once) {
            var _fn = fn;

            fn = function (e) {
                _fn.call(this, e);

                removeEvent(ele, e.originalEvent.type, handle);
            };
        }

        //mouseenter、mouseleave特殊处理
        if (!SUPPORT_MOUSE_ENTER_LEAVE || selector) {
            var special = map_special[type];
            if (special) {
                type = special.type;
                fn = special.factory(fn);
            }
        }

        var handle = function (event) {
            var e = fix_event(event),
                target,
                flag = !selector || (target = get_target(ele, e.target, selector));

            if (flag) fn.call(target || ele, e);
        };

        addEvent(ele, type, handle);

        if (!once) stops.push([ele, type, handle, selector]);
    }

    //批量添加事件
    //types:事件类型,多个之间用空格分开;可以为对象
    //selector:要代理的事件选择器或处理句柄
    function add_events(elements, types, selector, handle, once) {
        if (typeof types == "string") {
            types = types.split(' ');

            if (isFunc(selector)) {
                once = once || handle;
                handle = selector;
                selector = undefined;
            }
        } else {
            if (selector === true || handle === true) once = true;
            if (selector === true) selector = undefined;
        }

        var stops = [];

        makeArray(elements).forEach(function (ele) {
            if (isArrayLike(types)) {
                makeArray(types).forEach(function (type) {
                    add_event(ele, type, selector, handle, once, stops);
                });
            } else if (isObject(types)) {
                Object.forEach(types, function (type, handle) {
                    add_event(ele, type, selector, handle, once, stops);
                });
            }
        });

        //返回移除事件api
        return {
            es: stops,

            off: function (types, selector) {
                remove_events(stops, types, selector);
            }
        };
    }

    //批量移除事件
    //es:事件句柄对象列表  eg:es => [[ele, type, handle, selector],...]
    function remove_events(es, types, selector) {
        var list = es;
        if (types) {
            var map_type = types.split(' ').toMap(true);
            list = list.filter(function (s) {
                return map_type[s[1]];
            });
        }

        if (selector) {
            list = list.filter(function (s) {
                return s[3] == selector;
            });
        }

        list.forEach(function (s) {
            removeEvent.apply(undefined, s.slice(0, 3));
        });
    }

    //批量添加事件,执行一次后取消
    function add_events_one(elements, types, selector, handle) {
        return add_events(elements, types, selector, handler, true);
    }

    //触发事件
    function trigger_event(ele, type) {
        if (isFunc(ele[type])) ele[type]();
        else if (ele.fireEvent) ele.fireEvent("on" + type);  //ie10-
        else if (ele.dispatchEvent) {
            var evt = document.createEvent("HTMLEvents");

            //initEvent接受3个参数:事件类型,是否冒泡,是否阻止浏览器的默认行为
            evt.initEvent(type, true, true);

            //鼠标事件,设置更多参数
            //var evt = document.createEvent("MouseEvents");
            //evt.initMouseEvent(type, true, true, ele.ownerDocument.defaultView, 1, e.screenX, e.screenY, e.clientX, e.clientY, false, false, false, false, 0, null);

            ele.dispatchEvent(evt);
        }
    }

    //---------------------- export ----------------------

    Q.Event = QEvent;

    Q.event = {
        fix: fix_event,
        stop: stop_event,
        trigger: trigger_event,

        //原生事件添加(建议使用add)
        addEvent: addEvent,
        //原生事件移除
        removeEvent: removeEvent,

        //添加事件,并返回操作api
        add: add_events,

        //注意:批量移除事件,与一般事件移除不同;移除事件请使用add返回的api
        removeEs: remove_events,
        one: add_events_one
    };

})();