/*
* Q.js (包括 通用方法、原生对象扩展 等) for browser or Node.js
* https://github.com/devin87/Q.js
* author:devin87@qq.com  
* update:2016/01/14 10:35
*/
(function (undefined) {
    "use strict";

    //Node.js中闭包外部this并非global eg:(function(g){})(this); //this not global
    //严格模式下this不指向全局变量
    var GLOBAL = typeof global == "object" ? global : window,

        toString = Object.prototype.toString,
        has = Object.prototype.hasOwnProperty,
        slice = Array.prototype.slice;

    //严格模式与window识别检测
    function detect_strict_mode() {
        var f = function (arg) {
            arguments[0] = 1;

            return arg != arguments[0];
        };

        return f(0);
    }

    //是否严格模式
    var is_strict_mode = detect_strict_mode(),
        is_window_mode = GLOBAL == GLOBAL.window;

    //返回对象的类型(小写)
    function getType(obj) {
        if (obj == undefined) return "" + obj;

        //内置函数,性能最好 (注意：safari querySelectorAll返回值类型为function)
        if (typeof obj !== "object" && typeof obj !== "function") return typeof obj;

        //非window模式(Node)下禁用以下检测
        if (is_window_mode) {
            if (typeof obj.nodeType === "number") return "node";

            if (typeof obj.length === "number") {
                //严格模式禁止使用 arguments.callee,调用会报错
                //IE9+等使用 toString.call 会返回 [object Arguments],此为兼容低版本IE
                if (!is_strict_mode && obj.callee) return "arguments";

                //IE9+等使用 toString.call 会返回 [object Window],此为兼容低版本IE
                if (obj == obj.window) return "window";

                //document.getElementsByTagName("*") => HTMLCollection
                //document.querySelectorAll("*")     => NodeList
                //此处统一为 list
                if (obj.item) return "list";
            }
        }

        //在某些最新的浏览器中(IE11、Firefox、Chrome)性能与hash读取差不多 eg: return class2type[toString.call(obj)];
        return toString.call(obj).slice(8, -1).toLowerCase();
    }

    //检测是否为函数
    function isFunc(fn) {
        //在IE11兼容模式（ie6-8）下存在bug,当调用次数过多时可能返回不正确的结果
        //return typeof fn == "function";

        return toString.call(fn) === "[object Function]";
    }

    //检测是否为对象
    function isObject(obj) {
        //typeof null => object
        //toString.call(null) => [object Object]

        return obj && toString.call(obj) === "[object Object]";
    }

    //检测是否为数组
    function isArray(obj) {
        return toString.call(obj) === "[object Array]";
    }

    //检测是否为数组或类数组
    function isArrayLike(obj) {
        var type = getType(obj);

        return type == "array" || type == "list" || type == "arguments";
    }

    //若value不为undefine,则返回value;否则返回defValue
    function def(value, defValue) {
        return value !== undefined ? value : defValue;
    }

    //检测是否为数字
    function isNum(n, min, max) {
        if (typeof n != "number") return false;

        if (min != undefined && n < min) return false;
        if (max != undefined && n > max) return false;

        return true;
    }

    //检测是否为大于0的数字
    function isUNum(n) {
        return n !== 0 && isNum(n, 0);
    }

    //检测是否为整数
    function isInt(n, min, max) {
        return isNum(n, min, max) && n === Math.floor(n);
    }

    //检测是否为大于0的整数
    function isUInt(n) {
        return isInt(n, 1);
    }

    //判断字符串是否是符合条件的数字
    function checkNum(str, min, max) {
        return !isNaN(str) && isNum(+str, min, max);
    }

    //判断字符串是否是符合条件的整数
    function checkInt(str, min, max) {
        return !isNaN(str) && isInt(+str, min, max);
    }

    //将字符串转为大写,若str不是字符串,则返回defValue
    function toUpper(str, defValue) {
        return typeof str == "string" ? str.toUpperCase() : defValue;
    }

    //将字符串转为小写,若str不是字符串,则返回defValue
    function toLower(str, defValue) {
        return typeof str == "string" ? str.toLowerCase() : defValue;
    }

    //转为数组
    function toArray(obj, from) {
        var tmp = [];

        for (var i = from || 0, len = obj.length; i < len; i++) {
            tmp.push(obj[i]);
        }

        return tmp;
    }

    //将 NodeList 转为 Array
    var makeArrayNode = (function () {
        try {
            slice.call(document.documentElement.childNodes);

            return function (obj, from) {
                return slice.call(obj, from);
            }
        } catch (e) {
            return toArray;
        }
    })();

    //将类数组对象转为数组,若对象不存在,则返回空数组
    function makeArray(obj, from) {
        if (obj == undefined) return [];

        switch (getType(obj)) {
            case "array": return from ? obj.slice(from) : obj;
            case "list": return makeArrayNode(obj, from);
            case "arguments": return slice.call(obj, from);
        }

        return [obj];
    }

    //按条件产生数组 arr(5,2,2) => [2,4,6,8,10]
    //eg:按1-10项产生斐波那契数列 =>arr(10, function (value, i, list) { return i > 1 ? list[i - 1] + list[i - 2] : 1; })
    //length:数组长度
    //value:数组项的初始值
    //step:递增值或处理函数(当前值,索引,当前产生的数组)
    function arr(length, value, step) {
        if (isFunc(value)) {
            step = value;
            value = 0;
        }
        if (value == undefined) value = 0;
        if (step == undefined) step = 1;

        var list = [], i = 0;

        if (isFunc(step)) {
            while (i < length) {
                value = step(value, i, list);
                list.push(value);
                i++;
            }
        } else {
            while (i < length) {
                list.push(value);
                value += step;
                i++;
            }
        }

        return list;
    }

    //根据指定的键或索引抽取数组项的值
    //eg:vals([{id:1},{id:2}], "id")  =>  [1,2]
    //eg:vals([[1,"a"],[2,"b"]], 1)   =>  ["a","b"]
    //skipUndefined:是否跳过值不存在的项,默认为true
    function vals(list, prop, skipUndefined) {
        if (!list) return [];

        skipUndefined = skipUndefined !== false;

        var len = list.length,
            i = 0,
            item,
            tmp = [];

        for (; i < len; i++) {
            item = list[i];
            if ((item && item[prop] != undefined) || !skipUndefined) tmp.push(item[prop]);
        }

        return tmp;
    }

    //prototype 别名 eg:alias(Array,"forEach","each");
    function alias(obj, name, aliasName) {
        if (!obj || !obj.prototype) return;

        var prototype = obj.prototype;

        if (typeof name == "string") {
            prototype[aliasName] = prototype[name];
        } else {
            for (var key in name) {
                if (has.call(name, key) && has.call(prototype, key)) prototype[name[key]] = prototype[key];
            }
        }

        return obj;
    }

    //扩展对象
    //forced:是否强制扩展
    function extend(destination, source, forced) {
        if (!destination || !source) return destination;

        for (var key in source) {
            if (key == undefined || !has.call(source, key)) continue;

            if (forced || destination[key] === undefined) destination[key] = source[key];
        }
        return destination;
    }

    //数据克隆（for undefined、null、string、number、boolean、array、object）
    function clone(data) {
        if (!data) return data;

        switch (typeof data) {
            case "string":
            case "number":
            case "boolean":
                return data;
        }

        var result;

        if (isArray(data)) {
            result = [];
            for (var i = 0, len = data.length; i < len; i++) {
                result[i] = clone(data[i]);
            }
        } else if (isObject(data)) {
            result = {};
            for (var key in data) {
                if (has.call(data, key)) result[key] = clone(data[key]);
            }
        }

        return result;
    }

    //将数组或类数组转换为键值对
    //fv:默认值(fv可为处理函数,该函数返回一个长度为2的数组 eg:[key,value])
    //ignoreCase:键是否忽略大小写(如果是,则默认小写)
    function toMap(list, fv, ignoreCase) {
        if (!list) return;

        var map = {},
            isFn = isFunc(fv),
            hasValue = fv !== undefined;

        for (var i = 0, len = list.length; i < len; i++) {
            var key = list[i], value;
            if (key == undefined) continue;

            if (isFn) {
                var kv = fv.call(list, key, i);
                if (!kv) continue;

                key = kv[0];
                value = kv[1];
            } else {
                value = hasValue ? fv : i;
            }

            map[ignoreCase ? key.toLowerCase() : key] = value;
        }

        return map;
    }

    //将对象数组转换为键值对
    //keyProp:对象中作为键的属性
    //valueProp:对象中作为值的属性,若为空,则值为对象本身;为true时同isBuildIndex
    //isBuildIndex:是否给对象添加index属性,值为对象在数组中的索引
    function toObjectMap(list, keyProp, valueProp, isBuildIndex) {
        if (!list) return;

        if (valueProp === true) {
            isBuildIndex = valueProp;
            valueProp = undefined;
        }

        var map = {};

        for (var i = 0, len = list.length; i < len; i++) {
            var obj = list[i];
            if (!obj || typeof obj != "object") continue;

            if (isBuildIndex) obj.index = i;

            map[obj[keyProp]] = valueProp ? obj[valueProp] : obj;
        }

        return map;
    }

    //按字符串排序
    function sortString(list, prop, desc) {
        if (desc) list.sort(function (a, b) { return -(a[prop] || "").localeCompare(b[prop] || ""); });
        else list.sort(function (a, b) { return (a[prop] || "").localeCompare(b[prop] || ""); });
    }

    //按数字排序
    function sortNumber(list, prop, desc) {
        if (desc) list.sort(function (a, b) { return b[prop] - a[prop]; });
        else list.sort(function (a, b) { return a[prop] - b[prop]; });
    }

    //按日期排序
    function sortDate(list, prop, desc) {
        list.sort(function (a, b) {
            var v1 = a[prop], v2 = b[prop];
            if (v1 == v2) return 0;

            var d1 = Date.from(v1), d2 = Date.from(v2), rv = 0;

            if (d1 != INVALID_DATE && d2 != INVALID_DATE) rv = d1 - d2;
            else if (d1 == INVALID_DATE && d2 != INVALID_DATE) rv = -1;
            else if (d1 != INVALID_DATE && d2 == INVALID_DATE) rv = 1;

            return desc ? -rv : rv;
        });
    }

    //对象数组排序
    //type:排序类型 0:字符串排序|1:数字排序|2:日期排序
    function sortList(list, type, prop, desc) {
        switch (type) {
            case 1: sortNumber(list, prop, desc); break;
            case 2: sortDate(list, prop, desc); break;
            default: sortString(list, prop, desc); break;
        }
    }

    //返回一个绑定到指定作用域的新函数
    function proxy(fn, bind) {
        if (isObject(fn)) {
            var name = bind;
            bind = fn;
            fn = bind[name];
        }

        return function () {
            fn.apply(bind, arguments);
        }
    }

    //触发指定函数,如果函数不存在,则不触发 eg:fire(fn,this,arg1,arg2)
    function fire(fn, bind) {
        if (fn != undefined) return fn.apply(bind, slice.call(arguments, 2));
    }

    //延迟执行,若fn未定义,则忽略 eg:delay(fn,this,10,[arg1,arg2])
    //注意:若传入args,则args必须为数组
    function delay(fn, bind, time, args) {
        if (fn == undefined) return;

        return setTimeout(function () {
            //ie6-7,apply第二个参数不能为空,否则报错
            fn.apply(bind, args || []);
        }, def(time, 20));
    }

    //异步执行,相当于setTimeout,但会检查fn是否可用 eg:async(fn,10,arg1,arg2)
    function async(fn, time) {
        return isFunc(fn) && delay(fn, undefined, time, slice.call(arguments, 2));
    }

    //等待达到条件或超时时,执行一个回调函数 callback(ops,timedout)
    function _waitFor(ops) {
        var now_time = +new Date,

            timeout = ops.timeout,  //超时时间
            timedout = timeout && now_time - ops.startTime > timeout;  //是否超时

        //若未超时且未达到条件,则继续等待
        if (!timedout && !ops.check(ops)) {
            ops.count++;

            return async(_waitFor, ops.sleep, ops);
        }

        ops.endTime = now_time;
        ops.callback(ops, timedout);
    }

    //等待达到条件或超时时,执行一个回调函数 callback(ops,timedout)
    //timeout:超时时间(单位:ms),默认10000ms
    //sleep:每次休眠间隔(单位:ms),默认20ms
    function waitFor(check, callback, timeout, sleep) {
        _waitFor({
            check: check,
            callback: callback,
            timeout: timeout,
            sleep: sleep,

            count: 0,
            startTime: +new Date
        });
    };

    //遍历数组或类数组
    //与浏览器实现保持一致(忽略未初始化的项,注意:ie8及以下会忽略数组中 undefined 项)
    function each_array(list, fn, bind) {
        for (var i = 0, len = list.length; i < len; i++) {
            if (i in list) fn.call(bind, list[i], i, list);
        }
    }

    //简单通用工厂,取自mootools
    function factory(init) {
        var obj = init;

        obj.constructor = factory;
        obj.prototype.constructor = obj;

        //prototype扩展
        obj.extend = function (source, forced) {
            extend(this.prototype, source, forced);
        };

        //函数别名
        obj.alias = function (name, aliasName) {
            alias(this, name, aliasName);
        };

        return obj;
    };

    /*
    * extend.js:JavaScript核心对象扩展
    */
    each_array([String, Array, Number, Boolean, Function, Date, RegExp], factory);

    //----------------------------- Object extend -----------------------------

    //扩展Object
    extend(Object, {
        //创建一个拥有指定原型的对象,未实现第二个参数
        create: function (o) {
            var F = function () { };
            F.prototype = o;
            return new F();
        },

        //遍历对象
        forEach: function (obj, fn, bind) {
            for (var key in obj) {
                if (has.call(obj, key)) fn.call(bind, key, obj[key], obj);
            }
        },

        //获取对象所有键
        keys: function (obj) {
            var tmp = [];

            //注意:for in 在ie6下无法枚举 propertyIsEnumerable,isPrototypeOf,hasOwnProperty,toLocaleString,toString,valueOf,constructor 等属性
            //尽量不要使用上述属性作为键
            for (var key in obj) {
                if (has.call(obj, key)) tmp.push(key);
            }

            return tmp;
        },
        //获取对象所有值
        values: function (obj) {
            var tmp = [];

            for (var key in obj) {
                if (has.call(obj, key)) tmp.push(obj[key]);
            }

            return tmp;
        },

        //获取项数量
        size: function (obj) {
            var count = 0;

            for (var key in obj) {
                if (has.call(obj, key)) count++;
            }

            return count;
        },

        //对象是否拥有子项
        hasItem: function (obj) {
            for (var key in obj) {
                if (has.call(obj, key)) return true;
            }

            return false;
        }
    });

    //----------------------------- String extend -----------------------------

    //String原型扩展(已标准化,此为兼容浏览器原生方法)
    String.extend({
        //去掉首尾空格
        trim: function () {
            //return this.replace(/^\s+|\s+$/g, "");

            var str = "" + this,
                str = str.replace(/^\s\s*/, ""),
                ws = /\s/,
                i = str.length;

            while (ws.test(str.charAt(--i))) { };

            return str.slice(0, i + 1);
        },
        //返回将本身重复n次的字符串 eg:"abc".repeat(2) => "abcabc"
        repeat: function (n) {
            //if (n < 1) return "";

            //return new Array(n + 1).join(this);

            //二分法,性能大大提升
            var str = "" + this,
                total = "";

            while (n > 0) {
                if (n % 2 == 1) total += str;
                if (n == 1) break;

                str += str;
                n >>= 1;
            }

            return total;
        },
        //是否以指定字符串开头
        startsWith: function (str, index) {
            var s = "" + this;

            return s.substr(index || 0, str.length) === str;
        },
        //是否以指定字符串结尾
        endsWith: function (str, index) {
            var s = "" + this,
                end = index == undefined || index > s.length ? s.length : index;

            return s.substr(end - str.length, str.length) === str;
        },
        //是否包含指定字符串
        contains: function (str, index) {
            return this.indexOf(str, index) != -1;
        }
    });

    //String原型扩展
    String.extend({
        //删除指定字符串
        //pattern:要删除的字符串或正则表达式
        //flags:正则表达式标记,默认为g
        drop: function (pattern, flags) {
            var regexp = typeof pattern == "string" ? new RegExp(pattern, flags || "g") : pattern;
            return this.replace(regexp, "");
        },
        //字符串反转
        reverse: function () {
            return this.split("").reverse().join("");
        },
        //转为html输出(html编码) eg:\n => <br/>
        toHtml: function () {
            return this.replace(/\x26/g, "&amp;").replace(/\x3c/g, "&lt;").replace(/\x3e/g, "&gt;").replace(/\r?\n|\r/g, "<br/>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;").replace(/\s/g, "&nbsp;");
        },
        //转为text输出(html解码) eg:<br/> => \n
        toText: function () {
            return this.replace(/<br[^>]*>/ig, "\n").replace(/<script[^>]*>([^~]|~)+?<\/script>/gi, "").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
        }
    });

    String.alias({
        toHtml: "htmlEncode",
        toText: "htmlDecode"
    });

    //----------------------------- Number extend -----------------------------

    //Number原型扩展
    Number.extend({
        //将数字按长度和进制转换为一个长度不低于自身的字符串 eg:(13).format(4) ->'0013'
        //(13).format(1) -> '13'   (13).format(4, 16)->'000d'   (13).format(4, 2) ->'1101'
        format: function (length, radix) {
            var str = this.toString(radix || 10), fix = length - str.length;
            return (fix > 0 ? "0".repeat(fix) : "") + str;
        }
    });

    //----------------------------- Array extend -----------------------------

    //Array原型扩展(已标准化,此为兼容浏览器原生方法)
    //与浏览器实现保持一致(忽略未初始化的项,注意:ie8及以下会忽略数组中 undefined 项)
    //部分函数未做参数有效性检测,传参时需注意
    Array.extend({
        //迭代器:用函数(fn)处理数组的每一项
        forEach: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) fn.call(bind, self[i], i, self);
            }
        },
        //迭代器:返回经过函数(fn)处理后的新数组
        map: function (fn, bind) {
            var self = this, tmp = [];
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) tmp.push(fn.call(bind, self[i], i, self));
            }
            return tmp;
        },
        //查找方法(顺序)
        indexOf: function (item, index) {
            var self = this, len = self.length, i;
            if (len == 0) return -1;

            if (index == undefined) i = 0;
            else {
                i = Number(index);
                if (i < 0) i = Math.max(i + len, 0);
            }

            for (; i < len; i++) {
                if (i in self && self[i] === item) return i;
            }
            return -1;
        },
        //查找方法(倒序)
        lastIndexOf: function (item, index) {
            var self = this, len = self.length, i;
            if (len == 0) return -1;

            if (index == undefined) i = len - 1;
            else {
                i = Number(index);
                i = i >= 0 ? Math.min(i, len - 1) : i + len;
            }

            for (; i >= 0; i--) {
                if (i in self && self[i] === item) return i;
            }
            return -1;
        },
        //将所有在给定过滤函数中过滤通过的数组项创建一个新数组
        filter: function (fn, bind) {
            var self = this, tmp = [];
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self) {
                    var val = self[i];
                    if (fn.call(bind, val, i, self)) tmp.push(val);
                }
            }
            return tmp;
        },
        //如果数组中的每一项都通过给定函数的测试,则返回true
        every: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self && !fn.call(bind, self[i], i, self)) return false;
            }
            return true;
        },
        //如果数组中至少有一个项通过了给出的函数的测试,则返回true
        some: function (fn, bind) {
            var self = this;
            for (var i = 0, len = self.length; i < len; i++) {
                if (i in self && fn.call(bind, self[i], i, self)) return true;
            }
            return false;
        }
    });

    //Array原型扩展
    Array.extend({
        //数组中是否存在指定的项
        contains: function (item, index) {
            return this.indexOf(item, index) !== -1;
        },
        //获取数组项
        //若index小于0,则从右往左获取
        get: function (index) {
            if (index >= 0) return this[index];

            index += this.length;
            return index >= 0 ? this[index] : undefined;
        },
        //获取数组第一项
        first: function () {
            return this.get(0);
        },
        //获取数组最后一项
        last: function () {
            return this.get(-1);
        },
        //根据索引删除数组中的项
        del: function (index, n) {
            return this.splice(index, n || 1);
        },
        //去掉数组中的重复项 eg:[0,"0",false,null,undefined] 不支持的特殊情况:[ new String(1), new Number(1) ]
        //如果是对象数组,可以指定对象的键 eg:[{id:1},{id:2}] -> ret.unique("id")
        unique: function (prop) {
            var ret = this, tmp = [], hash = {};

            for (var i = 0, len = ret.length; i < len; i++) {
                var item = ret[i],
                    value = prop ? item[prop] : item,
                    key = typeof (value) + value;  //typeof -> toString.call,性能略有下降

                if (!hash[key]) {
                    tmp.push(item);
                    hash[key] = true;
                }
            }

            return tmp;
        },
        //去掉空的项,并返回一个新数组
        clean: function () {
            var ret = this, tmp = [];

            for (var i = 0, len = ret.length; i < len; i++) {
                if (ret[i] != undefined) tmp.push(ret[i]);
            }

            return tmp;
        },
        //根据指定的键或索引抽取数组项的值 
        //eg:[{id:1},{id:2}]    ->  ret.items("id") => [1,2]
        //eg:[[1,"a"],[2,"b"]]  ->  ret.items(1)    => ["a","b"]
        items: function (prop, skipUndefined) {
            return vals(this, prop, skipUndefined);
        },
        //将数组转换为键值对
        //value:若为空,则使用数组索引;为处理函数,需返回包含键值的数组 eg: value(item,i) => [key,value]
        toMap: function (value, ignoreCase) {
            return toMap(this, value, ignoreCase);
        },
        //将对象数组转换为键值对
        //keyProp:对象中作为键的属性
        //valueProp:对象中作为值的属性,若为空,则值为对象本身;为true时同isBuildIndex
        //isBuildIndex:是否给对象添加index属性,值为对象在数组中的索引
        toObjectMap: function (keyProp, valueProp, isBuildIndex) {
            return toObjectMap(this, keyProp, valueProp, isBuildIndex);
        }
    });

    //Array静态方法扩展(已标准化,此为兼容浏览器原生方法)
    extend(Array, {
        forEach: each_array,

        isArray: isArray
    });

    //----------------------------- Date extend -----------------------------

    var DATE_REPLACEMENTS = [/y{2,4}/, /M{1,2}/, /d{1,2}/, /H{1,2}|h{1,2}/, /m{1,2}/, /s{1,2}/, /S/, /W/, /AP/],
        FIX_TIMEZONEOFFSET = new Date().getTimezoneOffset(),

        WEEKS = "日一二三四五六".split(""),
        APS = ["上午", "下午"],

        INVALID_DATE = new Date(""),

        DATE_FNS = ["getFullYear", "getMonth", "getDate", "getHours", "getMinutes", "getSeconds", "getMilliseconds", "getDay", "getHours"];

    //获取指定part形式表示的日期
    function format_date(part, t) {
        switch (part) {
            case "d": case "day": return t / 86400000;
            case "h": case "hour": return t / 3600000;
            case "m": case "minute": return t / 60000;
            case "s": case "second": return t / 1000;
        }
        return t;
    }

    //Date原型扩展
    Date.extend({
        //是否有效日期
        isValid: function () {
            return !isNaN(this.valueOf());
        },
        //格式化日期显示 eg:(new Date()).format("yyyy-MM-dd hh:mm:ss");
        format: function (format, lang) {
            lang = lang || {};

            if (!this.isValid()) return lang.invalid || "--";

            var months = lang.months,
                weeks = lang.weeks || WEEKS,
                aps = lang.aps || APS,

                len = DATE_REPLACEMENTS.length,
                i = 0;

            for (; i < len; i++) {
                var re_date = DATE_REPLACEMENTS[i], n = this[DATE_FNS[i]]();

                format = format.replace(re_date, function (match) {
                    var length = match.length;

                    //上午|下午
                    if (i == 8) return aps[n > 12 ? 1 : 0];

                    //星期
                    if (i == 7) return weeks[n];

                    //月份
                    if (i == 1) {
                        if (months) return months[n];

                        //月份索引从0开始,此处加1
                        n++;
                    }

                    //12小时制
                    if (i == 3 && match.charAt(0) == "h" && n > 12) n -= 12;

                    //匹配的长度为1时,直接转为字符串输出 H -> 9|19
                    if (length == 1) return "" + n;

                    //按照指定的长度输出字符串(从右往左截取)
                    return ("00" + n).slice(-length);
                });
            }

            return format;
        },
        //通过将一个时间间隔与指定 date 的指定 part 相加，返回一个新的 Date 值
        add: function (part, n) {
            var date = this;
            switch (part) {
                case "y": case "year": date.setFullYear(date.getFullYear() + n); break;
                case "M": case "month": date.setMonth(date.getMonth() + n); break;
                case "d": case "day": date.setDate(date.getDate() + n); break;
                case "h": case "hour": date.setHours(date.getHours() + n); break;
                case "m": case "minute": date.setMinutes(date.getMinutes() + n); break;
                case "s": case "second": date.setSeconds(date.getSeconds() + n); break;
                case "ms": case "millisecond": date.setMilliseconds(date.getMilliseconds() + n); break;
            }
            return date;
        },
        //返回两个指定日期之间所跨的日期或时间 part 边界的数目
        diff: function (part, date) {
            return format_date(part, this - date);
        },
        //从UTC时间转为本地时间
        fromUTC: function () {
            this.setMinutes(this.getMinutes() - FIX_TIMEZONEOFFSET);
            return this;
        },
        //转为UTC时间
        toUTC: function () {
            this.setMinutes(this.getMinutes() + FIX_TIMEZONEOFFSET);
            return this;
        },
        //返回一个日期副本,对该副本所做的修改,不会同步到原日期
        clone: function () {
            return new Date(this.getTime());
        }
    });

    //Date静态方法扩展(已标准化,此为兼容浏览器原生方法)
    extend(Date, {
        //获取当前日期和时间所代表的毫秒数
        now: function () {
            return +new Date;
        }
    });

    //Date静态方法扩展
    extend(Date, {
        //将字符串解析为Date对象
        from: function (s) {
            if (typeof s == "number") return new Date(s);
            if (typeof s == "string") {
                if (!s) return INVALID_DATE;

                //将年、月、横线(-)替换为斜线(/),将时、分替换为冒号(:),去掉日、号、秒
                //var ds = s.replace(/[-\u5e74\u6708]/g, "/").replace(/[\u65f6\u5206\u70b9]/g, ":").replace(/[T\u65e5\u53f7\u79d2]/g, ""), date = new Date(ds);
                var isUTC = s.slice(s.length - 1) == "Z",
                    ds = s.replace(/[-\u5e74\u6708]/g, "/").replace(/[\u65f6\u5206\u70b9]/g, ":").replace("T", " ").replace(/[Z\u65e5\u53f7\u79d2]/g, ""),
                    //毫秒检测
                    index = ds.lastIndexOf("."),
                    date,
                    ms;

                if (index != -1) {
                    ms = +ds.slice(index + 1);
                    ds = ds.slice(0, index);
                }

                date = new Date(ds);

                //兼容只有年月的情况 eg:2014/11
                if (!date.isValid() && ds.indexOf("/") > 0) {
                    var ps = ds.split(' '),
                        s_date = (ps[0] + (ps[0].endsWith("/") ? "" : "/") + "1/1").split('/').slice(0, 3).join("/");

                    date = new Date(s_date + ' ' + (ps[1] || ""));
                }

                //设置毫秒
                if (ms) date.setMilliseconds(ms);

                return date.isValid() ? (isUTC ? date.fromUTC() : date) : s;
            }

            return toString.call(s) == "[object Date]" ? s : INVALID_DATE;
        },

        //获取秒转化的时间部分
        parts: function (t) {
            var days = 0, hours = 0, mintues = 0;

            days = Math.floor(t / 86400);
            if (days > 0) t -= days * 86400;

            hours = Math.floor(t / 3600);
            if (hours > 0) t -= hours * 3600;

            mintues = Math.floor(t / 60);
            if (mintues > 0) t -= mintues * 60;

            return { days: days, hours: hours, mintues: mintues, seconds: t };
        },

        //计算时间t所代表的总数
        total: format_date
    });

    //---------------------- 事件监听器 ----------------------

    //自定义事件监听器
    //types:自定义事件列表
    //bind:事件函数绑定的上下文 eg:fn.call(bind)
    function Listener(types, bind) {
        var self = this;

        self.map = {};
        self.bind = bind;

        types.forEach(function (type) {
            self.map[type] = [];
        });
    }

    Listener.prototype = {
        constructor: Listener,

        //添加自定义事件 eg:listener.add("start",fn);
        add: function (type, fn) {
            var map = this.map;

            if (typeof type == "string") {
                if (isFunc(fn)) map[type].push(fn);
            } else if (isObject(type)) {
                Object.forEach(type, function (k, v) {
                    if (map[k] && isFunc(v)) map[k].push(v);
                });
            }

            return this;
        },
        //移除自定义事件,若fn为空,则移除该类型下的所有事件
        remove: function (type, fn) {
            if (fn != undefined) {
                var list = this.map[type], i = list.length;
                while (--i >= 0) {
                    if (list[i] == fn) list = list.splice(i, 1);
                }
            } else {
                this.map[type] = [];
            }

            return this;
        },
        //触发自定义事件 eg:listener.trigger("click",args);
        trigger: function (type, args) {
            var self = this,
                list = self.map[type],
                len = list.length,
                i = 0;

            for (; i < len; i++) {
                if (list[i].apply(self.bind, [].concat(args)) === false) break;
            }

            return self;
        }
    };

    //---------------------- 其它 ----------------------

    //正则验证
    var RE_MAIL = /^[\w\.-]+@[\w-]+(\.[\w-]+)*\.[\w-]+$/,           //验证邮箱
        RE_PHONE = /^(1\d{10}|(\d{3,4}-?)?\d{7,8}(-\d{1,4})?)$/,    //验证电话号码(手机号码、带区号或不带区号、带分机号或不带分机号)
        RE_TEL = /^1\d{10}$/,                                       //验证手机号码
        RE_HTTP = /^https?:\/\//i;

    //判断字符串是否符合IPv4格式
    function isIP(ip) {
        var parts = ip.split("."), length = parts.length;
        if (length != 4) return false;

        for (var i = 0; i < length; i++) {
            var part = +parts[i];
            if (!parts[i] || isNaN(part) || part < 0 || part > 255) return false;
        }

        return true;
    }

    //是否符合邮箱格式
    function isMail(str) {
        return RE_MAIL.test(str);
    }

    //是否符合电话号码格式 18688889999 | 027-88889999-3912
    function isPhone(str) {
        return RE_PHONE.test(str);
    }

    //是否符合手机号码格式 18688889999
    function isTel(str) {
        return RE_TEL.test(str);
    }

    //是否http路径(以 http:// 或 https:// 开头)
    function isHttpURL(url) {
        return RE_HTTP.test(url);
    }

    //按照进制解析数字的层级 eg:时间转化 -> parseLevel(86400,[60,60,24]) => { value=1, level=3 }
    //steps:步进,可以是固定的数字(eg:1024),也可以是具有层次关系的数组(eg:[60,60,24])
    //limit:限制解析的层级,正整数,默认为100
    function parseLevel(size, steps, limit) {
        size = +size;
        steps = steps || 1024;

        var level = 0,
            isNum = typeof steps == "number",
            stepNow = 1,
            count = isUInt(limit) ? limit : (isNum ? 100 : steps.length);

        while (size >= stepNow && level < count) {
            stepNow *= (isNum ? steps : steps[level]);
            level++;
        }

        if (level && size < stepNow) {
            stepNow /= (isNum ? steps : steps.last());
            level--;
        }

        return { value: level ? size / stepNow : size, level: level };
    }

    var UNITS_FILE_SIZE = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];

    //格式化数字输出,将数字转为合适的单位输出,默认按照1024层级转为文件单位输出
    function formatSize(size, ops) {
        ops = ops === true ? { all: true } : ops || {};

        if (isNaN(size) || size == undefined || size < 0) {
            var error = ops.error || "--";

            return ops.all ? { text: error } : error;
        }

        var pl = parseLevel(size, ops.steps, ops.limit),

            value = pl.value,
            text = value.toFixed(def(ops.digit, 2));

        if (ops.trim !== false && text.lastIndexOf(".") != -1) text = text.replace(/\.?0+$/, "");

        pl.text = text + (ops.join || "") + (ops.units || UNITS_FILE_SIZE)[pl.level + (ops.start || 0)];

        return ops.all ? pl : pl.text;
    }

    //---------------------- export ----------------------

    var Q = {
        version: "1.2.2",
        G: GLOBAL,

        strict: is_strict_mode,

        type: getType,

        isFunc: isFunc,
        isObject: isObject,
        isArray: Array.isArray,
        isArrayLike: isArrayLike,

        def: def,
        isNum: isNum,
        isUNum: isUNum,
        isInt: isInt,
        isUInt: isUInt,
        checkNum: checkNum,
        checkInt: checkInt,

        toUpper: toUpper,
        toLower: toLower,

        toArray: toArray,
        makeArray: makeArray,

        arr: arr,
        vals: vals,

        alias: alias,
        extend: extend,
        clone: clone,

        toMap: toMap,
        toObjectMap: toObjectMap,

        sortNumber: sortNumber,
        sortString: sortString,
        sortDate: sortDate,
        sort: sortList,

        proxy: proxy,
        fire: fire,
        delay: delay,
        async: async,
        waitFor: waitFor,

        factory: factory,

        isIP: isIP,
        isMail: isMail,
        isPhone: isPhone,
        isTel: isTel,
        isHttpURL: isHttpURL,

        parseLevel: parseLevel,
        formatSize: formatSize,

        Listener: Listener
    };

    GLOBAL.Q = Q;

    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = Q;
    }

})();

