/// <reference path="../Q.js" />
/*
* Q.node.core.js 通用处理
* author:devin87@qq.com
* update:2018/04/24 11:47
*/
(function () {
    var fs = require('fs'),
        path = require('path'),
        crypto = require('crypto'),

        extend = Q.extend,
        fire = Q.fire,
        isFunc = Q.isFunc,
        isObject = Q.isObject;

    //规格化路径
    function normalize_path(_path) {
        var pathname = path.normalize(_path);
        return pathname != "\\" && pathname.endsWith("\\") ? pathname.slice(0, -1) : pathname;
    }

    //创建目录
    function mkdirSync(url, mode, callback) {
        if (url == "..") return callback && callback();

        url = normalize_path(url);
        var arr = url.split("\\");

        //处理 ./aaa
        if (arr[0] === ".") arr.shift();

        //处理 ../ddd/d
        if (arr[0] == "..") arr.splice(0, 2, arr[0] + "\\" + arr[1]);

        mode = mode || 493;  //0755

        function inner(dir) {
            //不存在就创建一个
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, mode);

            if (arr.length) {
                inner(dir + "\\" + arr.shift());
            } else {
                callback && callback();
            }
        }

        arr.length && inner(arr.shift());
    }

    //确保文件夹存在
    function mkdir(dir) {
        if (!fs.existsSync(dir)) mkdirSync(dir);
    }

    //创建文件夹优先使用 fs-extra 方法
    try {
        var fse = require('fs-extra');
        if (fse) {
            mkdir = function mkdir(dir) {
                if (!fs.existsSync(dir)) fse.mkdirsSync(dir);
            };
        }
    } catch (e) { }

    /**
     * 计算文本md5值
     * @param {string} text
     */
    function computeMd5(text) {
        return crypto.createHash('md5').update(text, 'utf8').digest('hex');
    }

    extend(Q, {
        mkdir: mkdir,
        md5: computeMd5
    });
})();