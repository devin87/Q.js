/*
* Q.query.speedTest.js Q.query独立运行支持库
* author:devin87@qq.com  
* update:2015/06/11 10:30
*/
(function () {
    if (!String.prototype.trim) {
        String.prototype.trim = function () {
            //return this.replace(/^\s+|\s+$/g, "");

            var str = "" + this,
                str = str.replace(/^\s\s*/, ""),
                ws = /\s/,
                i = str.length;

            while (ws.test(str.charAt(--i))) { };

            return str.slice(0, i + 1);
        };
    }

    //转为数组
    //将 NodeList 转为 Array
    var makeArray = (function () {
        try {
            slice.call(document.documentElement.childNodes);

            return function (obj, from) {
                return slice.call(obj, from);
            }
        } catch (e) {
            return function (obj, from) {
                var tmp = [];

                for (var i = from || 0, len = obj.length; i < len; i++) {
                    tmp.push(obj[i]);
                }

                return tmp;
            };
        }
    })();

    window.Q = {
        makeArray: makeArray
    };
})();