﻿/*
* Q.Queue.js 队列
* author:devin87@qq.com
* update:2015/10/15 10:39
*/
(function (undefined) {
    "use strict";

    var delay = Q.delay,
        extend = Q.extend,
        fire = Q.fire,

        isFunc = Q.isFunc,
        isObject = Q.isObject,
        isArrayLike = Q.isArrayLike,
        isUInt = Q.isUInt,

        getType = Q.type,
        makeArray = Q.makeArray,
        factory = Q.factory,

        Listener = Q.Listener;

    var QUEUE_TASK_TIMEDOUT = -1,    //任务已超时
        QUEUE_TASK_READY = 0,        //任务已就绪，准备执行
        QUEUE_TASK_PROCESSING = 1,   //任务执行中
        QUEUE_TASK_OK = 2,           //任务已完成

        //自定义事件
        LIST_CUSTOM_EVENT = ["add", "start", "end", "stop", "complete"];

    //异步队列
    function Queue(ops) {
        ops = ops || {};

        var self = this,
            tasks = ops.tasks;

        //队列自定义事件
        self._listener = new Listener(LIST_CUSTOM_EVENT, self);

        self.auto = ops.auto !== false;
        self.workerThread = ops.workerThread || 1;
        self.timeout = ops.timeout;

        if (ops.rtype == "auto") self.rtype = getType(tasks);

        LIST_CUSTOM_EVENT.forEach(function (type) {
            var fn = ops[type];
            if (fn) self.on(type, fn);
        });

        if (ops.inject) self.inject = ops.inject;
        if (ops.process) self.process = ops.process;
        if (ops.processResult) self.processResult = ops.processResult;

        self.ops = ops;

        self.reset();

        delay(self.addList, self, 0, [tasks]);
    }

    factory(Queue).extend({
        //添加自定义事件
        on: function (type, fn) {
            this._listener.add(type, fn);
            return this;
        },
        //触发自定义事件
        trigger: function (type, args) {
            this._listener.trigger(type, args);
            return this;
        },

        //重置队列
        reset: function () {
            var self = this;

            self.tasks = [];
            self.index = 0;

            self.workerIdle = self.workerThread;

            return self;
        },

        //添加任务
        _add: function (args, key, auto) {
            var self = this;

            var task = { args: makeArray(args), state: QUEUE_TASK_READY };
            if (key != undefined) task.key = key;

            self.tasks.push(task);

            self.trigger("add", task);

            if (auto) self.start();

            return self;
        },

        //添加任务
        add: function () {
            return this._add(arguments, undefined, this.auto);
        },

        //批量添加任务
        addList: function (tasks) {
            var self = this;
            if (!tasks) return self;

            if (isArrayLike(tasks)) {
                Array.forEach(tasks, function (v, i) {
                    self._add(v, i, false);
                });
            } else {
                Object.forEach(tasks, function (k, v) {
                    self._add(v, k, false);
                });
            }

            if (self.auto) self.start();

            return self;
        },

        //返回队列长度,可指定任务状态
        size: function (state) {
            return state != undefined ? this.tasks.filter(function (task) { return task.state == state; }).length : this.tasks.length;
        },

        //运行队列
        _run: function () {
            var self = this;

            if (self.stoped || self.workerIdle <= 0 || self.index >= self.tasks.length) return self;

            var task = self.tasks[self.index++],
                timeout = self.timeout;

            self.workerIdle--;

            self.trigger("start", task);

            //跳过任务
            if (task.state != QUEUE_TASK_READY) return self.ok(task);

            task.state = QUEUE_TASK_PROCESSING;

            //超时检测
            if (isUInt(timeout)) task._timer = delay(self.ok, self, timeout, [task, QUEUE_TASK_TIMEDOUT]);

            //处理任务
            self.process(task, function () {
                self.ok(task, QUEUE_TASK_OK);
            });

            return self.workerIdle ? self._run() : self;
        },

        //启动队列,默认延迟10ms
        start: function () {
            var self = this;
            self.stoped = false;
            if (!self.auto) self.auto = true;

            delay(self._run, self, 10);

            return self;
        },

        //暂停队列,可以调用start方法重新启动队列
        //time:可选,暂停的毫秒数
        stop: function (time) {
            var self = this;
            self.stoped = true;

            if (isUInt(time)) delay(self.start, self, time);

            return self;
        },

        //回调函数注入(支持2级注入)
        inject: function (task, callback) {
            var self = this,
                ops = self.ops,

                injectIndex = ops.injectIndex || 0,     //执行函数中回调函数所在参数索引
                injectCallback = ops.injectCallback,    //如果该参数是一个对象,需指定参数名称,可选

                args = task.args.slice(0);

            //自执行函数
            if (!ops.exec && isFunc(args[0])) injectIndex++;

            //task.args 克隆,避免对原数据的影响
            var data = args[injectIndex],
                originalCallback;

            //注入回调函数
            var inject = function (result) {
                //注入结果仅取第一个返回值,有多个结果的请使用数组或对象传递
                task.result = result;

                //执行原回调函数(如果有)
                if (isFunc(originalCallback)) originalCallback.apply(this, arguments);

                //触发任务完成回调,并执行下一个任务 
                callback();
            };

            if (injectCallback != undefined) {
                //避免重复注入
                var qcallback = data.__qcallback;
                originalCallback = qcallback || data[injectCallback];
                if (!qcallback && originalCallback) data.__qcallback = originalCallback;

                data[injectCallback] = inject;
                args[injectIndex] = data;
            } else {
                originalCallback = data;

                args[injectIndex] = inject;
            }

            return args;
        },

        //处理队列任务
        process: function (task, callback) {
            var self = this,
                ops = self.ops,

                exec = ops.exec,    //执行函数
                bind = ops.bind,    //执行函数绑定的上下文,可选

                args = self.inject(task, callback),
                fn = args[0];

            if (fn instanceof Queue) fn.start();
            else if (exec) exec.apply(bind, args);
            else fn.apply(bind, args.slice(1));
        },

        //队列完成时,任务结果处理,用于complete事件参数
        processResult: function (tasks) {
            switch (this.rtype) {
                case "array":
                case "list":
                case "arguments":
                    return tasks.items("result");

                case "object": return tasks.toObjectMap("key", "result");
            }

            return [tasks];
        },

        //所有任务是否已完成
        isCompleted: function (tasks) {
            return (tasks || this.tasks).every(function (task) {
                return task.state == QUEUE_TASK_OK || task.state == QUEUE_TASK_TIMEDOUT;
            });
        },

        //设置任务执行状态为完成并开始新的任务
        ok: function (task, state) {
            var self = this;
            if (task.state != QUEUE_TASK_PROCESSING) return self._run();

            if (++self.workerIdle > self.workerThread) self.workerIdle = self.workerThread;

            if (task._timer) clearTimeout(task._timer);

            if (state != undefined) task.state = state;

            //触发任务完成事件
            self.trigger("end", task);

            if (self.stoped) {
                //任务已停止且完成时触发任务停止事件
                if (self.isCompleted(self.tasks.slice(0, self.index))) self.trigger("stop", self.processResult(self.tasks));
            } else {
                //当前队列任务已完成
                if (self.isCompleted()) {
                    self.trigger("complete", self.processResult(self.tasks));

                    //队列完成事件,此为提供注入接口
                    fire(self.complete, self);
                }
            }

            return self._run();
        }
    });

    //队列任务状态
    Queue.TASK = {
        TIMEDOUT: QUEUE_TASK_TIMEDOUT,
        READY: QUEUE_TASK_READY,
        PROCESSING: QUEUE_TASK_PROCESSING,
        OK: QUEUE_TASK_OK
    };

    //函数排队执行
    function series(tasks, complete, ops, workerThread) {
        if (isObject(complete)) {
            ops = complete;
            complete = undefined;
        }

        return new Queue(extend(ops || {}, {
            rtype: "auto",
            workerThread: workerThread,

            tasks: tasks,
            complete: complete
        }));
    }

    //函数并行执行
    function parallel(tasks, complete, ops) {
        return series(tasks, complete, ops, isArrayLike(tasks) ? tasks.length : Object.size(tasks));
    }

    //ajax队列
    function ajaxQueue(ops) {
        ops = ops || {};

        return new Queue(extend(ops, {
            exec: ops.ajax || Q.ajax || $.ajax,
            injectIndex: 1,
            injectCallback: "complete"
        }));
    }

    //------------------------- export -------------------------

    extend(Q, {
        Queue: Queue,

        series: series,
        parallel: parallel,

        ajaxQueue: ajaxQueue
    });

})();

