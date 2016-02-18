# Q.js
js工具库，包括 原生对象扩展、通用方法、队列、JSON、Cookie、Storage、Ajax、JSONP、事件处理、DOM操作、动画等

###原生对象扩展（优先使用浏览器原生实现）
```
Object:
	Object.create(obj)
	Object.forEach(obj, fn, bind)
	Object.keys(obj)
	Object.values(obj)
	Object.size(obj)
	Object.hasItem(obj)
	
String:
	str.trim()
	str.repeat(n)
	str.startsWith(str, index)
	str.endsWith(str, index)
	str.contains(str, index)
	str.drop(pattern, flags)
	str.reverse()
	str.htmlEncode()
	str.htmlDecode()
	
Number:
	n.format(length, radix)
	
Array:
	Array.forEach(list, fn, bind)
	Array.isArray(obj)
	
	arr.forEach(fn, bind)
	arr.map(fn, bind)
	arr.indexOf(item, index)
	arr.lastIndexOf(item, index)
	arr.filter(fn, bind)
	arr.every(fn, bind)
	arr.some(fn, bind)
	arr.contains(item, index)
	arr.get(index)
	arr.first()
	arr.last()
	arr.del(index, n)
	arr.unique(prop)
	arr.clean()
	arr.items(prop, skipUndefined)       //[{id:1,name:"aa"},{id:2,name:"bb"}].items("id")  => [1,2]
	arr.toMap(value, ignoreCase)         //["a","b"].toMap(true)  => {a:true,b:true}
	arr.toObjectMap(propKey, propValue)  //[{id:1,name:"aa"},{id:2,name:"bb"}].toObjectMap("id","name") => {1:"aa",2:"bb"}
	
Date:
	Date.now()
	Date.from(str)             //Date.from("2015年6月17日")
	date.format(format, ops)   //格式化日期显示 eg:new Date().format("yyyy/MM/dd hh:mm:ss");
	date.add(part, n)          //按照part(y|M|d|h|m|s|ms)添加时间间隔
	Date.parts(seconds)        //将秒解析到对应的日期部分 eg:Date.parts(1000)  => {days:0,hours:0,mintues:16,seconds:40}
	date.clone()
```

###通用属性和方法
```
Q.html           //html元素
Q.head           //head元素
Q.strict         //js是否处于严格模式
Q.quirk          //网页是否按怪异模式渲染

Q.type(obj)
Q.isFunc(obj)
Q.isObject(obj)
Q.isArray(obj)
Q.isArrayLike(obj)
Q.def(value, defValue)
Q.isNum(n, min, max)          //是否为数字,min、max可指定数字范围  eg:Q.isNum(1.2,0) => true
Q.isUNum(n)                   //是否为大于0的数字
Q.isInt(n, min, max)          //是否为整数
Q.isUInt(n)                   //是否为大于0的整数
Q.checkNum(str, min, max)     //检测字符串是否为数字  eg: Q.checkNum("1.2") => true
Q.checkInt(str, min, max)     //检测字符串是否为整数
Q.toUpper(str, defValue)      //将字符串转为大写,若str不是字符串,则返回defValue
Q.toLower(str, defValue)
Q.toArray(obj, from)
Q.makeArray(obj, from)
Q.arr(length, value, step)         //按条件产生数组 Q.arr(5,2,2) => [2,4,6,8,10]
Q.vals(list, prop, skipUndefined)  //根据指定的键或索引抽取数组项的值 eg::Q.vals([{id:1},{id:2}], "id")  =>  [1,2]
Q.alias(obj, name, aliasName)
Q.extend(destination, source, forced)
Q.clone(data)
Q.toMap(list, fv, ignoreCase)
Q.toObjectMap(list, propKey, propValue)
Q.sortNumber(list, prop, desc)       //将对象数组按数字排序 eg:Q.sortNumber([{id:2},{id:1}], "id")
Q.sortString(list, prop, desc)
Q.sortDate(list, prop, desc)
Q.sortList(list, type, prop, desc)  //type:排序类型 0:字符串排序|1:数字排序|2:日期排序
Q.proxy(fn, bind)                   //返回一个绑定到指定作用域的新函数
Q.fire(fn, bind)                    //触发指定函数,如果函数不存在,则不触发
Q.delay(fn, bind, time, args)       //延迟执行,若fn未定义,则忽略
Q.async(fn, time)                   //异步执行,相当于setTimeout,但会检查fn是否可用
Q.waitFor(check, callback, timeout, sleep)  //等待达到条件或超时时,执行一个回调函数
Q.factory(init)
Q.isIP(ip)
Q.isMail(str)
Q.isPhone(str)
Q.isTel(str)
Q.isHttpURL(url)
Q.parseLevel(size, steps, limit) //按照进制解析数字的层级 eg:时间转化 -> parseLevel(86400,[60,60,24]) => { value=1, level=3 }
Q.formatSize(size, ops)          //格式化数字输出,将数字转为合适的单位输出,默认按照1024层级转为文件单位输出

Q.ready(fn)
Q.param(obj)            //编码或解码查询字符串
Q.join(url)             //连接url和查询字符串
Q.parseHash(hash)       //解析url hash eg:#net/config!/wan  => {nav:"#net/config",param:"wan"}
Q.getPageName(path)     //获取页名称 eg:index.html
Q.loadJS(urls, callback, ops)
Q.loadCSS(urls, callback, ops)
Q.isInputKey(code)      //是否是输入按键
Q.isSameHost(url)       //判断指定路径与当前页面是否同域(包括协议检测 eg:http与https不同域)
Q.clearSelection()      //清除文本选区
```

###队列
```
Q.Queue(ops)  //通用队列对象
Q.series(tasks, complete, ops, workerThread)  //函数排队执行
Q.parallel(tasks, complete, ops)              //函数并行执行
Q.ajaxQueue(ops)
```

###浏览器识别
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

###JSON
```
JSON.stringify(obj)
JSON.parse(text)
```

###Cookie
```
var cookie = Q.cookie;
cookie.get(key)
cookie.set(key, value, ops)
cookie.remove(key)
cookie.clear()
```

###Storage
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

###Ajax&JSONP
```
Q.getXHR()
Q.ajaxSetup(ops)
Q.ajax(url, ops)
Q.get(url, data, success, error)
Q.post(url, data, success, error)
Q.getJSON(url, data, success, error)
Q.postJSON(url, data, success, error)
Q.jsonp(url, data, success, error)

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
    
    headers: {},
    
    beforeSend: function(ops){},
    success: function(data, ops, xhr){},
    error: function(ops, xhr){},
    complete: function(ops, xhr){}
});
```

###事件处理
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

###视图大小
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

###DOM操作
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