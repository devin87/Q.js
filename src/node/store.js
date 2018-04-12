/// <reference path="../Q.js" />
/// <reference path="core.js" />
/*
* Q.node.store.js 读写本地JSON文件
* author:devin87@qq.com
* update:2018/02/26 18:10
*/
(function () {
    var fs = require('fs'),
        path = require('path'),

        extend = Q.extend,
        fire = Q.fire,
        isFunc = Q.isFunc,
        isObject = Q.isObject,
        mkdir = Q.mkdir;

    //自定义存储对象
    function Storage(path) {
        this.path = path;
        this.data = {};
    }

    Q.factory(Storage);

    Storage.extend({
        //初始化自定义存储数据
        init: function (cb) {
            var self = this;
            if (!self.path || !fs.existsSync(self.path)) return fire(cb, undefined, new Error("File Not Found : " + self.path));

            fs.readFile(self.path, function (err, data) {
                if (err) return fire(cb, undefined, err);

                try {
                    self.data = JSON.parse(data);
                } catch (e) {
                    return fire(cb, undefined, e);
                }

                fire(cb, undefined, undefined, self.data);
            });
        },

        //获取自定义存储数据
        get: function (key) {
            return this.data[key];
        },
        //设置自定义存储数据
        set: function (key, value) {
            this.data[key] = value;
            return this;
        },
        //移除自定义存储数据
        remove: function (key) {
            this.data[key] = undefined;
            return this;
        },
        //清空自定义存储数据
        clear: function (key) {
            this.data = {};
            return this;
        },
        //保存自定义存储数据
        save: function (cb) {
            mkdir(path.dirname(this.path));

            fs.writeFile(this.path, JSON.stringify(this.data), 'utf-8', cb || function () { });
        }
    });

    extend(Q, {
        Storage: Storage
    });
})();