﻿/*
* Q.core.js (包括 通用方法、JSON、Cookie、Storage 等) for browser
* author:devin87@qq.com  
* update:2015/09/30 15:40
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
        async = Q.async,

        waitFor = Q.waitFor;

    var window = Q.G,
        document = window.document,

        html = document.documentElement,
        head = document.head || document.getElementsByTagName("head")[0],

        is_quirk_mode = document.compatMode == "BackCompat",

        body,
        root;

    var encode_url_param = encodeURIComponent;

    //解码url参数值 eg:%E6%B5%8B%E8%AF%95 => 测试
    function decode_url_param(param) {
        try {
            return decodeURIComponent(param);
        } catch (e) {
            return param;
        }
    }

    //将对象转为查询字符串
    function to_param_str(obj) {
        if (!obj) return "";
        if (typeof obj == "string") return obj;

        var tmp = [];

        Object.forEach(obj, function (k, v) {
            if (typeof v != "function") tmp.push(encode_url_param(k) + "=" + (v != undefined ? encode_url_param(v) : ""));
        });

        return tmp.join("&");
    }

    //连接url和查询字符串
    function join_url(url) {
        var params = [], args = arguments;
        for (var i = 1, len = args.length; i < len; i++) {
            var param = args[i];
            if (param) params.push(to_param_str(param));
        }

        var index = url.indexOf("#"), hash = "";
        if (index != -1) {
            hash = url.slice(index);
            url = url.slice(0, index);
        }

        var str_params = params.join("&");
        if (str_params) url += (url.contains("?") ? "&" : "?") + str_params;

        return url + hash;
    }

    //解析url参数 eg:url?id=1
    function parse_url_params(search) {
        if (!search) return {};

        if (search.charAt(0) == "?") search = search.slice(1);
        if (!search) return {};

        var list = search.split("&"), map = {};

        for (var i = 0, len = list.length; i < len; i++) {
            //跳过空字符串
            if (!list[i]) continue;

            var kv = list[i].split("="),
                key = kv[0],
                value = kv[1];

            if (key) map[decode_url_param(key)] = value ? decode_url_param(value) : "";
        }

        return map;
    }

    //编码或解码查询字符串
    function process_url_param(obj) {
        if (obj == undefined) return;

        return typeof obj == "string" ? parse_url_params(obj) : to_param_str(obj);
    }

    //解析url hash eg:#net/config!/wan  => {nav:"#net/config",param:"wan"}
    function parse_url_hash(hash) {
        if (!hash) hash = location.hash;

        var nav = hash, param;

        if (hash) {
            var index = hash.indexOf("!/");
            if (index != -1) {
                nav = hash.slice(0, index);
                param = hash.slice(index + 2);
            }
        }

        return { nav: nav, param: param };
    }

    //获取页名称
    function get_page_name(path) {
        var pathname = (path || location.pathname).toLowerCase().replace(/\\/g, "/"),
            start = pathname.lastIndexOf("/") + 1,
            end = pathname.indexOf("?", start);

        if (end == -1) end = pathname.indexOf("#", start);

        return end != -1 ? pathname.slice(start, end) : pathname.slice(start);
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
            if (ops.cache === false) url = join_url(url, "_=" + (++GUID_RESOURCE))

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
            case "date": return isFinite(obj.valueOf()) ? obj.toUTC().format("yyyy-MM-ddThh:mm:ss.SZ") : JSON_NULL;
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
        waitFor(function () { return document.body; }, fn);
    }

    extend(Q, {
        html: html,
        head: head,
        quirk: is_quirk_mode,

        ready: ready,

        encode: encode_url_param,
        decode: decode_url_param,

        param: process_url_param,
        join: join_url,

        parseHash: parse_url_hash,
        getPageName: get_page_name,

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
    else async(init, 0);

    //暴露接口
    window.request = parse_url_params(location.search);

})();

﻿/*
* Q.setTimer.js 计时器
* author:devin87@qq.com
* update:2015/06/11 09:50
*/
(function (undefined) {
    "use strict";

    var fire = Q.fire;

    //---------------------- 计时器 ----------------------

    //计时器
    function setTimer(ops) {
        var box = ops.box,
            process = ops.process,

            length = ops.pad ? 2 : 1,

            time = ops.time,
            step = ops.step || 1,
            sleep = ops.sleep || 1000,

            str_join = ops.join || "",

            units = ops.units || ["天", "小时", "分", "秒"];

        if ((!box && !process) || time == undefined || isNaN(time)) return;

        var total = +time, timer;

        var pad = function (n, len) {
            return n > 9 || len == 1 ? n : "0" + n;
        };

        var update = function () {
            total += step;
            if (total < 0) return;

            var t = Date.parts(total),
                days = t.days,
                hours = t.hours,
                mintues = t.mintues,
                seconds = t.seconds;

            var text = days + units[0] + str_join + pad(hours, length) + units[1] + str_join + pad(mintues, length) + units[2] + str_join + pad(seconds, length) + units[3],
                result = fire(process, undefined, total, text, days, hours, mintues, seconds);

            if (result !== false) {
                if (box) box.innerHTML = typeof result == "string" ? result : text;
                timer = setTimeout(update, sleep);
            }
        };

        update();

        var api = {
            start: update,
            stop: function () {
                if (timer) clearTimeout(timer);
            }
        };

        return api;
    }

    //------------------------- export -------------------------

    Q.setTimer = setTimer;

})();

