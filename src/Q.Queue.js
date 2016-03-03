/// <reference path="Q.js" />
/*
* Q.Queue.js 队列
* author:devin87@qq.com
* update:2016/03/03 17:54
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

        self.addList(tasks);
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
                if (!data) data = {};

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