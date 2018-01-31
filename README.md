# Q.js
js工具库，包括 原生对象扩展、通用方法、队列、JSON、Cookie、Storage、Ajax、JSONP、事件处理、DOM操作、动画等

### 原生对象扩展（优先使用浏览器原生实现）
```
Object:
  Object.create(obj)                   //创建一个拥有指定原型的对象
  Object.forEach(obj, fn, bind)        //遍历对象
  Object.keys(obj)                     //获取对象所有键
  Object.values(obj)                   //获取对象所有值
  Object.size(obj)                     //获取项数量
  Object.hasItem(obj)                  //对象是否拥有子项
  
String:
  str.trim()                           //去掉首尾空格
  str.repeat(n)                        //返回将本身重复n次的字符串 eg:"abc".repeat(2) => "abcabc"
  str.startsWith(str, index)           //是否以指定字符串开头
  str.endsWith(str, index)             //是否以指定字符串结尾
  str.contains(str, index)             //是否包含指定字符串
  str.drop(pattern, flags)             //删除指定字符串
  str.reverse()                        //字符串反转
  str.htmlEncode()                     //html编码 eg:\n => <br/>
  str.htmlDecode()                     //html解码 eg:<br/> => \n
  
Number:
  n.format(length, radix)              //将数字按长度和进制转换为一个长度不低于自身的字符串 eg:(13).format(4) ->'0013'
  
Array:
  Array.forEach(list, fn, bind)        //遍历数组
  Array.isArray(obj)                   //判断是否为数组
  
  arr.forEach(fn, bind)                //遍历数组
  arr.map(fn, bind)                    //返回经过函数(fn)处理后的新数组
  arr.indexOf(item, index)             //查找方法(顺序)
  arr.lastIndexOf(item, index)         //查找方法(倒序)
  arr.filter(fn, bind)                 //将所有在给定过滤函数中过滤通过的数组项创建一个新数组
  arr.every(fn, bind)                  //如果数组中的每一项都通过给定函数的测试,则返回true
  arr.some(fn, bind)                   //如果数组中至少有一个项通过了给出的函数的测试,则返回true
  arr.contains(item, index)            //数组中是否存在指定的项
  arr.get(index)                       //获取数组项,若index小于0,则从右往左获取
  arr.first()                          //获取数组第一项
  arr.last()                           //获取数组最后一项
  arr.del(index, n)                    //根据索引删除数组中的项

  //去掉数组中的重复项 eg:[0,"0",false,null,undefined] 不支持的特殊情况:[ new String(1), new Number(1) ]
  //如果是对象数组,可以指定对象的键 eg:[{id:1},{id:2}] -> ret.unique("id")
  arr.unique(prop)

  arr.clean()                          //去掉空的项,并返回一个新数组
  arr.items(prop, skipUndefined)       //根据指定的键或索引抽取数组项的值 eg:[{id:1,name:"aa"},{id:2,name:"bb"}].items("id")  => [1,2]
  
  //将数组转换为键值对
  //value:若为空,则使用数组索引;为处理函数,需返回包含键值的数组 eg: value(item,i) => [key,value]
  //["a","b"].toMap(true)  => {a:true,b:true}
  arr.toMap(value, ignoreCase)

  //将对象数组转换为键值对
  //propKey:对象中作为键的属性
  //propValue:对象中作为值的属性,若为空,则值为对象本身;若为true,则给对象添加index属性,值为对象在数组中的索引
  //[{id:1,name:"aa"},{id:2,name:"bb"}].toObjectMap("id","name") => {1:"aa",2:"bb"}
  arr.toObjectMap(propKey, propValue)
  
Date:
  Date.now()                         //获取当前日期和时间所代表的毫秒数 eg: 1512963200408
  Date.from(str)                     //将字符串解析为Date对象 eg: Date.from("2015年6月17日")
  Date.parts(seconds)                //将秒解析到对应的日期部分 eg:Date.parts(1000)  => {days:0,hours:0,minutes:16,seconds:40}

  date.isValid()                     //是否有效日期
  date.format(format, ops)           //格式化日期显示 eg: new Date().format("yyyy/MM/dd HH:mm:ss");
  date.add(part, n)                  //按照part(y|M|d|h|m|s|ms)添加时间间隔 eg: new Date().add("d",1) => 在当前时间基础上添加一天
  date.clone()                       //返回一个日期副本,对该副本所做的修改,不会同步到原日期
```