﻿/*
* Q.query.js CSS选择器 from mojoQuery v1.5
* Copyright (c) 2009 scott.cgi
* https://github.com/scottcgi/MojoJS

* author:devin87@qq.com
* update:2016/01/14 10:48

* fixed bug:https://github.com/scottcgi/MojoJS/issues/1
* add pseudo (lt,gt,eq) eg:query("a:lt(3)")
* add matches
* fixed space trim bug eg:.a .b => not .a.b
* attr value quote support eg:div[class="a"]
*/
(function (undefined) {
    "use strict";

    var document = window.document,
        makeArray = Q.makeArray;

    var RE_RULE = /[ +>~]/g,
        RE_N_RULE = /[^ +>~]+/g,
		//RE_TRIM_LR = /^ +| +$/g,
		//RE_TRIM = / *([^a-zA-Z*]) */g, //bug eg:.t .a=>.t.a
        RE_TRIM = /\s*([+>~])\s*/g,

		RE_PSEU_PARAM = /\([^()]+\)/g,
		RE_ATTR_PARAM = /[^\[]+(?=\])/g,
		RE_ATTR = /[!\^$*|~]?=/,
		//RE_CLS=/\./g,
		RE_PSEU = /[^:]+/g,
		RE_NUM = /\d+/,
		RE_NTH = /(-?\d*)n([+-]?\d*)/,
		RE_RULES = /((?:#[^.:\[]+)*)([a-zA-Z*]*)([^\[:]*)((?:\[.+\])*)((?::.+)*)/,

        // Identifies HTMLElement whether matched in one query
		tagGuid = 1,

        jo_pseuParams,
        jo_attrParams,

		attrMap = {
		    "class": "className",
		    "for": "htmlFor"
		};

    /**
    * Trim extra space
    * 
    * @param  {String} selector
    * @return {String} Selector after tirm
    */
    function trim(selector) {
        return selector
				    // trim left and right space
				    //.replace(RE_TRIM_LR, "")
                    .trim()

				    // trim space in selector
				    .replace(RE_TRIM, "$1");
    }

    /**
	* Replace attribute and pseudo selector which in "[]" and "()"
	* 
	* @param  {String} selector  
	* @return {Array}  Selector split by comma
	*/
    function replaceAttrPseudo(selector) {
        var pseuParams = [],
            attrParams = [];

        jo_pseuParams = pseuParams;
        jo_attrParams = attrParams;

        selector = selector
                        // remove attribute selector parameter and put in array
                        .replace(RE_ATTR_PARAM, function (matched) {
                            return attrParams.push(matched) - 1;
                        });

        // remove pseudo selector parameter and put in array
        while (selector.indexOf("(") !== -1) {
            selector = selector.replace(RE_PSEU_PARAM, function (matched) {
                return pseuParams.push(matched.substring(1, matched.length - 1)) - 1;
            });
        }

        return selector;
    }

    /**
	* Parse selector and get complex selector
	* 
	* @param  {String} selector
	* @return {Array}  Array of parsed rule
	*/
    function getRules(selector) {
        var rules, attrs, pseudos;

        // rules[1]: id selector 
        // rules[2]: tag selector
        // rules[3]: class selecotr
        // rules[4]: attribute selector
        // rules[5]: pseudo selector  	
        rules = RE_RULES.exec(selector);

        rules[2] = rules[2] || "*";

        //rules[3] = rules[3].replace(RE_CLS, "");

        if (attrs = rules[4]) {
            // array of attritubte parse function
            rules[4] = getAttrRules(attrs.match(RE_ATTR_PARAM), jo_attrParams);
        }

        if (pseudos = rules[5]) {
            // array of pseudo parse function
            rules[5] = getPseudoRules(pseudos.match(RE_PSEU), jo_pseuParams)
        }

        return rules;
    }

    /**
	* Get attribute parse functions
	* 
	* @param  {Array} arrAttr       
	* @param  {Array} attrParams  
	* @return {Array} Array of attribute parse function    
	*/
    function getAttrRules(arrAttr, attrParams) {
        var arr = [],
            i = 0,
            len = arrAttr.length,
            rex = RE_ATTR,
            attrs = attributes,
            attr;

        for (; i < len; i++) {
            attr = attrParams[arrAttr[i]];

            if (rex.test(attr)) {
                attr = RegExp["$'"];
                // [function, name, value] are put in arr
                arr.push(attrs[RegExp["$&"]], RegExp["$`"], attr.replace(/^["']|["']$/g, ""));
            } else {
                // only has attribute name
                arr.push(attrs[" "], attr, "");
            }
        }

        return arr;
    }

    /**
	* Get pesudo parse functions
	* 
	* @param  {Array} arrPseu 
	* @param  {Array} pseuParams
	* @return {Array} Array of pseudo parse function
	*/
    function getPseudoRules(arrPseu, pseuParams) {
        var arr = [],
            i = 0,
            len = arrPseu.length,
            rex = RE_NUM,
            guid = tagGuid++,
            pseus = pseudos,
            pseu, param;

        for (; i < len; i++) {
            pseu = arrPseu[i];

            // pesudo with parameter
            if (rex.test(pseu)) {
                // pseudos's object property
                pseu = pseus[RegExp["$`"]];
                // pesudo parameter					
                param = pseuParams[RegExp["$&"]];


                // arr[0]: whether has parameter
                // arr[1]: pseudo parse function
                // arr[2]: parameter
                arr.push(
                    true,
                    pseu.fn,
                    pseu.getParam ? pseu.getParam(param, guid) : param
                );
            } else {
                arr.push(false, pseus[pseu], null);
            }
        }

        return arr;
    }

    /**
	* Filter HTMLElement whether matched pseudo rules
	* 
	* @param  {Array} els
	* @param  {Array} pseudoRules
	* @return {Array} Matched HTMLElement array   
	*/
    function filterPseudo(els, pseudoRules) {
        var n = 0,
            m = pseudoRules.length,
            matched = els,
            len, el, pseudo, hasParam, param, i;

        for (; n < m; n += 3) {
            pseudo = pseudoRules[n + 1];
            hasParam = pseudoRules[n];
            param = hasParam ? pseudoRules[n + 2] : undefined;
            els = matched;
            matched = [];

            for (i = 0, len = els.length; i < len; i++) {
                el = els[i];

                if (!pseudo(el, i, len, param)) {
                    continue;
                }

                matched.push(el);
            }
        }

        return matched;
    }

    /**
	* Filter HTMLElement whether matched attribute rules
	* 
	* @param  {Array}  els
	* @param  {Array}  attrRules
	* @return {Array}  Matched HTMLElement array
	*/
    function filterAttr(els, attrRules) {
        var len = els.length,
            i = 0,
            m = attrRules.length,
            matched = [],
            n, el, rule, val, name;

        for (; i < len; i++) {
            el = els[i];

            for (n = 0; n < m; n += 3) {
                rule = attrRules[n];
                name = attrRules[n + 1];

                //IE6/7：getAttribute("href") 默认返回完整路径,第二个参数设为2以与其它浏览器保持一致(返回相对路径)
                if (!(val = el.getAttribute(name, name === "href" ? 2 : undefined))) {
                    if (!(val = el[attrMap[name] || name])) {
                        break;
                    }
                }

                if (!rule(val + "", attrRules[n + 2])) {
                    break;
                }
            }

            if (n === m) {
                matched.push(el);
            }
        }

        return matched;
    }

    /**
	* Filter HTMLElement whether matched class attribute
	* 
	* @param  {Array}   els
	* @param  {String}  cls
	* @return {Array}   Matched HTMLElement array
	*/
    function filterClass(els, cls) {
        var matched = [], start = 1, i, len, el, clsName, clsOne, index;

        do {
            len = els.length;
            if (len <= 0) return matched;

            index = cls.indexOf('.', start);
            clsOne = ' ' + cls.slice(start, index == -1 ? undefined : index) + ' ';

            for (i = 0; i < len; i++) {
                el = els[i];
                if (clsName = el.className) {
                    if ((' ' + clsName + ' ').indexOf(clsOne) != -1) matched.push(el);
                }
            }

            if (index == -1) return matched;

            els = matched;
            matched = [];
            start = index + 1;
        } while (true);
    }

    /**
	* Filter HTMLElement 
	* 
	* @param  {HTMLElement} el
	* @param  {String}      tag
	* @param  {String}      cls
	* @param  {Array}       attrRules
	* @param  {Array}       pseudoRules
	* @return {Boolean}     Whether HTMLElement matched
	*/
    function filterEl(el, tag, cls, attrRules, pseudoRules) {
        if (tag !== "*" && el.nodeName.toLowerCase() !== tag) {
            return false;
        }

        if (cls && !filterClass([el], cls).length) {
            return false;
        }

        if (attrRules && !filterAttr([el], attrRules).length) {
            return false;
        }

        if (pseudoRules && !filterPseudo([el], pseudoRules).length) {
            return false;
        }

        return true;
    }

    /**
	* Get the data bind in HTMLElement
	* 
	* @param  {HTMLElement} el
	* @return {Object}      Data bind in HTMLElement
	*/
    function getElData(el) {
        var data = el.__mojo;

        if (!data) {
            data = el.__mojo = {
                x: {
                    tagGuid: 0
                }
            };
        }

        if (!(data = data.x)) {
            data = {
                tagGuid: 0
            };
        }

        return data;
    }

    /**
    * Reomve duplicate HTMLElement
    * 
    * @param  {Array} arr
    * @return {Array} Unique HTMLElement array
    */
    function makeDiff(arr) {
        var guid = tagGuid++,
            len = arr.length,
            diff = [],
            i = 0,
            el, data;

        for (; i < len; i++) {
            el = arr[i];
            data = getElData(el);
            if (data.tagGuid !== guid) {
                diff.push(el);
                data.tagGuid = guid;
            }
        }

        return diff;
    }

    /**
	* Get nth pseudo parameter after parsed
	* 
	* @param  {String} param
	* @param  {Number} guid
	* @return {Array}  Parsed parameter
	*/
    function getNthParam(param, guid) {
        if (RE_NTH.test(param === "odd" && "2n+1" ||
                                 param === "even" && "2n" || param)) {
            param = RegExp.$1;

            param === "" ?
            param = 1 :
            param === "-" ?
            param = -1 :
            param = param * 1;

            if (param !== 0) {
                // param[0]: Identifies HTMLElement
                // param[1]: whether "nth-child()" has "n" parameter
                // param[2]: parameter before "n"
                // param[3]: paramter after "n"
                return [guid, true, param, RegExp.$2 * 1];
            }

            // the "0n" matched
            param = RegExp.$2;
        }

        // param[0]: Identifies HTMLElement
        // param[1]: whether "nth-child()" has "n" parameter
        // param[2]: number in like "nth-child(5)"
        return [guid, false, param * 1, null];
    }

    /**
	* Check nth pseudo parameter whether matched condition
	* 
	* @param  {Array}  param  
	* @param  {Number} index  
	* @return {Boolean} Matched or not 
	*/
    function checkNthParam(param, index) {
        if (param[1]) {
            index = index - param[3];
            param = param[2];
            return index * param >= 0 && index % param === 0;
        }

        return index === param[2];
    }

    /**
	* Check nth child HTMLELement whether matched condition
	* 
	* @param  {HTMLElement} el
	* @param  {Number}      i
	* @param  {Number}      len
	* @param  {Array}       param
	* @return {Booelan}     Matched or not
	*/
    function checkNthChild(el, i, len, param) {
        var data, node, pel, map, index, checkType,
            first = param[4],
            next = param[5],
            guid = param[0];

        data = getElData(pel = el.parentNode);

        if (data.tagGuid !== guid) {
            if (checkType = param[6]) {
                // need to check HTMLElement type
                // so record the type
                map = data.tagMap = {};
            } else {
                index = 0;
            }

            node = pel[first];
            while (node) {
                if (node.nodeType === 1) {
                    if (checkType) {
                        name = node.nodeName;
                        if (!map[name]) {
                            map[name] = 1;
                        }

                        // count child by different type
                        index = map[name]++;
                    } else {
                        // count all child
                        index++;
                    }
                    getElData(node).nodeIndex = index;
                }
                node = node[next];
            }
            data.tagGuid = guid;
        }

        return checkNthParam(param, getElData(el).nodeIndex);
    }

    /**
	* Check el has sibling 
	* 
	* @param {HTMLElement} el
	* @param {String}      next
	* @param {Boolean}     checkType
	* @param {String}      name
	* @return {Boolean}    Has or not
	*/
    function checkSibling(el, next, checkType, name) {
        while (el = el[next]) {
            if (el.nodeType === 1) {
                if (!checkType || name === el.nodeName) {
                    return false;
                }
            }
        }

        return true;
    }

    var relative = {
        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        " ": function (contexts, tag) {
            var
                guid = tagGuid++,
                len = contexts.length,
                arr = [],
                i = 0,
                n, m, nodes, el, pel;

            for (; i < len; i++) {
                el = contexts[i];
                if (pel = el.parentNode) {
                    getElData(el).tagGuid = guid;
                    if (getElData(pel).tagGuid === guid) {
                        continue;
                    }
                }

                nodes = el.getElementsByTagName(tag);
                for (n = 0, m = nodes.length; n < m; n++) {
                    arr.push(nodes[n]);
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        ">": function (contexts, tag) {
            var
                arr = [],
                len = contexts.length,
                i = 0, el;

            for (; i < len; i++) {
                el = contexts[i].firstChild;
                while (el) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                    }
                    el = el.nextSibling;
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        "+": function (contexts, tag) {
            var
                arr = [],
                len = contexts.length,
                i = 0, el;

            for (; i < len; i++) {
                el = contexts[i];
                while (el = el.nextSibling) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                        break;
                    }
                }
            }

            return arr;
        },

        /**
         * Get matched HTMLElement
         *
         * @param  {Array}  contexts   
         * @param  {String} tag        
         * @return {Array}  Matched HTMLElement array
         */
        "~": function (contexts, tag) {
            var
                guid = tagGuid++,
                len = contexts.length,
                arr = [],
                i = 0,
                el, pel, data;

            for (; i < len; i++) {
                el = contexts[i];
                if (pel = el.parentNode) {
                    if ((data = getElData(pel)).tagGuid === guid) {
                        continue;
                    }
                    data.tagGuid = guid;
                }

                while (el = el.nextSibling) {
                    if (el.nodeType === 1) {
                        if (el.nodeName.toLowerCase() === tag || tag === "*") {
                            arr.push(el);
                        }
                    }
                }
            }

            return arr;
        }
    };

    var attributes = {
        " ": function () {
            return true;
        },

        "=": function (attrVal, inputVal) {
            return attrVal === inputVal;
        },

        "!=": function (attrVal, inputVal) {
            return attrVal !== inputVal;
        },

        "^=": function (attrVal, inputVal) {
            return attrVal.indexOf(inputVal) === 0;
        },

        "$=": function (attrVal, inputVal) {
            return attrVal.substring(attrVal.length - inputVal.length) === inputVal;
        },

        "*=": function (attrVal, inputVal) {
            return attrVal.indexOf(inputVal) !== -1
        },

        "~=": function (attrVal, inputVal) {
            return (" " + attrVal + " ").indexOf(" " + inputVal + " ") !== -1;
        },

        "|=": function (attrVal, inputVal) {
            return attrVal === inputVal || attrVal.substring(0, inputVal.length + 1) === inputVal + "-";
        }
    };

    var pseudos = {
        //css//
        "nth-child": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("firstChild", "nextSibling", false);
                return param;
            },
            fn: checkNthChild
        },

        "nth-last-child": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("lastChild", "previousSibling", false);
                return param;
            },
            fn: checkNthChild
        },

        "nth-of-type": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("firstChild", "nextSibling", true);
                return param;
            },
            fn: checkNthChild
        },

        "nth-last-of-type": {
            getParam: function (param, guid) {
                param = getNthParam(param, guid);
                param.push("lastChild", "previousSibling", true);
                return param;
            },
            fn: checkNthChild
        },

        not: {
            getParam: function (param) {
                // ":not()" may has "," in parameter
                // like: ":not(a, p)"
                var rules = param.split(",");
                param = [];
                while (rules.length) {
                    param.push(getRules(rules.pop()));
                }

                return param;
            },
            fn: function (el, i, len, params) {
                var k = 0,
                    l = params.length,
                    param;

                for (; k < l; k++) {
                    param = params[k];

                    if (param[1]) {
                        if ("#" + el.id !== param[1]) {
                            continue;
                        }
                        return false;
                    }

                    if (filterEl(el, param[2], param[3], param[4], param[5])) {
                        return false;
                    }
                }

                return true;
            }
        },

        "first-child": function (el) {
            return checkSibling(el, "previousSibling", false);
        },

        "last-child": function (el) {
            return checkSibling(el, "nextSibling", false);
        },

        "only-child": function (el) {
            return checkSibling(el, "previousSibling", false) &&
                   checkSibling(el, "nextSibling", false);
        },

        "first-of-type": function (el) {
            return checkSibling(el, "previousSibling", true, el.nodeName);
        },

        "last-of-type": function (el) {
            return checkSibling(el, "nextSibling", true, el.nodeName);;
        },

        "only-of-type": function (el) {
            var name = el.nodeName;
            return checkSibling(el, "previousSibling", true, name) &&
                   checkSibling(el, "nextSibling", true, name);
        },

        enabled: function (el) {
            return el.disabled === false;
        },

        disabled: function (el) {
            return el.disabled === true;
        },

        checked: function (el) {
            return el.checked === true;
        },

        empty: function (el) {
            return !el.firstChild;
        },

        selected: function (el) {
            return el.selected === true;
        },

        radio: function (el) {
            return el.nodeName == "INPUT" && el.type == "radio";
        },
        checkbox: function (el) {
            return el.nodeName == "INPUT" && el.type == "checkbox";
        },
        button: function (el) {
            return el.nodeName == "INPUT" && el.type == "button";
        },
        submit: function (el) {
            return el.nodeName == "INPUT" && el.type == "submit";
        },


        //position//			
        first: function (el, i) {
            return i === 0;
        },

        last: function (el, i, len) {
            return i === (len - 1);
        },

        even: function (el, i) {
            return i % 2 === 0;
        },

        odd: function (el, i) {
            return i % 2 === 1;
        },

        lt: {
            fn: function (el, i, len, param) {
                param = +param;
                return i < (param >= 0 ? param : param + len);
            }
        },
        gt: {
            fn: function (el, i, len, param) {
                param = +param;
                return i > (param >= 0 ? param : param + len);
            }
        },
        eq: {
            fn: function (el, i, len, param) {
                param = +param;
                return i == (param >= 0 ? param : param + len);
            }
        },

        nth: {
            getParam: getNthParam,
            fn: function (el, i, len, param) {
                return checkNthParam(param, i);
            }
        },


        //additions//
        contains: {
            fn: function (el, i, len, param) {
                return (el.textContent || el.innerText || "").indexOf(param) !== -1;
            }
        },

        has: {
            getParam: function (param) {
                var
                    selectors = param.split(","),
                    i = 0,
                    len = selectors.length,
                    selector, rules;

                param = [];

                // each selector split by comma
                for (; i < len; i++) {
                    selector = selectors[i];

                    // relative rule array 
                    // add defalut rule " "
                    rules = (" " + selector).match(RE_RULE);

                    // selector on both sides of relative rule  
                    selector = selector.match(RE_N_RULE);

                    // selector start with relative rule
                    if (rules.length > selector.length) {
                        rules.shift();
                    }

                    param.push(selector, rules);
                }

                return param;
            },
            fn: function (el, i, len, param) {
                var k = 0,
                    l = param.length,
                    results = [],
                    context = [el],
                    selector, rules,
                    contexts, n, m;

                // each selector split by comma
                for (; k < l; k += 2) {
                    contexts = context;

                    selector = param[k];
                    rules = param[k + 1];

                    // parse selector by each relative rule
                    for (n = 0, m = rules.length; n < m; n++) {
                        contexts = parse(selector[n], contexts, rules[n]);
                    }

                    // concat results of comma delimited selector
                    results = results.concat(contexts);
                }

                return results.length !== 0;
            }
        }
    };

    /**
    * Parse selector and get matched HTMLElement array
    * 
    * @param  {String} selector      
    * @param  {Array}  contexts      
    * @param  {String} rule         
    * @return {Array}  Matched HTMLElement array
    */
    function parse(selector, contexts, rule, els) {
        var matched, rules, id, tag, cls, attrs, pseudos, el;

        // rules[1]: id selector 
        // rules[2]: tag selector
        // rules[3]: class selecotr
        // rules[4]: attribute selector
        // rules[5]: pseudo selector  									
        rules = RE_RULES.exec(selector);

        // id selector eg:#id | tag#id | #id.cls
        if ((id = rules[1]) || ((id = rules[3]) && id.charAt(0) == "#")) {
            el = document.getElementById(id.slice(1));
            if (!els) els = el ? [el] : [];

            if (id == rules[0]) return el;
        }

        tag = rules[2];

        matched = els || relative[rule](contexts, tag || "*");

        //eg:div#test
        if (els && tag) {
            matched = [];
            tag = tag.toUpperCase();

            for (var i = 0, len = els.length; i < len; i++) {
                if (els[i].tagName == tag) matched.push(els[i]);
            }
        }

        if ((cls = rules[3]) && cls.charAt(0) == ".") {
            matched = filterClass(matched, cls);
        }

        if (attrs = rules[4]) {
            matched = filterAttr(matched, getAttrRules(attrs.match(RE_ATTR_PARAM), jo_attrParams));
        }

        if (pseudos = rules[5]) {
            matched = filterPseudo(matched, getPseudoRules(pseudos.match(RE_PSEU), jo_pseuParams));
        }

        return matched;
    }

    /**
	* Get HTMLElement array by selector and context
	* 
	* @param  {String} selector  
	* @param  {String | HTMLElement | Array[HTMLElement] | NodeList} context (optional)
	* @return {Array} Array of HTMLElement 
	*/
    function query(selector, context) {
        var results = [],
			selectors, contexts, rules, i, j, n, m;

        switch (typeof context) {
            case "undefined":
                contexts = [document];
                break;

            case "string":
                selector = context + " " + selector;
                contexts = [document];
                break;

            case "object":
                if (context.nodeType) {
                    // HTMLElement
                    contexts = [context];
                } else {
                    // assert HTMLElement Array or NodeList
                    contexts = context;
                }
        }

        selectors = replaceAttrPseudo(trim(selector)).split(",");
        context = contexts;

        // each selector split by comma
        for (i = 0, j = selectors.length; i < j; i++) {
            selector = selectors[i];

            // relative rule array 
            // add defalut rule " "
            rules = (" " + selector).match(RE_RULE);

            // selector on both sides of relative rule  
            selector = selector.match(RE_N_RULE);

            // selector start with relative rule
            // remove defalut rule " "
            if (rules.length > selector.length) {
                rules.shift();
            }

            contexts = context;

            // parse selector by each relative rule
            for (n = 0, m = rules.length; n < m; n++) {
                contexts = parse(selector[n], contexts, rules[n]);
            }

            // concat results of comma delimited selector
            results = results.concat(contexts);
        }

        if (j > 1) {
            // if here, may hava duplicate HTMLElement
            // remove duplicate
            return makeDiff(results);
        }

        return results;
    }

    //查询匹配的元素,返回数组(Array)
    Q.query = function (selector, context) {
        if (document.querySelectorAll && (!context || context.nodeType == 1)) {
            try {
                return makeArray((context || document).querySelectorAll(selector));
            } catch (e) { }
        }

        return query(selector, context);
    };

    //判断元素是否符合指定的选择器
    function matchesSelector(el, selector) {
        if (!el || el.nodeType !== 1) return false;

        var matches = el.matches || el.matchesSelector || el.webkitMatchesSelector || el.mozMatchesSelector || el.oMatchesSelector || el.msMatchesSelector;
        if (matches) return matches.call(el, selector);

        var pNode = el.parentNode, tmpNode;
        if (!pNode) {
            tmpNode = pNode = document.createElement("div");
            pNode.appendChild(el);
        }

        var matched = Q.query(selector, pNode).indexOf(el) != -1;
        if (tmpNode) tmpNode.removeChild(el);

        return matched;
    }

    Q.isMatch = matchesSelector;

    //根据 selector 获取匹配的元素列表
    //els: 要匹配的元素或元素列表
    Q.matches = function (els, selector) {
        return makeArray(els).filter(function (el) {
            return matchesSelector(el, selector);
        });
    };

})();

﻿/*
* Q.dom.js DOM操作
* author:devin87@qq.com
* update:2015/10/15 15:38
*/
(function (undefined) {
    "use strict";

    var window = Q.G,
        document = window.document,
        html = Q.html,
        head = Q.head,

        isArrayLike = Q.isArrayLike,
        extend = Q.extend,
        makeArray = Q.makeArray,

        is_quirk_mode = Q.quirk,
        browser_ie = Q.ie,

        view = Q.view;

    //----------------------- DOM操作 -----------------------

    //骆驼命名法
    function camelCase(key) {
        return key.replace(/-([a-z])/ig, function (s, s1) { return s1.toUpperCase(); });
    }

    var map_prop_name = {
        "class": "className",
        "for": "htmlFor",
        "html": "innerHTML"
    };

    var map_attr_name = {
        "className": "class",
        "htmlFor": "for"
    };

    //修正DOM属性名(property)
    function get_prop_name(name) {
        return map_prop_name[name] || name;
    }

    //修正HTML属性名(attribute)
    function get_attr_name(name) {
        return map_attr_name[name] || name;
    }

    //获取属性(attribute)值
    function get_attr(ele, key) {
        //for IE7-
        if (key == "style") return ele.style.cssText;

        return ele.getAttribute(get_attr_name(key));
    }

    //设置或移除属性(attribute)值
    function set_attr(ele, key, value) {
        if (value !== null) {
            //for IE7-
            if (key == "style") ele.style.cssText = value;
            else ele.setAttribute(get_attr_name(key), value);
        } else {
            ele.removeAttribute(get_attr_name(key));
        }
    }

    //获取或设置元素属性(attribute)值
    function attr(ele, key, value) {
        if (typeof key == "string") {
            if (value === undefined) return get_attr(ele, key);
            return set_attr(ele, key, value);
        }

        Object.forEach(key, function (k, v) {
            set_attr(ele, k, v);
        });
    }

    //获取或设置元素属性(property)值
    function prop(ele, key, value) {
        if (typeof key == "string") {
            key = get_prop_name(key);
            if (value === undefined) return ele[key];
            ele[key] = value;
        } else {
            Object.forEach(key, function (k, v) {
                ele[get_prop_name(k)] = v;
            });
        }
    }

    //是否支持通过设置css为null来取消内联样式
    function support_set_css_null() {
        var box = document.createElement("div");
        box.style.border = "1px solid red";

        try { box.style.border = null; } catch (e) { }

        return !box.style.border;
    }

    var SUPPORT_SET_CSS_NULL = support_set_css_null(),
        CSS_FLOAT_NAME,

        getComputedStyle,
        getStyleValue;

    //IE9+、w3c浏览器
    if (window.getComputedStyle) {
        CSS_FLOAT_NAME = "cssFloat";

        getComputedStyle = function (ele) {
            return window.getComputedStyle(ele, null);
        };

        //获取样式值
        getStyleValue = function (ele, styles, key) {
            return styles[key != "float" ? key : CSS_FLOAT_NAME];
        };
    } else {
        CSS_FLOAT_NAME = "styleFloat";

        //IE6、7、8 etc.
        getComputedStyle = function (ele) {
            return ele.currentStyle;
        };

        //单位转换
        var toPX = function (el, value) {
            var style = el.style, left = style.left, rsLeft = el.runtimeStyle.left;
            el.runtimeStyle.left = el.currentStyle.left;
            style.left = value || 0;

            var px = style.pixelLeft;
            style.left = left; //还原数据
            el.runtimeStyle.left = rsLeft; //还原数据

            return px + "px";
        };

        var map_border_width_fix = is_quirk_mode || browser_ie > 7 ? { thin: "1px", medium: "3px", thick: "5px" } : { thin: "2px", medium: "4px", thick: "6px" },

            RE_OPACITY_VALUE = /opacity=([^)]*)/;

        //获取样式值
        getStyleValue = function (ele, styles, key) {
            switch (key) {
                case "opacity":
                    var m = styles.filter.match(RE_OPACITY_VALUE);
                    return m ? (parseFloat(m[1]) || 0) / 100 : 1;
                case "float": return styles[CSS_FLOAT_NAME];
            }

            var value = styles[key];

            //转换可度量的值
            if (/(em|pt|mm|cm|pc|in|ex|rem|vw|vh|vm|ch|gr)$/.test(value)) {
                return toPX(ele, value);
            }

            //转换百分比，不包括字体
            if (/%$/.test(value) && key != "fontSize") {
                return getWidth(ele.parentNode) * parseFloat(value) / 100 + "px";
            }

            //计算边框宽度
            if (/^border.+Width$/.test(key)) {
                var borderStyle = key.replace("Width", "Style");
                return value == "medium" && styles[borderStyle] == "none" ? "0px" : map_border_width_fix[value] || value;
            }

            return value;
        };
    }

    //获取样式值并解析为数字
    function getStyleFloat(ele, key, styles) {
        return parseFloat(getStyleValue(ele, styles || getComputedStyle(ele), key)) || 0;
    }

    function getPaddingSize(ele, type) {
        return type == "Width" ? getStyleFloat(ele, "paddingLeft") + getStyleFloat(ele, "paddingRight") : getStyleFloat(ele, "paddingTop") + getStyleFloat(ele, "paddingBottom");
    }

    function getBorderSize(ele, type) {
        return type == "Width" ? getStyleFloat(ele, "borderLeftWidth") + getStyleFloat(ele, "borderRightWidth") : getStyleFloat(ele, "borderTopWidth") + getStyleFloat(ele, "borderBottomWidth");
    }

    //获取元素尺寸,不考虑怪异模式
    //type:  Width|Height
    //level: 0,1,2 => width,width+padding,width+padding+border;height类似
    function getSizeOf(ele, type, level) {
        if (ele == ele.window) return view["get" + type]();
        if (ele.body) return view["getScroll" + type]();

        var cssText;
        if (isHidden(ele)) {
            cssText = ele.style.cssText;
            ele.style.cssText = cssText + ";position: absolute; visibility: hidden;";
            cssShow(ele);
        }

        level = level || 0;

        //一些奇葩模式,比如IE11以IE7文档模式运行时,检测不到怪异模式,clientWidth也可能获取不到宽度
        var value = ele["offset" + type];
        if (value) {
            if (level < 2) value -= getBorderSize(ele, type);
            if (level < 1) value -= getPaddingSize(ele, type);
        } else {
            value = getStyleFloat(ele, type == "Width" ? "width" : "height");
            if (level > 0) value += getPaddingSize(ele, type);
            if (value > 1) value += getBorderSize(ele, type);
        }

        if (cssText != undefined) ele.style.cssText = cssText;

        return value;
    }

    //获取元素宽度
    function getWidth(ele, level) {
        return getSizeOf(ele, "Width", level);
    }

    //获取元素高度
    function getHeight(ele, level) {
        return getSizeOf(ele, "Height", level);
    }

    //获取或设置元素的宽度
    function width(ele, value, flag) {
        if (value === undefined) return getWidth(ele);

        setStyle(ele, "width", value + (flag ? getWidth(ele) : 0));
    }

    //获取或设置元素的高度
    function height(ele, value, flag) {
        if (value === undefined) return getHeight(ele);

        setStyle(ele, "height", value + (flag ? getHeight(ele) : 0));
    }

    //获取元素内部区域宽度(width+padding => clientWidth)
    function innerWidth(ele) {
        return getWidth(ele, 1);
    }

    //获取元素内部区域高度(height+padding => clientHeight)
    function innerHeight(ele) {
        return getHeight(ele, 1);
    }

    //获取元素外部区域宽度(width+padding+border => offsetWidth)
    function outerWidth(ele) {
        return getWidth(ele, 2);
    }

    //获取元素外部区域高度(height+padding+border => offsetHeight)
    function outerHeight(ele) {
        return getHeight(ele, 2);
    }

    //获取或设置元素宽高
    function size(ele, w, h, flag) {
        if (w === undefined && h === undefined) return { width: getWidth(ele), height: getHeight(ele) };

        if (w != undefined) width(ele, w, flag);
        if (h != undefined) height(ele, h, flag);
    }

    //获取元素当前样式(包括外部样式和嵌入样式)
    function getStyle(ele, key) {
        if (key == "width") return getWidth(ele) + "px";
        if (key == "height") return getHeight(ele) + "px";

        return getStyleValue(ele, getComputedStyle(ele), camelCase(key));
    }

    //移除指定内联样式
    function removeCss(ele, key) {
        if (SUPPORT_SET_CSS_NULL) {
            ele.style[key == "float" ? CSS_FLOAT_NAME : camelCase(key)] = null;
            return;
        }

        var cssText = ele.style.cssText;
        if (cssText) ele.style.cssText = cssText.drop(key + "(-[^:]+)?\\s*:[^;]*;?", "gi").trim();
    }

    //设置样式时以下值若是数字,则自动补上单位
    var map_css_require_unit = ["width", "height", "left", "right", "top", "bottom"].toMap(true);

    //设置元素的样式
    function setStyle(ele, key, value) {
        //移除指定内联样式
        if (value === null) return removeCss(ele, key);

        switch (key) {
            case "float": ele.style[CSS_FLOAT_NAME] = value; break;
            case "opacity":
                if (value <= 1) value *= 100;
                if (ele.style.opacity != undefined) ele.style.opacity = value / 100;
                else if (ele.style.filter != undefined) ele.style.filter = "alpha(opacity=" + value + ")";
                break;
            default: ele.style[camelCase(key)] = typeof value == "number" && map_css_require_unit[key] ? value + "px" : value; break;
        }
    }

    //获取或设置元素样式
    function css(ele, key, value) {
        if (typeof key == "string") {
            if (value === undefined) return getStyle(ele, key);
            return setStyle(ele, key, value);
        }

        Object.forEach(key, function (k, v) {
            setStyle(ele, k, v);
        });
    }

    //设置元素透明
    function setOpacity(ele, value) {
        setStyle(ele, "opacity", value);
    }

    var map_node_display = {};

    //获取元素默认display值  eg:tr => table-row
    function defaultDisplay(nodeName) {
        var display = map_node_display[nodeName];
        if (display) return display;

        var node = createEle(nodeName);
        Q.body.appendChild(node);

        display = getComputedStyle(node).display;
        if (!display || display == "none") display = "block";

        Q.body.removeChild(node);

        map_node_display[nodeName] = display;

        return display;
    }

    //元素是否隐藏
    function isHidden(ele) {
        return getComputedStyle(ele).display == "none";
    }

    //显示元素
    function cssShow(ele) {
        ele.style.display = "";

        if (isHidden(ele)) setStyle(ele, "display", defaultDisplay(ele.nodeName));
    }

    //隐藏元素
    function cssHide(ele) {
        ele.style.display = "none";
    }

    //自动判断并切换元素显示或隐藏
    function cssToggle(ele) {
        isHidden(ele) ? cssShow(ele) : cssHide(ele);
    }

    var DEF_OFFSET = { left: 0, top: 0 };

    //获取元素偏移 {left,top,width,height}
    function getOffset(ele) {
        if (!ele) return;

        var root = Q.root;
        if (ele == root) return DEF_OFFSET;

        //support:IE6+ | FF3.0+ | Chrome1+ | Safari4+ | Opera9.5+
        //在IE、Firefox、Opera中getBoundingClientRect性能比offset迭代(offsetLeft、offsetTop)快1-4倍,Chrome中2者差不多
        //bug:IE6、7会多出2px,IE8在根元素上会少2px,使用 css: html{margin:0;}后,IE7、8问题依旧,IE6(XP)会在body上多出2px
        var rect = ele.getBoundingClientRect(),

            left = rect.left + (window.pageXOffset || root.scrollLeft) - root.clientLeft,
            top = rect.top + (window.pageYOffset || root.scrollTop) - root.clientTop;

        //仅IE7根元素得出的宽高不包括滚动条的宽高
        return { left: left, top: top };
    }

    //设置元素偏移
    function setOffset(ele, x, y, f) {
        var fix = { left: 0, top: 0 };
        if (f) fix = getOffset(ele);

        setCssIfNot(ele, "position", "absolute");

        if (x !== undefined) setStyle(ele, "left", x + fix.left);
        if (y !== undefined) setStyle(ele, "top", y + fix.top);
    }

    //获取或设置元素偏移
    function offset(ele, x, y, f) {
        if (x === undefined && y === undefined) return getOffset(ele);

        setOffset(ele, x, y, f)
    }

    //获取相对pNode元素的偏移
    function getPos(ele, pNode) {
        if (!pNode) pNode = ele.offsetParent;

        var offset = getOffset(ele),
            poffset = getOffset(pNode) || DEF_OFFSET;

        offset.left -= poffset.left + getStyleFloat(pNode, "borderLeftWidth") + getStyleFloat(ele, "marginLeft");
        offset.top -= poffset.top + getStyleFloat(pNode, "borderTopWidth") + getStyleFloat(ele, "marginTop");

        return offset;
    }

    //当元素的css值与要设置的css值不同时,设置css
    function setCssIfNot(ele, key, value) {
        if (ele && getStyle(ele, key) != value) setStyle(ele, key, value);
    }

    //设置元素居中显示(absolute定位)
    function setCenter(ele, onlyPos) {
        setCssIfNot(ele, "position", "absolute");

        var size = view.getSize(),
            offset = getOffset(ele.offsetParent) || DEF_OFFSET,

            left = Math.round((size.width - outerWidth(ele)) / 2) - offset.left + view.getScrollLeft(),
            top = Math.round((size.height - outerHeight(ele)) / 2) - offset.top + view.getScrollTop(),

            pos = { left: Math.max(left, 0), top: Math.max(top, 0) };

        return onlyPos ? pos : css(ele, pos);
    }

    //获取元素居中坐标
    function getCenter(ele) {
        return setCenter(ele, true);
    }

    var NODE_PREV = "previousSibling",
        NODE_NEXT = "nextSibling",
        NODE_FIRST = "firstChild",
        NODE_LAST = "lastChild",
        NODE_PARENT = "parentNode";

    //遍历元素节点
    function walk(ele, walk, start, all) {
        var el = ele[start || walk];
        var list = [];
        while (el) {
            if (el.nodeType == 1) {
                if (!all) return el;
                list.push(el);
            }
            el = el[walk];
        }
        return all ? list : null;
    }

    //获取上一个元素节点
    function getPrev(ele) {
        return ele.previousElementSibling || walk(ele, NODE_PREV, null, false);
    }

    //获取在当前节点之前的所有元素节点
    function getAllPrev(ele) {
        return walk(ele, NODE_PREV, null, true);
    }

    //获取下一个元素节点
    function getNext(ele) {
        return ele.nextElementSibling || walk(ele, NODE_NEXT, null, false);
    }

    //获取在当前节点之后的所有元素节点
    function getAllNext(ele) {
        return walk(ele, NODE_NEXT, null, true);
    }

    //获取第一个元素子节点
    function getFirst(ele) {
        return ele.firstElementChild || walk(ele, NODE_NEXT, NODE_FIRST, false);
    }

    //获取最后一个元素子节点
    function getLast(ele) {
        return ele.lastElementChild || walk(ele, NODE_PREV, NODE_LAST, false);
    }

    //获取父节点
    function getParent(ele) {
        return walk(ele, NODE_PARENT, null, false);
    }

    //获取所有父节点(父节点及父节点的父节点等等)
    function getParents(ele) {
        return walk(ele, NODE_PARENT, null, true);
    }

    //获取所有子元素节点
    function getChilds(ele) {
        //walk方式性能要好于通过childNodes筛选
        return ele.children ? makeArray(ele.children) : walk(ele, NODE_NEXT, NODE_FIRST, true);
    }

    //根据标签名获取标签,若当前节点不匹配,则从父节点往上查找
    //tagName:标签名,大写
    function findTag(ele, tagName) {
        while (ele && ele.tagName != "BODY") {
            if (ele.tagName == tagName) return ele;
            ele = ele.parentNode;
        }
    }

    //创建元素
    function createEle(tagName, className, html) {
        var ele = document.createElement(tagName);
        if (className) ele.className = className;
        if (html) ele.innerHTML = html;

        return ele;
    }

    //解析html为元素,默认返回第一个元素节点
    //all:是否返回所有节点(childNodes)
    function parseHTML(html, all) {
        var _pNode = createEle("div", undefined, html);

        return all ? _pNode.childNodes : getFirst(_pNode);
    }

    //移除节点
    //node:要移除的节点
    function removeEle(node) {
        if (!node) return;

        var pNode = node.parentNode;
        if (pNode) pNode.removeChild(node);
    }

    //元素包含比较
    var containsNode;
    if (html.contains) {
        containsNode = function (ele, node) {
            return ele.contains(node);
        }
    } else {
        containsNode = function (ele, node) {
            return !!(this.compareDocumentPosition(node) & 16);
        }
    }

    //动态创建样式
    function createStyle(cssText) {
        var style = createEle("style");
        style.type = "text/css";

        if (style.styleSheet) style.styleSheet.cssText = cssText;
        else style.appendChild(document.createTextNode(cssText));

        head.appendChild(style);

        return style;
    }

    var hasClass, addClass, removeClass, replaceClass, toggleClass;

    if (isArrayLike(html.classList)) {
        hasClass = function (ele, clsName) {
            return ele.classList.contains(clsName);
        };

        addClass = function (ele, clsName) {
            ele.classList.add(clsName);
        };

        removeClass = function (ele, clsName) {
            ele.classList.remove(clsName);
        };

        replaceClass = function (ele, oldName, clsName) {
            ele.classList.remove(oldName);
            ele.classList.add(clsName);
        };

        toggleClass = function (ele, clsName) {
            ele.classList.toggle(clsName);
        };
    } else {
        //操作元素className
        //delName:要删除的className
        //addName:要添加的className
        var set_className = function (ele, delName, addName) {
            var className = ele.className,
                list = className.split(" "),
                len = list.length,
                i = 0;

            if (!delName) {
                for (; i < len; i++) {
                    if (list[i] == addName) return;
                }

                className += " " + addName;
            } else {
                var hasName = false, classList = [];
                for (; i < len; i++) {
                    if (list[i] != delName) classList.push(list[i]);
                    else if (list[i] == addName) hasName = true;
                }

                if (!hasName && addName) classList.push(addName);
                className = classList.join(" ");
            }

            ele.className = className.trim();
        };

        hasClass = function (ele, clsName) {
            return (ele.className + " ").contains(clsName + " ");
        };

        addClass = function (ele, clsName) {
            set_className(ele, undefined, clsName);
        };

        removeClass = function (ele, clsName) {
            set_className(ele, clsName, "");
        };

        replaceClass = function (ele, oldName, clsName) {
            set_className(ele, oldName, clsName);
        };

        toggleClass = function (ele, clsName) {
            hasClass(ele, clsName) ? removeClass(ele, clsName) : addClass(ele, clsName);
        };
    }

    //---------------------- 其它 ----------------------

    //将输入框样式设为错误模式
    function setInputError(input, hasBorder) {
        if (hasBorder) input.style.borderColor = "red";
        else input.style.border = "1px solid red";

        input.value = "";
        input.focus();
    }

    //恢复输入框默认样式
    function setInputDefault(input) {
        removeCss(input, "border");
    }

    //------------------------- export -------------------------

    extend(Q, {
        camelCase: camelCase,

        attr: attr,
        prop: prop,

        width: width,
        height: height,
        innerWidth: innerWidth,
        innerHeight: innerHeight,
        outerWidth: outerWidth,
        outerHeight: outerHeight,
        size: size,

        getStyle: getStyle,
        setStyle: setStyle,
        setOpacity: setOpacity,
        removeCss: removeCss,
        css: css,

        show: cssShow,
        hide: cssHide,
        toggle: cssToggle,
        isHidden: isHidden,

        offset: offset,
        getPos: getPos,

        setCssIfNot: setCssIfNot,
        setCenter: setCenter,
        getCenter: getCenter,

        walk: walk,
        getPrev: getPrev,
        getAllPrev: getAllPrev,
        getNext: getNext,
        getAllNext: getAllNext,
        getFirst: getFirst,
        getLast: getLast,
        getParent: getParent,
        getParents: getParents,
        getChilds: getChilds,

        findTag: findTag,
        createEle: createEle,
        parseHTML: parseHTML,
        removeEle: removeEle,
        containsNode: containsNode,
        createStyle: createStyle,

        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        replaceClass: replaceClass,
        toggleClass: toggleClass,

        setInputError: setInputError,
        setInputDefault: setInputDefault
    });

})();

