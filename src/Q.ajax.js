/// <reference path="Q.core.js" />
/*
* Q.ajax.js Ajax & JSONP
* author:devin87@qq.com  
* update:2016/02/18 16:10
*/
(function (undefined) {
    "use strict";

    var window = Q.G,

        isFunc = Q.isFunc,
        isUInt = Q.isUInt,

        def = Q.def,
        extend = Q.extend,
        fire = Q.fire,

        to_param_str = Q.param,
        join_url = Q.join,

        browser_ie = Q.ie;

    var is_support_xhr = !!window.XMLHttpRequest,
        is_http = !!location.host;

    //XMLHTTP支持检测 for IE
    function ajax_detect() {
        var xmlhttps = [/*"Msxml2.XMLHTTP.6.0",*/ "Msxml2.XMLHTTP", "Microsoft.XMLHTTP"];
        for (var i = 0, len = xmlhttps.length; i < len ; i++) {
            try {
                new ActiveXObject(xmlhttps[i]);

                return xmlhttps[i];
            } catch (e) { }
        }
    }

    //创建跨浏览器的xmlhttp对象
    var ajax_create;

    if (is_support_xhr && (!browser_ie || is_http)) {
        ajax_create = function () {
            return new XMLHttpRequest();
        };
    } else {
        var ie_xmlhttp = ajax_detect();

        ajax_create = function () {
            return new ActiveXObject(ie_xmlhttp);
        };
    }

    var HTTP_METHOD_GET = "GET",
        HTTP_METHOD_POST = "POST";

    var global_ajax_settings = {};

    //转为小写
    function toLower(str, defValue) {
        return typeof str == "string" ? str.toLowerCase() : defValue;
    }

    //格式化ajax设置
    function ajax_option(ops, success, error) {
        ops = ops || {};

        var get_value = function (prop) {
            return def(ops[prop], global_ajax_settings[prop]);
        };

        var data_type = toLower(get_value("dataType") || "html"),
            timeout = get_value("timeout"),
            is_ajax = toLower(ops.dataType) != "jsonp";

        return {
            type: is_ajax ? (get_value("type") || HTTP_METHOD_GET).toUpperCase() : HTTP_METHOD_GET,
            data: get_value("data"),
            dataType: data_type,

            jsonp: is_ajax ? undefined : get_value("jsonp") || "jsonpcallback",
            jsonpCallback: is_ajax ? undefined : get_value("jsonpCallback") || "_q_jsonp",

            mimeType: is_ajax ? toLower(get_value("mimeType") || "text/" + data_type) : undefined,

            charset: toLower(get_value("charset") || "utf-8"),

            async: get_value("async") !== false,
            cache: get_value("cache") !== false,

            timeout: isUInt(timeout) ? Math.round(timeout) : undefined,

            beforeSend: get_value("beforeSend"),
            success: success || get_value("success"),
            error: error || get_value("error"),
            complete: get_value("complete"),

            headers: is_ajax ? extend(get_value("headers") || {}, {
                "X-Requested-With": "XMLHttpRequest",
                "Accept": "*/*"
            }) : undefined
        };
    }

    //设置ajax全局设置
    function ajax_setup(ops) {
        extend(global_ajax_settings, ops, true);
    }

    var ajax_guid = Date.now(),

        //jsonp
        head = Q.head,
        opera = window.opera,
        oldIE = browser_ie < 9,
        jsonpCount = 0,
        jsonpCache;

    //创建script元素
    function createScript(text) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        if (text) script.text = text;

        return script;
    }

    //jsonp回调函数
    function jsonpCallback(data) {
        jsonpCache = [data];
    }

    //处理jsonp请求
    //参考 jquery.jsonp.js 实现
    function jsonp(url, ops) {
        //beforeSend事件,当返回值为false时,取消jsonp发送
        if (fire(ops.beforeSend, undefined, ops) === false) return;

        var charset = ops.charset,
            timeout = ops.timeout,
            jsonp_param_key = ops.jsonp,
            jsonp_param_value = ops.jsonpCallback,

            scriptId = jsonpCallback + (++jsonpCount),
            script_for_error,

            timer;

        url = join_url(url, jsonp_param_key + "=" + jsonp_param_value);
        window[jsonp_param_value] = jsonpCallback;

        var destroy = function () {
            timer && clearTimeout(timer);

            script.onload = script.onerror = script.onreadystatechange = null;
            head.removeChild(script);
            if (script_for_error) head.removeChild(script_for_error);
        };

        var process_success = function (data) {
            destroy();

            ops.response = data;
            fire_ajax_complete(undefined, ops, AJAX_STATE_SUCCESS);
        };

        var process_error = function (state) {
            destroy();

            fire_ajax_complete(undefined, ops, state);
        };

        var script = createScript();
        if (charset) script.charset = charset;

        //opera11-不支持script的onerror事件
        if (opera && opera.version() < 11.6) {
            script.id = scriptId;
            script_for_error = createScript('document.getElementById("' + scriptId + '").onerror();');
        } else if (ops.async) {
            script.async = "async";
        }

        //ie6-8不支持script的onerror事件,trick
        //用htmlFor和event属性来保证在readyState == loaded || readyState == complete时，script中的代码已经执行
        if (oldIE) {
            script.id = scriptId;
            script.htmlFor = scriptId;
            script.event = "onclick";
        }

        script.onload = script.onerror = script.onreadystatechange = function () {
            if (script.readyState && /i/.test(script.readyState)) return;

            //手动触发script标签的onclick事件，来保证script中的内容得以执行(ie6-8)
            try { script.onclick && script.onclick(); } catch (e) { }

            var result = jsonpCache;
            jsonpCache = 0;

            result ? process_success(result[0]) : process_error(AJAX_STATE_FAILURE);
        };

        script.src = url;

        //beforeSend事件,当返回值为false时,取消jsonp
        if (process_ajax_beforeSend(script, ops) === false) return;

        //在IE6上，文档加载完毕之前使用appendChild会出错，而使用insertBefore就不会出错
        var firstChild = head.firstChild;
        head.insertBefore(script, firstChild);
        if (script_for_error) head.insertBefore(script_for_error, firstChild);

        timer = isUInt(timeout) && setTimeout(function () {
            process_error(AJAX_STATE_TIMEDOUT);
        }, timeout);
    }

    //发送一个ajax请求
    function ajax_send(url, ops) {
        if (isFunc(ops)) ops = { success: ops };

        //配置处理
        ops = ajax_option(ops);
        ops.url = url;

        //队列接口
        if (ops.queue) return ops.queue.add(url, ops);

        var type = ops.type,
            headers = ops.headers,
            str_params = to_param_str(ops.data);

        //强制禁用缓存
        //若服务器执行了缓存策略,firefox、chrome等仍然会进行缓存
        //if (!ops.cache) headers["If-Modified-Since"] = "0";

        //禁用缓存
        if (!ops.cache) {
            url = join_url(url, type != HTTP_METHOD_POST ? str_params : "", "_=" + (ajax_guid++));
        } else {
            if (type != HTTP_METHOD_POST) url = join_url(url, str_params);
        }

        //jsonp单独处理
        if (ops.jsonp) return jsonp(url, ops);

        if (type == HTTP_METHOD_POST) headers["Content-Type"] = "application/x-www-form-urlencoded";
        else str_params = null;

        //创建xmlhttp对象
        var xhr = ajax_create();

        //打开ajax连接
        xhr.open(type, url, ops.async);

        //设置http头(必须在 xhr.open 之后)
        Object.forEach(headers, function (key, value) {
            xhr.setRequestHeader(key, value);
        });

        //修正ajax乱码
        if (xhr.overrideMimeType) xhr.overrideMimeType(ops.mimeType + ";charset=" + ops.charset);
        else ops.needFix = true;

        //beforeSend事件,当返回值为false时,取消ajax发送
        if (process_ajax_beforeSend(xhr, ops) === false) return;

        //处理ajax超时
        process_ajax_timeout(xhr, ops);

        //处理ajax回调
        process_ajax_callback(xhr, ops);

        xhr.send(str_params);

        return xhr;
    }

    //ajax 执行状态
    var AJAX_STATE_TIMEDOUT = -1,
        AJAX_STATE_FAILURE = 0,
        AJAX_STATE_SUCCESS = 1

    //ajax发送之前
    function process_ajax_beforeSend(xhr, ops) {
        ops._begin = Date.now();

        return fire(ops.beforeSend, ops, xhr, ops);
    }

    //处理ajax超时
    function process_ajax_timeout(xhr, ops) {
        var timeout = ops.timeout;
        if (!timeout) return;

        var ontimeout = function () {
            fire_ajax_complete(xhr, ops, AJAX_STATE_TIMEDOUT);
        };

        //原生支持timeout的浏览器
        //注意:当timeout事件触发时,xhr.readyState可能已经为4了
        if ("timeout" in xhr) {
            xhr.timeout = timeout;
            xhr.ontimeout = ontimeout;
        } else {
            //for ie6、7
            ops.timer = setTimeout(function () {
                //此处代码需放在 xhr.abort 之前
                //ie6 调用 xhr.abort 不会触发 onreadystatechange 事件
                ontimeout();

                xhr.abort();
            }, timeout);
        }
    }

    //获取返回内容
    function get_responseText(xhr, ops) {
        var data;

        try {
            //ie6 bug:当服务器不是utf编码时,可能触发 -1072896748 系统错误
            data = xhr.responseText;

            if (!ops.needFix || !browser_ie || (ops.charset && ops.charset.startsWith("utf-"))) return data;
        } catch (e) { }

        //for ie
        try {
            var rs = new ActiveXObject("ADODB.RecordSet");
            rs.fields.append("a", 201, 1);
            rs.open();
            rs.addNew();
            rs(0).appendChunk(xhr.responseBody);
            rs.update();
            data = rs(0).value;
            rs.close();
        } catch (e) { }

        return data;
    }

    //获取返回内容
    function get_response_data(xhr, ops) {
        var dataType = ops.dataType;
        if (dataType == "xml") return xhr.responseXML;

        var data = get_responseText(xhr, ops);

        return dataType == "json" ? JSON.parse(data) : data;
    }

    //处理ajax回调
    function process_ajax_callback(xhr, ops) {
        xhr.onreadystatechange = function () {
            //判断 ops.state 和 xhr.status 以避免重复触发(主要是对timeout而言)
            //浏览器原生timeout事件触发时,xhr.readyState可能已经为4了
            if (xhr.readyState != 4 || ops.state != undefined || (ops.timeout && is_http && xhr.status == 0)) return;

            if (ops.timer) {
                clearTimeout(ops.timer);
                delete ops.timer;
            }

            var successed = (xhr.status >= 200 && xhr.status < 400) || (xhr.status == 0 && !is_http);
            if (successed) ops.response = get_response_data(xhr, ops);

            //触发ajax完成事件
            fire_ajax_complete(xhr, ops, successed ? AJAX_STATE_SUCCESS : AJAX_STATE_FAILURE);
        };
    }

    //触发ajax回调函数
    function fire_ajax_complete(xhr, ops, state) {
        ops.state = state;
        if (state == AJAX_STATE_TIMEDOUT) ops.timedout = true;

        ops._end = Date.now();
        ops.time = ops._end - ops._begin;

        if (state == AJAX_STATE_SUCCESS) fire(ops.success, ops, ops.response, ops, xhr);
        else fire(ops.error, ops, ops, xhr);

        fire(ops.complete, ops, ops, xhr);
    }

    //简化ajax调用
    function ajax_simple_send(url, data, success, error, ops) {
        if (isFunc(data)) {
            error = success;
            success = data;
            data = undefined;
        }

        return ajax_send(url, extend({ data: data, success: success, error: error }, ops));
    }

    var Ajax = {
        getXHR: ajax_create,

        ajaxSetup: ajax_setup,

        ajax: ajax_send,

        get: function (url, data, success, error) {
            return ajax_simple_send(url, data, success, error);
        },
        post: function (url, data, success, error) {
            return ajax_simple_send(url, data, success, error, { type: HTTP_METHOD_POST });
        },
        getJSON: function (url, data, success, error) {
            return ajax_simple_send(url, data, success, error, { dataType: "json" });
        },
        postJSON: function (url, data, success, error) {
            return ajax_simple_send(url, data, success, error, { type: HTTP_METHOD_POST, dataType: "json" });
        },

        jsonp: function (url, data, success, error) {
            return ajax_simple_send(url, data, success, error, { dataType: "jsonp" });
        }
    };

    //---------------------- export ----------------------

    Q.Ajax = Ajax;

    extend(Q, Ajax);

})();