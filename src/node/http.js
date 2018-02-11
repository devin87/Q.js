/// <reference path="../Q.js" />
/*
* Q.node.http.js http请求(支持https)
* author:devin87@qq.com
* update:2018/02/11 09:42
*/
(function () {
    var URL = require('url'),
        querystring = require('querystring'),
        http = require('http'),
        https = require('https'),
        fs = require('fs'),

        extend = Q.extend,
        fire = Q.fire,
        isFunc = Q.isFunc,
        isObject = Q.isObject;

    var ErrorCode = {
        HttpError: 1,
        JSONError: 2,
        Timedout: 3,
        FileError: 4
    };

    var config = {
        timeout: 10000
    };

    /**
     * http设置
     * @param {object} settings {ErrorCode:{},config:{}}
     */
    function setup(settings) {
        if (settings.ErrorCode) extend(ErrorCode, settings.ErrorCode, true);
        if (settings.config) extend(config, settings.config, true);
    }

    /**
     * 触发http完成事件
     * @param {string|object} result 返回结果
     * @param {number} errCode 错误代码
     * @param {object} ops 请求配置项
     * @param {Response} res Response对象
     * @param {Error} err 错误对象
     */
    function fire_http_complete(result, errCode, ops, res, err) {
        //避免某些情况（eg:超时）重复触发回调函数
        if (!ops._status) ops._status = {};
        if (ops._status.ended) return;
        ops._status.ended = true;

        fire(ops.complete, undefined, result, errCode, ops, res, err);
        fire(config.afterSend, undefined, result, errCode, ops, res, err);

        if (ops.res) ops.res.end(err ? 'Error: ' + err.message : ops.response);
    }

    /**
     * 发送http请求
     * @param {string} url 请求地址
     * @param {object} ops 请求配置项
     */
    function sendHttp(url, ops) {
        ops = ops || {};

        //队列接口
        if (ops.queue) {
            ops.queue.add(url, ops);
            ops.queue = undefined;
            return;
        }

        if (isFunc(ops)) ops = { success: ops };

        ops.url = url;

        var method = ops.type || ops.method || 'GET',
            headers = ops.headers || {},
            timeout = ops.timeout || config.timeout || {},

            is_http_post = method == 'POST',
            is_json = ops.dataType == 'JSON',
            data = ops.data,
            post_data = '';

        if (is_http_post) {
            if (data) post_data = typeof data == 'string' ? data : querystring.stringify(data);

            extend(headers, {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data, 'utf8')
            });
        } else {
            if (data) url = Q.join(url, data);
        }

        if (config.headers) extend(headers, config.headers);

        var uri = URL.parse(url);

        ops.options = {
            hostname: uri.hostname,
            path: uri.path,
            port: uri.port,
            method: method,
            headers: headers
        };

        var web = url.startsWith('https') ? https : http;

        fire(config.beforeSend, undefined, ops);

        var req = web.request(ops.options, function (res) {
            var buffers = [];

            var is_http_proxy = Q.def(ops.proxy, ops.res ? true : false),
                is_auto_header = Q.def(ops.autoHeader, is_http_proxy ? true : false);

            if (ops.res) {
                if (is_auto_header) ops.res.writeHead(res.statusCode, res.headers);
                else {
                    var content_type = res.headers['content-type'] || 'text/html';
                    if (content_type.indexOf('charset') == -1) content_type += (content_type.endsWith(';') ? '' : ';') + 'charset=utf-8';
                    ops.res.setHeader('Content-Type', content_type);
                }
            }

            //代理请求
            if (is_http_proxy) {
                res.pipe(ops.res);
            } else {
                res.setEncoding(ops.encoding || 'utf8');

                res.on('data', function (chunk) {
                    buffers.push(chunk);
                });
            }

            res.on('end', function () {
                var text = buffers.join(''), data;
                ops.response = text;
                if (!is_json) return fire_http_complete(text, undefined, ops, res);

                try {
                    data = JSON.parse(text);
                } catch (e) {
                    return fire_http_complete(undefined, ErrorCode.JSONError, ops, res);
                }

                fire_http_complete(data, undefined, ops, res);
            });
        }).on('error', ops.error || config.error || function (err) {
            fire_http_complete(undefined, ErrorCode.HttpError, ops, undefined, err);
        });

        var timeout = ops.timeout || config.timeout;
        if (timeout && timeout != -1) {
            req.setTimeout(timeout, function () {
                req.abort();
                fire_http_complete(undefined, ErrorCode.Timedout, ops);
            });
        }

        req.write(post_data);
        req.end();

        return req;
    }

    /**
     * http请求,简化调用
     * @param {string} url 请求地址
     * @param {object} data 要提交的参数对象
     * @param {function} cb 回调函数(data, errCode, ops, res, err)
     * @param {object} settings http设置
     */
    function http_send_simplpe(url, data, cb, settings) {
        var ops;

        if (isFunc(data)) {
            ops = { complete: data };
        } else if (isObject(cb)) {
            ops = cb;
            ops.data = data;
        } else {
            ops = { data: data, complete: cb };
        }

        //优先设置
        if (settings) extend(ops, settings, true);

        try {
            return sendHttp(url, ops);
        } catch (e) {
            fire_http_complete(undefined, ErrorCode.HttpError, ops, undefined, e);
        }
    }

    /**
     * http GET 请求
     * @param {string} url 请求路径,支持http和https
     * @param {object} data 要提交的参数对象
     * @param {function} cb 回调函数(data,errCode)
     */
    function getHttp(url, data, cb) {
        return http_send_simplpe(url, data, cb);
    }

    /**
     * http POST 请求
     * @param {string} url 请求路径,支持http和https
     * @param {object} data 要提交的参数对象
     * @param {function} cb 回调函数(data,errCode)
     */
    function postHttp(url, data, cb) {
        return http_send_simplpe(url, data, cb, { type: 'POST' });
    }

    /**
     * http GET 请求,并将返回结果解析为JSON对象
     * @param {string} url 请求路径,支持http和https
     * @param {object} data 要提交的参数对象
     * @param {function} cb 回调函数(data,errCode)
     */
    function getJSON(url, data, cb) {
        return http_send_simplpe(url, data, cb, { dataType: 'JSON' });
    }

    /**
     * http POST 请求,并将返回结果解析为JSON对象
     * @param {string} url 请求路径,支持http和https
     * @param {object} data 要提交的参数对象
     * @param {function} cb 回调函数(data,errCode)
     */
    function postJSON(url, data, cb) {
        return http_send_simplpe(url, data, cb, { type: 'POST', dataType: 'JSON' });
    }

    /**
     * 下载文件
     * @param {string} url 下载地址
     * @param {string} dest 保存路径
     * @param {function} cb 回调函数(errCode)
     * @param {object} ops 其它配置项 {timeout:120000}
     */
    function downloadFile(url, dest, cb, ops) {
        ops = ops || {};

        var web = url.startsWith('https') ? https : http;

        var req = web.get(url, function (res) {
            if (res.statusCode === 200) {
                var file = fs.createWriteStream(dest);
                res.pipe(file);

                file.on('finish', function () {
                    file.close(function () {
                        fire(cb, undefined, undefined, undefined, ops, res);
                    });
                });

                file.on('error', function (err) {
                    fs.unlinkSync(dest);
                    fire(cb, undefined, undefined, ErrorCode.FileError, ops, res, err);
                });
            }
        });

        req.on('error', function (err) {
            fs.unlinkSync(dest);
            fire(cb, undefined, undefined, ErrorCode.HttpError, ops, undefined, err);
        });

        var timeout = ops.timeout || 120000;
        if (timeout && timeout != -1) {
            req.setTimeout(timeout, function () {
                fire(cb, undefined, undefined, ErrorCode.Timedout, ops);
            });
        }

        return req;
    }

    extend(Q, {
        httpSetup: setup,
        http: sendHttp,
        getHttp: getHttp,
        postHttp: postHttp,
        getJSON: getJSON,
        postJSON: postJSON,
        downloadFile: downloadFile
    });
})();