### 通用属性和方法
```
Q.html                               //html元素
Q.head                               //head元素
Q.strict                             //js是否处于严格模式
Q.quirk                              //网页是否按怪异模式渲染

Q.type(obj)                          //返回对象的类型 string|number|boolean|function|array|list（类数组）|arguments|node|window
Q.isFunc(obj)                        //检测是否为函数
Q.isObject(obj)                      //检测是否为对象
Q.isArray(obj)                       //检测是否为数组
Q.isArrayLike(obj)                   //检测是否为数组或类数组
Q.def(value, defValue)               //若value不为undefine,则返回value;否则返回defValue

//是否为数字,min、max可指定数字范围  eg:Q.isNum(1.2,0) => true
//max_decimal_len:最大小数长度 eg: Q.isNum(0.111,0,1,2) => false
Q.isNum(n, min, max, max_decimal_len)

Q.isUNum(n)                          //是否为大于0的数字
Q.isInt(n, min, max)                 //是否为整数
Q.isUInt(n)                          //是否为大于0的整数

//检测字符串是否为数字  eg: Q.checkNum("1.2") => true
//max_decimal_len:最大小数长度 eg: Q.checkNum("0.111",0,1,2) => false
Q.checkNum(str, min, max, max_decimal_len)
Q.checkInt(str, min, max)            //检测字符串是否为整数
Q.toUpper(str, defValue)             //将字符串转为大写,若str不是字符串,则返回defValue
Q.toLower(str, defValue)             //将字符串转为小写,若str不是字符串,则返回defValue
Q.toArray(obj, from)                 //转为数组
Q.makeArray(obj, from)               //将类数组对象转为数组,若对象不存在,则返回空数组
Q.arr(length, value, step)           //按条件产生数组 Q.arr(5,2,2) => [2,4,6,8,10]
Q.vals(list, prop, skipUndefined)    //根据指定的键或索引抽取数组项的值 eg::Q.vals([{id:1},{id:2}], "id")  =>  [1,2]
Q.alias(obj, name, aliasName)        //prototype 别名 eg:alias(Array,"forEach","each");

//扩展对象 eg: Q.extend({a:1,c:1},{a:2,b:2})  => {a:1,b:2,c:1}
//forced:是否强制扩展 eg: Q.extend({a:1,c:1},{a:2,b:2})  => {a:2,b:2,c:1}
Q.extend(dest, source, forced)

Q.clone(data)                        //数据克隆（for undefined、null、string、number、boolean、array、object）

Q.toMap(list, fv, ignoreCase)
Q.toObjectMap(list, propKey, propValue)

Q.sortNumber(list, prop, desc)       //将对象数组按数字排序 eg:Q.sortNumber([{id:2},{id:1}], "id")
Q.sortString(list, prop, desc)       //将对象数组按字符串排序
Q.sortDate(list, prop, desc)         //将对象数组按日期排序
Q.sortIP(list, prop, desc)           //将对象数组按IP排序
Q.sortList(list, type, prop, desc)   //type:排序类型 0:字符串排序|1:数字排序|2:日期排序|3:IP排序
Q.proxy(fn, bind)                    //返回一个绑定到指定作用域的新函数
Q.fire(fn, bind)                     //触发指定函数,如果函数不存在,则不触发
Q.delay(fn, bind, time, args)        //延迟执行,若fn未定义,则忽略
Q.async(fn, time)                    //异步执行,相当于setTimeout,但会检查fn是否可用
Q.waitFor(check, callback, timeout, sleep)  //等待达到条件或超时时,执行一个回调函数
Q.factory(init, Super)
Q.isIP(ip)                           //判断字符串是否符合IPv4格式
Q.isMail(str)                        //是否符合邮箱格式
Q.isPhone(str)                       //是否符合电话号码格式 18688889999 | 027-88889999-3912
Q.isTel(str)                         //是否符合手机号码格式 18688889999
Q.isMAC(str)                         //是否符合MAC地址格式 00:11:22:33:44:ff
Q.isHttpURL(url)                     //是否http路径(以 http:// 或 https:// 开头,不区分大小写)
Q.parseLevel(size, steps, limit)     //按照进制解析数字的层级 eg:时间转化 -> parseLevel(86400,[60,60,24]) => { value=1, level=3 }
Q.formatSize(size, ops)              //格式化数字输出,将数字转为合适的单位输出,默认按照1024层级转为文件单位输出

Q.ready(fn)
Q.param(obj)                         //编码或解码查询字符串
Q.join(url)                          //连接url和查询字符串
Q.parseHash(hash)                    //解析url hash eg:#net/config!/wan  => {nav:"#net/config",param:"wan"}
Q.getPageName(path)                  //获取页名称 eg:index.html
Q.loadJS(urls, callback, ops)        //加载JS文件
Q.loadCSS(urls, callback, ops)       //加载CSS文件
Q.isInputKey(code)                   //是否是输入按键
Q.isSameHost(url)                    //判断指定路径与当前页面是否同域(包括协议检测 eg:http与https不同域)
Q.clearSelection()                   //清除文本选区
```

