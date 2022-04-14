/// <reference path="../Q.js" />
/*
* Q.node.http.js http请求(支持https)
* author:devin87@qq.com
* update:2021/11/04 16:12
*/
(function () {
    var Url = require('url'),
        querystring = require('querystring'),
        http = require('http'),
        https = require('https'),
        fs = require('fs'),
        zlib = require('zlib'),

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
        timeout: 20000,
        timeout_download: 600000
    };

    /**
     * http设置
     * @param {object} settings {ErrorCode:{},config:{}}
     */
    function setup(settings) {
        if (settings.ErrorCode) extend(ErrorCode, settings.ErrorCode, true);
        if (settings.config) extend(config, settings.config, true);
    }

    //http发送之前
    function fire_http_beforeSend(req, ops) {
        ops._begin = Date.now();

        return fire(ops.beforeSend || config.beforeSend, undefined, req, ops);
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
        if (ops._end) return;

        ops._end = Date.now();
        ops.time = ops._end - ops._begin;

        if (errCode && err && !isObject(errCode)) errCode = { code: errCode, msg: err.message };

        fire(ops.complete, undefined, result, errCode, ops, res, err);
        fire(ops.afterSend || config.afterSend, undefined, result, errCode, ops, res, err);

        if (ops.res) ops.res.end(err ? 'Error: ' + err.message : ops.response);
    }

    /**
     * 发送http请求
     * @param {string} url 请求地址
     * @param {object} ops 请求配置项 {queue,type,headers,timeout,dataType,data,opts,agent,retryCount,proxy,res,autoHeader,skipStatusCode,complete}
     * @param {number} count 当前请求次数，默认为0
     */
    function sendHttp(url, ops, count) {
        ops = ops || {};
        count = +count || 0;

        //队列接口
        if (ops.queue) {
            ops.queue.add(url, ops);
            ops.queue = undefined;
            return;
        }

        if (isFunc(ops)) ops = { complete: ops };

        ops.url = url;

        var method = ops.type || ops.method || 'GET',
            headers = ops.headers || {},
            timeout = ops.timeout || config.timeout,

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

        var myURL = Url.parse(url);

        var options = {
            hostname: myURL.hostname,
            path: myURL.path,
            port: myURL.port,
            method: method,
            headers: headers
        };

        if (ops.opts) extend(options, ops.opts);

        if (ops.agent) options.agent = ops.agent;
        if (options.agent === true) options.agent = new web.Agent();

        if (config.options) extend(options, config.options);

        ops.options = options;

        ops._end = undefined;

        var web = url.startsWith('https') ? https : http,
            req;

        var fire_timeout = function (err) {
            if (ops._end) return;

            if (req) req.abort();

            var retryCount = +ops.retryCount || 0;
            if (retryCount > 0 && ++count <= retryCount) return sendHttp(url, ops, count);

            fire_http_complete(undefined, ErrorCode.Timedout, ops, undefined, err);
        };

        req = web.request(options, function (res) {
            var buffers = [];

            var is_http_proxy = Q.def(ops.proxy, ops.res ? true : false),
                is_auto_header = Q.def(ops.autoHeader, is_http_proxy ? true : false),
                _res = ops.res;

            if (_res && !res._ended) {
                try {
                    if (is_auto_header) {
                        Object.forEach(res.headers, function (k, v) {
                            if (res.headers[k] != undefined) _res.setHeader(k, v);
                        });
                    } else {
                        var content_type = res.headers['content-type'] || 'text/html';
                        if (content_type.indexOf('charset') == -1) content_type += (content_type.endsWith(';') ? '' : ';') + 'charset=utf-8';
                        _res.setHeader('Content-Type', content_type);
                    }
                } catch (err) {
                    throw new Error(err.message + '\n' + url);
                }
            }

            var encoding = res.headers['content-encoding'];

            //代理请求
            if (is_http_proxy) {
                res.pipe(_res);
            } else {
                res.on('data', function (chunk) {
                    buffers.push(chunk);
                });
            }

            res.on('end', function () {
                if (ops.skipStatusCode !== false && res.statusCode && res.statusCode != 200) return fire_http_complete(undefined, ErrorCode.HttpError, ops, res, new Error(ops.url + ' => Invalid Status: ' + res.statusCode + (res.statusMessage ? ' ' + res.statusMessage : '')));

                var next = function (err, text) {
                    if (err) return fire_http_complete(undefined, ErrorCode.HttpError, ops, res, err);

                    ops.response = text;
                    if (!is_json) return fire_http_complete(text, undefined, ops, res);

                    var data;

                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        return fire_http_complete(undefined, ErrorCode.JSONError, ops, res, new Error(ops.url + ' => Invalid Result: ' + text));
                    }

                    fire_http_complete(data, undefined, ops, res);
                };

                var buffer = Buffer.concat(buffers);

                switch (encoding) {
                    case 'gzip': return zlib.gunzip(buffer, next);
                    case 'deflate': return zlib.inflate(buffer, next);
                    default: return next(undefined, buffer.toString('utf8'));
                }
            });
        }).on('timeout', function () {
            fire_timeout(new Error(ops.url + ' => Socket Timedout'));
        }).on('error', function (err) {
            //避免重复触发(超时后调用 req.abort 会触发此处 error 事件且 err.code 为 ECONNRESET) 
            if (ops._end) return;

            if (err.code === 'ECONNRESET' || err.code === 'EPROTO') {
                var retryCount = ops.retryCount != undefined ? +ops.retryCount || 0 : 1;
                if (++count <= retryCount) return sendHttp(url, ops, count);
            }

            fire(ops.error || config.error, this, err);
            fire_http_complete(undefined, ErrorCode.HttpError, ops, undefined, err);
        });

        if (fire_http_beforeSend(req, ops) === false) return;

        if (timeout && timeout != -1) {
            // req.setTimeout在某些环境需要双倍时间才触发超时回调
            // req.setTimeout(timeout, function () {
            //     fire_timeout(new Error(ops.url + ' => HTTP Timedout'));
            // });
            setTimeout(function () {
                fire_timeout(new Error(ops.url + ' => HTTP Timedout'));
            }, timeout);
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
            if (cb && isObject(cb)) extend(ops, cb);
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
     * @param {function} cb 回调函数(data, errCode)
     * @param {object} ops 其它配置项 {headers,timeout,opts,agent,retryCount,skipStatusCode,progress:function(total,loaded){}}
     * @param {number} count 当前请求次数，默认为0
     */
    function downloadFile(url, dest, cb, ops, count) {
        ops = ops || {};
        count = +count || 0;

        if (isObject(cb)) {
            ops = cb;
            cb = undefined;
        } else {
            ops.complete = cb;
        }

        try {
            //格式化url
            ops.url = decodeURI(url);
            url = encodeURI(ops.url);
        } catch (err) { }

        var headers = ops.headers || {},
            timeout = ops.timeout || config.timeout_download;

        if (config.headers) extend(headers, config.headers);

        var myURL = Url.parse(url);

        var options = {
            hostname: myURL.hostname,
            path: myURL.path,
            port: myURL.port,
            headers: headers
        };

        if (ops.opts) extend(options, ops.opts);

        if (ops.agent) options.agent = ops.agent;
        if (options.agent === true) options.agent = new web.Agent();

        if (config.options) extend(options, config.options);

        ops.options = options;

        var web = url.startsWith('https') ? https : http,
            total = 0,
            loaded = 0,
            req;

        var fire_timeout = function (err) {
            if (ops._end) return;

            if (req) req.abort();

            var retryCount = +ops.retryCount || 0;
            if (retryCount > 0 && ++count <= retryCount) return sendHttp(url, ops, count);

            fire_http_complete(undefined, ErrorCode.Timedout, ops, undefined, err);
        };

        req = web.get(options, function (res) {
            if (ops.skipStatusCode !== false && res.statusCode && res.statusCode != 200) return fire_http_complete(undefined, ErrorCode.HttpError, ops, res, new Error(ops.url + ' => Invalid Status: ' + res.statusCode + (res.statusMessage ? ' ' + res.statusMessage : '')));

            var file = fs.createWriteStream(dest);
            res.pipe(file);

            file.on('finish', function () {
                file.close(function () {
                    fire_http_complete(undefined, undefined, ops, res);
                });
            });

            file.on('error', function (err) {
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                fire_http_complete(undefined, ErrorCode.FileError, ops, res, err);
            });

            if (ops.progress) {
                //获取文件长度
                total = +res.headers['content-length'] || 0;
                fire(ops.progress, res, total, loaded);

                //下载进度
                res.on('data', function (chunk) {
                    loaded += chunk.length;
                    fire(ops.progress, res, total, loaded);
                });
            }
        }).on('timeout', function () {
            fire_timeout(new Error(ops.url + ' => Socket Timedout'));
        }).on('error', function (err) {
            //避免重复触发(超时后调用 req.abort 会触发此处 error 事件且 err.code 为 ECONNRESET) 
            if (ops._end) return;

            if (fs.existsSync(dest)) fs.unlinkSync(dest);

            if (err.code === 'ECONNRESET' || err.code === 'EPROTO') {
                var retryCount = ops.retryCount != undefined ? +ops.retryCount || 0 : 1;
                if (++count <= retryCount) return downloadFile(url, dest, cb, ops, count);
            }

            fire(ops.error || config.error, this, err);
            fire_http_complete(undefined, ErrorCode.HttpError, ops, undefined, err);
        });

        if (fire_http_beforeSend(req, ops) === false) return;

        if (timeout && timeout != -1) {
            // req.setTimeout(timeout, function () {
            //     fire_timeout(new Error(ops.url + ' => HTTP Timedout'));
            // });
            setTimeout(function () {
                fire_timeout(new Error(ops.url + ' => HTTP Timedout'));
            }, timeout);
        }

        return req;
    }

    /**
     * 将 http 请求转为 curl命令
     * @param {string} url 
     * @param {object} ops 请求配置项 {type,headers,timeout,data,ua,auth,cookie,keepalive,enableRedirect,maxRedirects,iface,proxy}
     * @returns {string}
     */
    function http2curl(url, ops) {
        ops = ops || {};

        var method = ops.type || ops.method || 'GET',
            headers = ops.headers || {},
            timeout = ops.timeout || config.timeout,

            is_http_get = method == 'GET',
            is_http_post = method == 'POST',

            data = ops.data,
            post_data = '';

        if (is_http_post) {
            if (data) post_data = typeof data == 'string' ? data : querystring.stringify(data);
        } else {
            if (data) url = Q.join(url, data);
        }

        if (config.headers) extend(headers, config.headers);

        var curl = ['curl -X ' + method];

        //启用服务器重定向
        if (ops.enableRedirect && is_http_get) {
            curl.push('-L');

            //最大重定向次数
            var maxRedirects = +ops.maxRedirects || 3;
            curl.push('--max-redirs ' + maxRedirects);
        }

        //跳过 ssl 检测
        if (ops.skipSSL) curl.push('-k');

        //静默输出（不显示进度信息）
        if (ops.silent !== false) curl.push('-s');

        //显示错误（即使启用了静默模式）
        if (ops.showError !== false) curl.push('-S');

        //引用地址
        if (ops.referer) curl.push('-e "' + ops.referer + '"');

        //用户和密码
        var dataAuth = ops.auth;
        if (dataAuth && dataAuth.user) curl.push('-u ' + dataAuth.user.replace(/"/g, '\\"') + ':' + (dataAuth.passwd || '').replace(/"/g, '\\"'));

        //请求范围
        if (ops.range) curl.push('-r ' + ops.range);

        //HEAD请求
        if (ops.isHead) curl.push('-I');

        curl.push('"' + url + '"');

        if (is_http_post) curl.push('-d "' + post_data + '"');

        //设置 UserAgent eg: curl -A 'myua' url
        if (ops.ua) curl.push('-A "' + ops.ua.replace(/"/g, '\\"') + '"');

        //设置 Cookie eg: curl -b 'a=1;b=2' url
        if (ops.cookie && typeof ops.cookie == 'string') curl.push('-b "' + ops.cookie.replace(/"/g, '\\"') + '"');

        //设置网卡
        if (ops.iface) curl.push('--interface "' + ops.iface + '"');

        //设置代理
        if (ops.proxy) curl.push('--proxy "' + ops.proxy + '"');

        if (timeout) curl.push('--max-time ' + Math.round(timeout / 1000));
        if (ops.keepalive === false) curl.push('--no-keepalive');

        //curl 其它参数，多个之间用空格分开
        if (ops.curlArgs) curl.push(ops.curlArgs);

        Object.forEach(headers, function (k, v) {
            curl.push('-H "' + k + ':' + v + '"');
        });

        return curl.join(' ');
    }

    extend(Q, {
        httpSetup: setup,

        http: sendHttp,
        getHttp: getHttp,
        postHttp: postHttp,
        getJSON: getJSON,
        postJSON: postJSON,

        downloadFile: downloadFile,
        http2curl: http2curl
    });
})();