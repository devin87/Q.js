/// <reference path="Q.$.js" />
/*
* Q.setTimer.js 计时器
* author:devin87@qq.com
* update:2017/11/22 15:14
*/
(function (undefined) {
    "use strict";

    var fire = Q.fire;

    //---------------------- 计时器 ----------------------

    //计时器
    //ops: { box:".uptime",time:1566, pad:true, step:1, sleep:1000, join:"",units:["天", "时", "分", "秒"],process:function(total, text, days, hours, mintues, seconds){} }
    function setTimer(ops) {
        var box = ops.box,
            process = ops.process,

            length = ops.pad ? 2 : 1,

            time = ops.time,
            step = ops.step || 1,
            sleep = ops.sleep || 1000,
            max = +ops.max || 0,

            str_join = ops.join || "",

            units = ops.units || ["天", "小时", "分", "秒"];

        if ((!box && !process) || time == undefined || isNaN(time)) return;

        var total = +time, timer;

        var pad = function (n, len) {
            return n > 9 || len == 1 ? n : "0" + n;
        };

        var update = function () {
            total += step;
            if (total < max) return fire(ops.over);

            if (timer) clearTimeout(timer);

            var t = Date.parts(total),
                days = t.days,
                hours = t.hours,
                mintues = t.mintues,
                seconds = t.seconds;

            var text = days + units[0] + str_join + pad(hours, length) + units[1] + str_join + pad(mintues, length) + units[2] + str_join + pad(seconds, length) + units[3],
                result = fire(process, undefined, total, text, days, hours, mintues, seconds);

            if (result !== false) {
                $(box).html(typeof result == "string" ? result : text);
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