### 队列
```
Q.Queue(ops)  //通用队列对象
Q.series(tasks, complete, ops, workerThread)  //函数排队执行
Q.parallel(tasks, complete, ops)              //函数并行执行
Q.ajaxQueue(ops)                              //ajax队列
```

### 浏览器识别
```
var engine = Q.engine;
engine.ie       =>  8
engine.ie8      =>  true
engine.trident  =>  true
engine.opera    =>  false
engine.gecko    =>  false
engine.webkit   =>  false
engine.name     =>  "trident"

```

### JSON
```
JSON.stringify(obj)                            //JSON编码
JSON.parse(text)                               //JSON解码
```

### Cookie
```
var cookie = Q.cookie;
cookie.get(key)
cookie.set(key, value, ops)
cookie.remove(key)
cookie.clear()
```

### Storage
```
Q.Storage(type, useCookie)
Q.store    //new Q.Storage("localStorage", true)
Q.session  //new Q.Storage("sessionStorage", true)

var store = new Q.Storage("localStorage", true);
store.support   =>  true|false
store.adapter   =>  storage|userdata|cookie|null

store.get(key, isJSON)
store.set(key, value)
store.remove(key)
store.clear()
```

### Ajax&JSONP
```
Q.getXHR()
Q.ajaxSetup(ops)
Q.ajax(url, ops)
Q.get(url, data, success, error)
Q.post(url, data, success, error)
Q.getJSON(url, data, success, error)
Q.postJSON(url, data, success, error)
Q.jsonp(url, data, success, error)

var queue = new Q.ajaxQueue({
    complete: function(){}
});

//code
Q.ajax(url, {
    type: "GET",
    data: { id: 0 },
    jsonp: "jsonpcallback",
    jsonpCallback: "_q_jsonp",
    charset: "utf-8",
    async: true,
    cache: true,
    timeout: 3000,

    queue: queue,    //队列接口
    
    headers: {},
    
    beforeSend: function(ops){},
    success: function(data, ops, xhr){},
    error: function(ops, xhr){},
    complete: function(ops, xhr){}
});
```

### 事件处理
```
var E = Q.event;
E.fix(e)                       //将原生event对象转换为封装的Q.Event对象
E.stop(e)                      //停止事件默认行为及传递
E.trigger(e)                   //触发事件

E.addEvent(ele, type, fn)      //添加事件，未做任何封装
E.removeEvent(ele, type, fn)   //移除事件，未做任何封装

E.add(elements, types, selector, handle) 
E.one(elements, types, selector, handle)

//code
var handle=E.add(document,"click",function(e){
  
});

//E.add会返回一个操作对象,调用off方法可取消事件绑定
handle.off();
```

