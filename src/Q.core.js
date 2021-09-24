/// <reference path="Q.js" />
/// <reference path="Q.Queue.js" />
/*
* Q.core.js (包括 通用方法、JSON、Cookie、Storage 等) for browser
* author:devin87@qq.com  
* update:2021/09/24 10:58
*/
(function (undefined) {
    "use strict";

    var isObject = Q.isObject,
        isFunc = Q.isFunc,
        isHttpURL = Q.isHttpURL,

        getType = Q.type,

        makeArray = Q.makeArray,
        extend = Q.extend,
        fire = Q.fire,

        join_url = Q.join,

        waitFor = Q.waitFor;

    var window = Q.G,
        document = window.document,

        html = document.documentElement,
        head = document.head || document.getElementsByTagName("head")[0],

        is_quirk_mode = document.compatMode == "BackCompat",

        body,
        root;

    //编码url参数
    var encode_url_param = encodeURIComponent;

    //解码url参数值 eg:%E6%B5%8B%E8%AF%95 => 测试
    function decode_url_param(param) {
        try {
            return decodeURIComponent(param);
        } catch (e) {
            return param;
        }
    }

    var map_loaded_resource = {},
        GUID_RESOURCE = Date.now(),

        //LOAD_READY = 0,
        LOAD_PROCESSING = 1,
        LOAD_COMPLETE = 2;

    //通过创建html标签以载入资源
    //init:初始化函数,返回html标签 eg:init(url) -> script|link
    function load_with_html(urls, callback, ops, init) {
        var list = makeArray(urls), length = list.length;
        if (length <= 0) return;

        ops = ops || {};
        if (isObject(callback)) {
            ops = callback;
            callback = ops.complete;
        }

        var create_element = ops.init || init,
            count = 0;

        var afterLoad = function (url, element) {
            if (map_loaded_resource[url] == LOAD_COMPLETE) return;
            map_loaded_resource[url] = LOAD_COMPLETE;

            if (ops.removed) head.removeChild(element);

            fire(ops.after, element, url, element);

            doComplete(url);
        };

        //所有资源加载完毕
        var doComplete = function (url) {
            if (++count >= length) fire(callback, undefined, url);
        };

        list.forEach(function (url) {
            if (ops.data) url = join_url(url, ops.data);
            else if (ops.cache === false) url = join_url(url, "_=" + (++GUID_RESOURCE));

            //避免加载重复资源
            if (ops.once !== false && map_loaded_resource[url]) {
                //已加载过,直接返回
                if (map_loaded_resource[url] == LOAD_COMPLETE) return doComplete(url);

                //正在加载,等待加载完成
                return waitFor(function () {
                    return map_loaded_resource[url] == LOAD_COMPLETE;
                }, function () {
                    doComplete(url);
                });
            }

            var element = create_element(url);

            map_loaded_resource[url] = LOAD_PROCESSING;

            element.onreadystatechange = function () {
                if (this.readyState == "loaded" || this.readyState == "complete") afterLoad(url, this);
            };

            element.onload = function () {
                afterLoad(url, this);
            };

            fire(ops.before, element, url, element);

            head.insertBefore(element, head.lastChild);
        });

        list = null;
    }

    //加载脚本文件
    //callback:回调函数
    function loadJS(urls, callback, ops) {
        load_with_html(urls, callback, ops, function (url) {
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = url;

            return script;
        });
    }

    //加载样式文件
    //callback:回调函数
    function loadCSS(urls, callback, ops) {
        load_with_html(urls, callback, ops, function (url) {
            var link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = url;

            return link;
        });
    }

    //---------------------- browser.js ----------------------

    var browser_ie,
        engine_name = "unknown",
        engine = {};

    //ie11 开始不再保持向下兼容(例如,不再支持 ActiveXObject、attachEvent 等特性)
    if (window.ActiveXObject || window.msIndexedDB) {
        //window.ActiveXObject => ie10-
        //window.msIndexedDB   => ie11+

        engine.ie = browser_ie = document.documentMode || (!!window.XMLHttpRequest ? 7 : 6);
        engine["ie" + (browser_ie < 6 ? 6 : browser_ie)] = true;

        engine_name = "trident";
    } else if (window.opera) {
        engine_name = "opera";
    } else if (window.mozInnerScreenX != undefined || isFunc(document.getBoxObjectFor)) {
        //document.getBoxObjectFor => firefox3.5-
        //window.mozInnerScreenX   => firefox3.6+
        engine_name = "gecko";
    } else if (window.webkitMediaStream || window.WebKitPoint) {
        //window.WebKitPoint        => chrome38-
        //window.webkitMediaStream  => chrome39+
        engine_name = "webkit";
    }

    engine[engine_name] = true;

    extend(Q, engine);

    engine.name = engine_name;

    //----------------------- JSON.js -----------------------

    var has = Object.prototype.hasOwnProperty,

        JSON_SPECIAL = { '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"', '\\': '\\\\' },
        JSON_NULL = "null";

    //字符转义
    function json_replace(c) {
        //return JSON_SPECIAL[c]||'\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
        return JSON_SPECIAL[c] || c;
    }

    //json转化
    function json_encode(obj) {
        switch (getType(obj)) {
            case "string": return '"' + obj.replace(/[\x00-\x1f\\"]/g, json_replace) + '"';
            case "list":
            case "array":
                var tmp = [];
                for (var i = 0, len = obj.length; i < len; i++) {
                    if (typeof obj[i] !== "function") tmp.push(obj[i] != undefined ? json_encode(obj[i]) : JSON_NULL);
                }
                return "[" + tmp + "]";
            case "object":
            case "arguments":
                var tmp = [];
                for (var k in obj) {
                    if (has.call(obj, k) && typeof obj[k] !== "function") tmp.push("\"" + k + "\":" + json_encode(obj[k]));
                }
                return "{" + tmp.toString() + "}";
            case "boolean": return obj + "";
            case "number": return isFinite(obj) ? obj + "" : JSON_NULL;
            case "date": return isFinite(obj.valueOf()) ? "\"" + obj.toUTC().format("yyyy-MM-ddTHH:mm:ss.SZ") + "\"" : JSON_NULL;
            case "function": return;
            default: return typeof obj == "object" ? "{}" : JSON_NULL;
        }
    }

    //json解析
    //secure:是否进行安全检测
    function json_decode(text, secure) {
        //安全检测
        if (secure !== false && !/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) throw new Error("JSON SyntaxError");
        try {
            return (new Function("return " + text))();
        } catch (e) { }
    }

    if (!window.JSON) {
        window.JSON = {
            stringify: json_encode,
            parse: json_decode
        };
    }

    JSON.encode = json_encode;
    JSON.decode = json_decode;

    //------------------------------- cookie.js -------------------------------
    //解析cookie值
    function parseCookieValue(s) {
        if (s.indexOf('"') === 0) s = s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        return decode_url_param(s.replace(/\+/g, ' '));
    }

    //读取cookie值或返回整个对象
    function getCookie(key) {
        var result = key ? undefined : {},
            cookies = document.cookie ? document.cookie.split('; ') : [];

        for (var i = 0, len = cookies.length; i < len; i++) {
            var parts = cookies[i].split('='),
                name = decode_url_param(parts[0]),
                cookie = parts.slice(1).join('=');

            if (key && key === name) {
                result = parseCookieValue(cookie);
                break;
            }

            if (!key && (cookie = parseCookieValue(cookie)) !== undefined) {
                result[name] = cookie;
            }
        }

        return result;
    }

    //设置cookie
    function setCookie(key, value, ops) {
        ops = ops || {};

        var expires = ops.expires;
        if (typeof expires === "number") expires = new Date().add("d", expires);

        document.cookie = [
            encode_url_param(key), '=', encode_url_param(value),
            expires ? '; expires=' + expires.toUTCString() : '',
            ops.path ? '; path=' + ops.path : '',
            ops.domain ? '; domain=' + ops.domain : '',
            ops.secure ? '; secure' : ''
        ].join('');
    }

    //移除cookie
    function removeCookie(key) {
        if (getCookie(key) != undefined) setCookie(key, '', { expires: -1 });
    }

    //清空cookie
    function clearCookie() {
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        for (var i = 0, len = cookies.length; i < len; i++) {
            var parts = cookies[i].split('='),
                key = decode_url_param(parts[0]);

            removeCookie(key);
        }
    }

    var cookie = {
        get: getCookie,
        set: setCookie,
        remove: removeCookie,

        clear: clearCookie
    };

    //------------------------------- Storage.js -------------------------------
    //type:localStorage | sessionStorage
    //useCookie:在其它特性不支持的情况下是否启用cookie模拟
    function Storage(type, useCookie) {
        var isLocal = type != "sessionStorage";

        if (!isLocal && !location.host) return;

        var STORE_NAME = type,

            storage = window[STORE_NAME],
            adapter = storage && "getItem" in storage ? "storage" : null;

        if (!adapter) {
            var userData = document.documentElement, TEST_KEY = "_Q_";

            try {
                //ie userdata
                userData.addBehavior('#default#userdata');
                //7天后过期
                if (isLocal) userData.expires = new Date().add("d", 7).toUTCString();

                STORE_NAME = location.hostname || "local";
                userData.save(STORE_NAME);

                storage = {
                    getItem: function (key) {
                        userData.load(STORE_NAME);
                        return userData.getAttribute(key);
                    },
                    setItem: function (key, value) {
                        userData.setAttribute(key, value);
                        userData.save(STORE_NAME);
                    },
                    removeItem: function (key) {
                        userData.removeAttribute(key);
                        userData.save(STORE_NAME);
                    },
                    clear: function () {
                        userData.load(STORE_NAME);

                        var now = new Date().add("d", -1);
                        userData.expires = now.toUTCString();
                        userData.save(STORE_NAME);
                    }
                };

                if (storage.getItem(TEST_KEY) === undefined) {
                    storage.setItem(TEST_KEY, 1);
                    storage.removeItem(TEST_KEY);
                }

                adapter = "userdata";
            } catch (e) { }

            //cookie 模拟
            if (!adapter && useCookie) {

                storage = {
                    getItem: getCookie,
                    //setItem: setCookie,
                    setItem: isLocal ? function (key, value) {
                        setCookie(key, value, { expires: 7 });
                    } : setCookie,
                    removeItem: removeCookie,
                    clear: clearCookie
                };

                adapter = "cookie";
            }
        }

        var support = !!adapter;

        var store = {
            //是否支持本地缓存
            support: support,

            //适配器:storage|userdata|cookie|null
            adapter: adapter,

            //获取本地缓存
            get: function (key, isJSON) {
                if (support) {
                    try {
                        var value = storage.getItem(key);
                        return isJSON ? (value ? JSON.parse(value) : null) : value;
                    } catch (e) { }
                }

                return undefined;
            },
            //设置本地缓存
            set: function (key, value) {
                if (support) {
                    try {
                        storage.setItem(key, typeof value == "string" ? value : JSON.stringify(value));
                        return true;
                    } catch (e) { }
                }

                return false;
            },
            //删除本地缓存
            remove: function (key) {
                if (support) {
                    try {
                        storage.removeItem(key);
                        return true;
                    } catch (e) { }
                }

                return false;
            },
            //清空本地缓存
            clear: function () {
                if (support) {
                    try {
                        storage.clear();
                        return true;
                    } catch (e) { }
                }

                return false;
            }
        };

        return store;
    }

    //----------------------- view -----------------------

    //页面视图
    var view = {
        //获取可用宽高
        getSize: function () {
            return { width: root.clientWidth, height: root.clientHeight };
        },
        //获取可用宽度
        getWidth: function () {
            return root.clientWidth;
        },
        //获取可用高度
        getHeight: function () {
            return root.clientHeight;
        },
        //获取页面宽度(包括滚动条)
        getScrollWidth: function () {
            //fix webkit bug:document.documentElement.scrollWidth等不能准确识别
            return Math.max(html.scrollWidth, body.scrollWidth);
        },
        //获取页面高度(包括滚动条)
        getScrollHeight: function () {
            //fix webkit bug
            return Math.max(html.scrollHeight, body.scrollHeight);
        },
        //获取左边的滚动距离
        getScrollLeft: function () {
            //fix webkit bug
            return html.scrollLeft || body.scrollLeft;
        },
        //获取上边的滚动距离
        getScrollTop: function () {
            //fix webkit bug
            return html.scrollTop || body.scrollTop;
        }
    };

    //---------------------- 其它 ----------------------

    //是否是输入按键
    function isInputKey(code) {
        //65-90   : A-Z
        //32      : 空格键
        //229     : 中文输入
        //48-57   : 大键盘0-9
        //96-105  : 小键盘0-9
        //106-111 : * + Enter - . / 
        if ((code >= 65 && code <= 90) || code == 32 || code == 229 || (code >= 48 && code <= 57) || (code >= 96 && code <= 111 && code != 108)) return true;

        //186-192 : ;: =+ ,< -_ .> /? `~ 
        //219-222 : [{ \| ]} '"
        if ((code >= 186 && code <= 192) || (code >= 219 && code <= 222)) return true;

        //8       : BackSpace
        //46      : Delete   
        if (code == 8 || code == 46) return true;

        return false;
    };

    //判断指定路径与当前页面是否同域(包括协议检测 eg:http与https不同域)
    function isSameHost(url) {
        if (!isHttpURL(url)) return true;

        var start = RegExp.lastMatch.length,
            end = url.indexOf("/", start),
            host = url.slice(0, end != -1 ? end : undefined);

        return host.toLowerCase() == (location.protocol + "//" + location.host).toLowerCase();
    }

    //清除文本选区
    function clearSelection() {
        if (window.getSelection) {
            var sel = getSelection();
            if (sel.removeAllRanges) sel.removeAllRanges();
            else if (sel.empty) sel.empty();    //old chrome and safari
        } else if (document.selection) {   //ie
            document.selection.empty();
        }
    }

    //---------------------- export ----------------------

    function ready(fn) {
        waitFor(function () { return Q.root; }, fn);
    }

    extend(Q, {
        html: html,
        head: head,
        quirk: is_quirk_mode,

        ready: ready,

        loadJS: loadJS,
        loadCSS: loadCSS,

        engine: engine,

        isInputKey: isInputKey,
        isSameHost: isSameHost,

        clearSelection: clearSelection,

        cookie: cookie,
        store: new Storage("localStorage", true),
        session: new Storage("sessionStorage", true),
        view: view,

        Storage: Storage
    });

    //调用涉及到 body 操作的方法时,推荐在body标签闭合之前引入 Q.core.js 库
    function init() {
        Q.body = body = document.body;
        Q.root = root = is_quirk_mode ? body : html;
    }

    //确保 document.body 已就绪
    if (document.body) init();
    else waitFor(function () { return document.body; }, init);

    //暴露接口
    window.request = Q.parseUrlParams(location.search);

})();