﻿/*
* Q.event.js 事件处理
* author:devin87@qq.com  
* update:2016/01/14 10:47
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
        self.currentTarget = self.target = target;
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
                return fn.call(target, e);
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
                target;

            if (selector) {
                target = get_target(ele, e.target, selector);
                if (!target) return;

                e.currentTarget = target;
            }

            if (fn.call(target || ele, e) === false) e.stop();
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
        return add_events(elements, types, selector, handle, true);
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

﻿/*
* Q.ajax.js Ajax & JSONP
* author:devin87@qq.com  
* update:2015/09/08 09:35
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
            //head.removeChild(script);
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

﻿/*
* Q.$.js DOM操作
* author:devin87@qq.com  
* update:2016/01/14 10:48
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

    function makeEls(el) {
        if (!el) return [];

        return el.list || query(el);
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
        },

        //判断元素是否隐藏
        isHidden: function () {
            return this.list.every(Q.isHidden);
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
        //此处与jquery不同,若ele为选择器,则仅追加到第一个匹配的元素
        sp[name] = function (ele) {
            var el = makeEls(ele)[0];

            return el ? this.each(function () {
                insertEle(el, where, this);
            }) : this;
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

        sp[name] = function () {
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

﻿/*
* Q.animate.js 动画 from mojoFx v1.2
* Copyright (c) 2010 scott.cgi

* author:devin87@qq.com
* update:2015/10/08 10:50
*/
(function (undefined) {
    "use strict";

    var isNum = Q.isNum,
        isHidden = Q.isHidden,
        getStyle = Q.getStyle,
        makeArray = Q.makeArray,

        cssShow = Q.show,
        cssHide = Q.hide;

    var

		mojoFx = function (arg) {
		    return new moFx(arg);
		},

		/**
		 * Animation object inculde HTMLElements and animation API
		 * 
		 * @param {Array | NodeList | HTMLElement} arg
		 */
		moFx = function (arg) {
		    this.elements = makeArray(arg);
		},

		joFx = {

		    easing: {
		        /**
                 * @param {Number} t	current time   
                 * @param {Number} b	beginning value 
                 * @param {Number} c	change value    
                 * @param {Number} d	duration        
                 */
		        swing: function (t, b, c, d) {
		            return ((-Math.cos(t / d * Math.PI) / 2) + 0.5) * c + b;
		        }
		    },

		    // animation executor time id
		    timeId: 0,

		    // current animation elements
		    animEls: [],

		    /**
			 * Get the animation data on element
			 * 
			 * @param {HTMLElement} el HLTMLElement
			 * @return {Object}        Animation data
			 */
		    getElData: function (el) {
		        var x;
		        if (!(x = el.mojoData)) {
		            x = el.mojoData = {};
		        }

		        if (!x.mojoFx) {
		            x.mojoFx = {
		                // animation queue
		                queue: [],

		                // current animation steps
		                current: [],

		                // current animation queue step
		                curStep: [],

		                // whether delay animation queue
		                isDelay: false,

		                // whether the element in animation array
		                isAnim: false
		            };
		        }

		        return x.mojoFx;
		    },

		    /**
			 * Add elements into global animation array
			 * And elements animation step
			 * 
			 * @param {Array}              els  Array of HTMLElement
			 * @param {Object | Undefined} cfg  Animation configuration object
			 * @return {Object} joFx
			 */
		    add: function (els, cfg) {
		        var
					aEls = this.animEls,
					len = els.length,
					i = 0,
					el, data;

		        cfg.els = els;

		        for (; i < len; i++) {
		            el = els[i];

		            data = this.getElData(el);

		            if (!data.isAnim) {
		                aEls.push(el);
		                data.isAnim = true;
		            }

		            cfg.isQueue ? data.queue.push(cfg) : data.current.push(this.getElStep(el, cfg));
		        }

		        return this;
		    },

		    /**
			 * Get animation step array
			 * 
			 * @param {HTMLElement} el  HTMLElement
			 * @param {Object}      cfg Animation configuration object
			 * @return {Array}          Animation queue step
			 */
		    getElStep: function (el, cfg) {
		        var
					step = [],
					easing, prop, fxs,
					p, val, fx;

		        step.cfg = {
		            t: 0,
		            d: cfg.duration,
		            args: cfg.args,
		            callback: cfg.callback
		        };

		        if (cfg.prop) {
		            fxs = cfg.fxs;
		        } else {
		            // step only has callback function	
		            return step;
		        }

		        if (!fxs) {
		            fxs = [];
		            prop = cfg.prop;
		            easing = cfg.easing;

		            var hidden = isHidden(el);

		            for (p in prop) {
		                // each property animation bind to object
		                fx = {};

		                // property name
		                fx.name = p;
		                // easing type
		                fx.easing = easing;
		                // property value
		                val = prop[p];

		                if (val == "toggle") val = hidden ? "show" : "hide";

		                switch (val) {
		                    case "show":
		                        val = this.getElStyle(el, p);
		                        cfg._show = true;
		                        break;
		                    case "hide":
		                        val = 0;
		                        cfg._hide = true;
		                        break;
		                }

		                switch (typeof val) {
		                    case "number":
		                        fx.symbol = "";
		                        fx.val = val;
		                        fx.unit = "px";
		                        break;

		                        // Property value is an array
		                        // the 2nd parameter is easing	
		                    case "object":
		                        if (val.length > 1) {
		                            fx.easing = val[1];
		                        }
		                        val = val[0];
		                        // here no break

		                    case "string":
		                        if (p.toLowerCase().indexOf("color") === -1) {
		                            val = /(\+=|-=)?(-?\d+)(\D*)/.exec(val) || ["", 0];
		                            fx.symbol = val[1];
		                            fx.val = val[2] || 0;
		                            fx.unit = val[3] || "px";

		                            // color property					
		                        } else {
		                            fx.val = val;
		                            // unit use "#" when color property
		                            fx.unit = "#";
		                        }
		                }

		                fxs.push(fx);
		            }

		            cfg.fxs = fxs;
		        }

		        var data = this.getElData(el);
		        data._show = cfg._show;
		        data._hide = cfg._hide;

		        return this.setBc(el, fxs, step);
		    },

		    /**
			 * Set animation step begin and change value
			 * 
			 * @param  {HTMLElement} el    HTMLElement
			 * @param  {Array}       fxs   Property animation configuration 
			 * @return {Array}             Animation step
			 */
		    setBc: function (el, fxs, step) {
		        var hidden = isHidden(el),
					len = fxs.length,
					i = 0,
					undefined,
					fx, b, c, p, u;

		        for (; i < len; i++) {
		            fx = fxs[i];

		            p = fx.name;
		            c = fx.val;
		            u = fx.unit;

		            if (u !== "#") {
		                if (hidden) b = 0;
		                else {
		                    // element style property
		                    if (el[p] === undefined) {
		                        // get current style value
		                        b = parseFloat(this.getElStyle(el, p));
		                        if (isNaN(b)) {
		                            b = 0;
		                        }

		                    } else {
		                        b = el[p];
		                        // unit use "&" when not style property
		                        u = "&";
		                    }
		                }

		                // set change value by symbol
		                switch (fx.symbol) {
		                    case "+=":
		                        c = c * 1;
		                        break;

		                    case "-=":
		                        c = c * 1 - c * 2;
		                        break;

		                    default:
		                        c = c * 1 - b;
		                }

		                if (c === 0) {
		                    continue;
		                }

		            } else {
		                b = this.getRgb(this.getElStyle(el, p));
		                c = this.getRgb(c);

		                // RGB value
		                c[0] -= b[0];// red
		                c[1] -= b[1];// green
		                c[2] -= b[2];// blue

		                if (c.join("") === "000") {
		                    continue;
		                }
		            }

		            step.push({
		                p: p.replace(/[A-Z]/g, "-$&"),
		                b: b,
		                c: c,
		                u: u,
		                e: this.easing[fx.easing]
		            });
		        }

		        return step;
		    },

		    /**
			 * Start global animation executor
			 */
		    start: function () {
		        var
				    self, start;

		        if (!this.timeId) {
		            self = this;
		            start = Date.now();

		            this.timeId = window.setInterval(function () {
		                var end = Date.now();
		                self.updateEl(end - start);
		                start = end;
		            }, 13);
		        }
		    },

		    /**
			 * Update element style
			 * 
			 * @param {Number} stepTime  Each step interval 
			 */
		    updateEl: function (stepTime) {
		        var
					aEls = this.animEls,
					len = aEls.length,
					i = 0,
					el, que, cur, curStep, data;

		        for (; i < len; i++) {
		            el = aEls[i];

		            data = this.getElData(el);

		            // element animation queue
		            que = data.queue;
		            // current animation steps
		            cur = data.current;

		            // current step of element animation queue 
		            if (!(curStep = data.curStep).length && que.length && !data.isDelay) {
		                curStep = data.curStep = this.getElStep(el, que.shift());
		                cur.push(curStep);
		            }

		            if (cur.length) {
		                if (!data.started) {
		                    data.started = true;

		                    if (data._show && isHidden(el)) cssShow(el);

		                    if (data._show || data._hide) {
		                        data.cssText = el.style.cssText;
		                        el.style.overflow = "hidden";
		                    }
		                }

		                this.step(el, cur, stepTime);
		            } else {
		                // element animation complete
		                aEls.splice(i--, 1);
		                data.isAnim = false;

		                // global animation complete
		                if ((len = aEls.length) === 0) {
		                    window.clearInterval(this.timeId);
		                    this.timeId = 0;
		                    return;
		                }
		            }
		        }
		    },

		    /**
			 * Update each current animation step's value
			 * 
			 * @param {HTMLElement} el     HTMLElement
			 * @param {Array}       steps  Current animation steps array
			 */
		    step: function (el, steps, stepTime) {
		        var
					sty = "",
					len = steps.length,
					cfgs = [],
					i = 0,
					step, cfg, d, t;

		        for (i = 0; i < len; i++) {
		            step = steps[i];
		            cfg = step.cfg;

		            if (step.length) {

		                t = cfg.t += stepTime;
		                d = cfg.d;

		                if (t < d) {
		                    sty += this.getCssText(el, step, t, d);
		                    continue;
		                } else {
		                    t = d;
		                    sty += this.getCssText(el, step, t, d);
		                }
		            }

		            // aniamtion property already complete 
		            // or current step just only has callback function					
		            steps.splice(i--, 1);
		            len--;
		            step.length = 0;
		            cfgs.push(cfg);
		        }

		        el.style.cssText += sty;

		        for (i = 0, len = cfgs.length; i < len; i++) {
		            cfg = cfgs[i];

		            //清理工作
		            var data = this.getElData(el);
		            if (data.cssText != undefined) el.style.cssText = data.cssText;

		            if (data._show) cssShow(el);
		            else if (data._hide) cssHide(el);

		            data.started = data.cssText = data._show = data._hide = undefined;

		            if (cfg.callback) {
		                // execute callback function
		                cfg.callback.apply(el, cfg.args);
		            }
		        }
		    },

		    /**
			 * Get element style cssText
			 * 
			 * @param {HTMLElement} el
			 * @param {Array}       step
			 * @param {Number}      t
			 * @param {Number}      d
			 */
		    getCssText: function (el, step, t, d) {
		        var
					sty = ";",
					len = step.length,
					i = 0,
					f, p, b, c, u, e;

		        for (; i < len; i++) {
		            f = step[i];

		            p = f.p;
		            b = f.b;
		            c = f.c;
		            u = f.u;
		            e = f.e;

		            switch (u) {
		                case "&":
		                    el[p] = e(t, b, c, d);
		                    continue;

		                case "#":
		                    sty += p + ":rgb(" +
								   Math.ceil(e(t, b[0], c[0], d)) + "," +
								   Math.ceil(e(t, b[1], c[1], d)) + "," +
								   Math.ceil(e(t, b[2], c[2], d)) + ");";
		                    break;

		                default:
		                    if (p === "opacity") {
		                        p = e(t, b, c, d);
		                        sty += "opacity:" + p + ";filter:alpha(opacity=" + p * 100 + ");";
		                    } else {
		                        sty += p + ":" + e(t, b, c, d) + u + ";";
		                    }
		            }
		        }

		        return sty;
		    },

		    /**
			 * Stop elements animation
			 * 
			 * @param {Object}  els         HTMLElement array
			 * @param {Boolean} clearQueue  Clear element animation queue
			 * @return {Object} joFx
			 */
		    stop: function (els, clearQueue) {
		        var
					len = els.length,
					i = 0,
					el, data;

		        for (; i < len; i++) {
		            el = els[i];
		            data = this.getElData(el);

		            data.curStep.length = 0;
		            data.current.length = 0;

		            if (clearQueue) {
		                data.queue.length = 0;
		            }
		        }

		        return this;
		    },

		    /**
			 * Get property value of element css style
			 * 
			 * @param  {HTMLElement} el HTMLElement
			 * @param  {String}      p	Css property name
			 * @return {String} 	    Css property value			
			 */
		    //getElStyle: window.getComputedStyle ?
		    //	function (el, p) {
		    //	    return el.style[p] || window.getComputedStyle(el, null)[p];
		    //	} :
		    //	function (el, p) {
		    //	    if (p === "opacity") {
		    //	        return (el.filters.alpha ? el.filters.alpha.opacity : 100) / 100;
		    //	    }

		    //	    return el.style[p] || el.currentStyle[p];
		    //	},
		    getElStyle: function (el, p) {
		        return el.style[p] || getStyle(el, p);
		    },

		    /**
			 * Get color property value to decimal RGB array
			 * 
			 * @param  {String} color Css color style value
			 * @return {Array}     	  Decimal RGB value array
			 */
		    getRgb: function (color) {
		        var
					rgb, i;

		        if (color.charAt(0) === "#") {
		            // #000
		            if (color.length === 4) {
		                color = color.replace(/\w/g, "$&$&");
		            }

		            rgb = [];

		            // #000000
		            for (i = 0; i < 3; i++) {
		                rgb[i] = parseInt(color.substring(2 * i + 1, 2 * i + 3), 16);
		            }

		            // rgb(0,0,0)
		        } else {
		            if (color === "transparent" || color === "rgba(0, 0, 0, 0)") {
		                rgb = [255, 255, 255];
		            } else {
		                rgb = color.match(/\d+/g);
		                for (i = 0; i < 3; i++) {
		                    rgb[i] = parseInt(rgb[i]);
		                }
		            }
		        }

		        return rgb;
		    }

		};


    moFx.prototype = {
        /**
         * Custom animation property and fire it
         * 
         * @param  {Object} prop  HTMLElement style configuration object
         * @return {Object} moFx
         */
        anim: function (prop) {
            var
                // animation configuration object
                cfg = {
                    prop: prop,

                    duration: 400,

                    callback: null,

                    easing: "swing",

                    // whether current animation enter queue 
                    isQueue: true,

                    // arguments of callback funtion
                    args: []
                },
                len = arguments.length,
                i = 1,
                param;

            for (; i < len; i++) {
                param = arguments[i];
                switch (typeof param) {
                    case "number":
                        cfg.duration = param;
                        break;

                    case "string":
                        cfg.easing = param;
                        break;

                    case "function":
                        cfg.callback = param;
                        break;

                    case "boolean":
                        cfg.isQueue = param;
                        break;

                    case "object":
                        if (param.length) {
                            // assert param is array
                            cfg.args = param;
                        }
                }
            }

            // bind configuration object to element
            // set element into global animation array
            // start animation
            joFx.add(this.elements, cfg).start();

            return this;
        },

        /**
         * Stop elements animation
         * 
         * @param {Boolean} clearQueue  Clear element animation queue	 
         * @return {Object} moFx
         */
        stop: function (clearQueue) {
            joFx.stop(this.elements, clearQueue);
            return this;
        },

        /**
         * Set a timer to delay execution aniamtion queue
         * 
         * @param {Number} t     Delay times
         * @return{Object} moFx
         */
        delay: function (t) {
            joFx.add(this.elements, {
                args: [t, joFx, joFx.animEls],
                isQueue: true,
                callback: function (t, joFx, aEls) {
                    var
                        data = joFx.getElData(this),
                        el = this;
                    data.isDelay = true;
                    window.setTimeout(function () {
                        if (!data.isAnim) {
                            aEls.push(el);
                            data.isAnim = true;
                        }
                        data.isDelay = false;
                        joFx.start();
                    }, t);
                }
            });

            return this;
        }
    };

    /**
     * Extend public API
     */
    mojoFx.extend = function (o) {
        var p;
        for (p in o) {
            this[p] = o[p];
        }

        return this;
    };


    mojoFx.extend({
        info: {
            author: "scott.cgi",
            version: "1.2.0"
        },

        /**
         * Add easing algorithm
         */
        addEasing: function () {
            var
                easing = joFx.easing,
                p, o;

            switch (arguments.length) {
                case 1:
                    o = arguments[0];
                    for (p in o) {
                        easing[p] = o[p];
                    }
                    break;

                case 2:
                    p = arguments[0];
                    o = arguments[1];
                    easing[p] = o;
            }

            return this;
        }
    });

    //------------------------- export -------------------------

    var cssExpand = ["Top", "Right", "Bottom", "Left"];

    var fxSpeeds = {
        slow: 600,
        fast: 200,

        _def: 400
    };

    function genFx(type, includeWidth) {
        var which,
            attrs = { height: type },
            i = 0;

        // if we include width, step value is 1 to do all cssExpand values,
        // if we don't include width, step value is 2 to skip over Left and Right
        includeWidth = includeWidth ? 1 : 0;
        for (; i < 4 ; i += 2 - includeWidth) {
            which = cssExpand[i];
            attrs["margin" + which] = attrs["padding" + which] = type;
        }

        if (includeWidth) {
            attrs.opacity = attrs.width = type;
        }

        return attrs;
    }

    function animate(el, props, speed, easing, callback) {
        mojoFx(el).anim(props, isNum(speed, 0) ? speed : speed && fxSpeeds[speed] || fxSpeeds["_def"], easing, callback);
    }

    var domFn = Q.$.fn;

    domFn.extend({
        animate: function (props, speed, easing, callback) {
            if (this.list.length > 0) animate(this.list, props, speed, easing, callback);
            return this;
        }
    });

    ["toggle", "show", "hide"].forEach(function (name) {
        var cssFn = domFn[name];

        domFn[name] = function (speed, easing, callback) {
            if (speed == null || typeof speed === "boolean") {
                joFx.stop(this.list, true);
                return cssFn.apply(this);
            }

            return this.animate(genFx(name, true), speed, easing, callback);
        };
    });

    Object.forEach({
        slideDown: genFx("show"),
        slideUp: genFx("hide"),
        slideToggle: genFx("toggle"),
        fadeIn: { opacity: "show" },
        fadeOut: { opacity: "hide" },
        fadeToggle: { opacity: "toggle" }
    }, function (name, props) {
        domFn[name] = function (speed, easing, callback) {
            return this.animate(props, speed, easing, callback);
        };
    });

    var setCenter = Q.setCenter;

    //元素居中动画
    domFn.center = function (speed, easing, callback) {
        var self = this,
            isNoAnim = speed == null || typeof speed === "boolean";

        if (isNoAnim) joFx.stop(self.list, true);

        return this.each(function (i, el) {
            isNoAnim ? setCenter(el) : animate(el, setCenter(el, true), speed, easing, callback);
        });
    };

    Q.Fx = joFx;
    Q.fx = mojoFx;

})();