### 视图大小
```
var view = Q.view;
view.getSize()
view.getWidth()
view.getHeight()
view.getScrollWidth()
view.getScrollHeight()
view.getScrollLeft()
view.getScrollTop()
```

### DOM操作
```
Q.camelCase(key)
Q.getStyle(ele, key)
Q.setStyle(ele, key, value)
Q.setOpacity(ele, value)
Q.removeCss(ele, key)
Q.show(ele)
Q.hide(ele)
Q.toggle(ele)
Q.isHidden(ele)
Q.offset(ele, x, y, f)
Q.getPos(ele, pNode)
Q.setCssIfNot(ele, key, value)
Q.getCenter(ele)
Q.setCenter(ele)
Q.getPrev(ele)
Q.getAllPrev(ele)
Q.getAllNext(ele)
Q.getFirst(ele)
Q.getLast(ele)
Q.getParent(ele)
Q.getParents(ele)
Q.getChilds(ele)
Q.findTag(ele, tagName)
Q.createEle(tagName, className, html)
Q.parseHTML(html, all)
Q.removeEle(node)
Q.containsNode(ele, node)
Q.createStyle(cssText)
Q.setInputError(input, hasBorder)
Q.setInputDefault(input)

Q.query(selector, context)
Q.matches(els, selector)

//$用法类jquery
var $el = $(selector,context);
$el.length

$el.extend(source, forced)
$el.size()
$el.get(i)
$el.each(fn)
$el.map(fn)
$el.filter(selector)
$el.find(selector)
$el.eq(i)
$el.first()
$el.last()
$el.on(types, selector, handle, once)
$el.off(types, selector)
$el.one(types, selector, handle)
$el.hover(selector, over, out)
$el.wrap(html)
$el.unwrap()
$el.wrapInner(html)
$el.wrapAll(html)
$el.children()
$el.isHidden()
$el.html(value)
$el.text(value)
$el.val(value)
$el.before(obj)
$el.prepend(obj)
$el.append(obj)
$el.after(obj)
$el.insertBefore(ele)
$el.prependTo(ele)
$el.appendTo(ele)
$el.insertAfter(ele)
$el.show(speed, easing, callback)
$el.hide(speed, easing, callback)
$el.toggle(speed, easing, callback)
$el.hasClass(clsName)
$el.addClass(clsName)
$el.removeClass(clsName)
$el.replaceClass(clsOld,clsNew)
$el.toggleClass(clsName)
$el.remove(ele)
$el.innerWidth()
$el.innerHeight()
$el.outerWidth()
$el.outerHeight()
$el.position()
$el.width(value)
$el.height(value)
$el.scrollTop()
$el.scrollLeft()
$el.attr(key, value)
$el.prop(key, value)
$el.css(key, value)
$el.offset()

$el.blur(selector, fn, ops)
$el.focus(selector, fn, ops)
$el.click(selector, fn, ops)
$el.dblclick(selector, fn, ops)
$el.mousedown(selector, fn, ops)
$el.mouseup(selector, fn, ops)
$el.mousemove(selector, fn, ops)
$el.mouseover(selector, fn, ops)
$el.mouseout(selector, fn, ops)
$el.mouseenter(selector, fn, ops)
$el.mouseleave(selector, fn, ops)
$el.change(selector, fn, ops)
$el.select(selector, fn, ops)
$el.submit(selector, fn, ops)
$el.keydown(selector, fn, ops)
$el.keypress(selector, fn, ops)
$el.keyup(selector, fn, ops)

$el.animate(props, speed, easing, callback)
$el.slideDown(speed, easing, callback)
$el.slideUp(speed, easing, callback)
$el.slideToggle(speed, easing, callback)
$el.fadeIn(speed, easing, callback)
$el.fadeOut(speed, easing, callback)
$el.fadeToggle(speed, easing, callback)
$el.center(speed, easing, callback)
```