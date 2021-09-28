/// <reference path="../Q.js" />
/*
* Q.node.core.js 通用处理
* author:devin87@qq.com
* update:2021/09/28 14:39
*/
(function () {
    var fs = require('fs'),
        path = require('path'),
        crypto = require('crypto'),

        extend = Q.extend;

    function mkdirSync(url, mode) {
        if (url == '..' || url == './') return;

        var fullname = path.resolve(url), last_fullname, dirs = [];
        while (!fs.existsSync(fullname) && fullname != last_fullname) {
            dirs.push(fullname);
            last_fullname = fullname;
            fullname = path.dirname(fullname);
        }
        if (dirs.length <= 0) return;

        mode = mode || 511;  //0777

        for (var i = dirs.length - 1; i >= 0; i--) {
            fs.mkdirSync(dirs[i], mode);
        }
    }

    /**
     * 递归创建文件夹，若文件夹存在，则忽略
     * @param {string} dir 文件夹路径
     */
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