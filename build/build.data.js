//build 配置文件
module.exports = {
    root: "../",
    
    concat: {
        title: "文件合并",

        dir: "src",

        list: [
            {
                src: [ "Q.js", "Q.Queue.js", "Q.query.js", "Q.core.js", "Q.dom.js", "Q.setTimer.js", "Q.event.js", "Q.ajax.js", "Q.$.js" ],
                dest: "Q.js"
            },
            {
                src: [ "Q.query.speedTest.js", "Q.query.js" ],
                dest: "lib/Q.query.js"
            }
        ],
        
        replace: [
            //移除\r字符
            [/\r/g, ""],
            //移除VS引用
            [/\/\/\/\s*<reference path="[^"]*" \/>\n/gi, ""]
        ]
    },

    cmd: [
        {
            title: "压缩js",

            //cmd: "java -jar D:\\tools\\compiler.jar --js=%f.fullname% --js_output_file=%f.dest%",
            cmd: "uglifyjs %f.fullname% -o %f.dest% -c -m",

            output:"dist",
            match: "*.js",

            replace: [
                //去掉文件头部压缩工具可能保留的注释
                [/^\/\*([^~]|~)*?\*\//, ""]
            ],

            //可针对单一的文件配置 before、after,def 表示默认
            before: [
                {
                    "def": "//devin87@qq.com\n",
                    "Q.js": "//Q.js devin87@qq.com\n//mojoQuery&mojoFx scott.cgi\n"
                },
                "//build:%NOW%\n"
            ]
        }
    ],
    
    run: ["concat", "cmd"]
};