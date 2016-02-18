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
	arr.items(prop, skipUndefined)
	arr.toMap(value, ignoreCase)
	arr.toObjectMap(propKey, propValue, isBuildIndex)
	
Date:
	Date.now()
	Date.from(str)
	Date.parts(t)
	Date.total(part, t)
	
	date.isValid()
	date.format(format, ops)
	date.add(part, n)
	date.diff(part, date)
	date.fromUTC()
	date.toUTC()
	date.clone()
```

###通用属性和方法
```
Q.html
Q.head
Q.strict
Q.quirk

Q.type(obj)
Q.isFunc(obj)
Q.isObject(obj)
Q.isArray(obj)
Q.isArrayLike(obj)
Q.def(value, defValue)
Q.isNum(n, min, max)
Q.isUNum(n)
Q.isInt(n, min, max)
Q.isUInt(n)
Q.checkNum(str, min, max)
Q.checkInt(str, min, max)
Q.toUpper(str, defValue)
Q.toLower(str, defValue)
Q.toArray(obj, from)
Q.makeArray(obj, from)
Q.arr(length, value, step)
Q.vals(list, prop, skipUndefined)
Q.alias(obj, name, aliasName)
Q.extend(destination, source, forced)
Q.clone(data)
Q.toMap(list, fv, ignoreCase)
Q.toObjectMap(list, propKey, propValue, isBuildIndex)
Q.sortNumber(list, prop, desc)
Q.sortString(list, prop, desc)
Q.sortDate(list, prop, desc)
Q.sortList(list, type, prop, desc)
Q.proxy(fn, bind)
Q.fire(fn, bind)
Q.delay(fn, bind, time, args)
Q.async(fn, time)
Q.waitFor(check, callback, timeout, sleep)
Q.factory(init)
Q.isIP(ip)
Q.isMail(str)
Q.isPhone(str)
Q.isTel(str)
Q.isHttpURL(url)
Q.parseLevel(size, steps, limit)
Q.formatSize(size, ops)
Q.isHttpURL(obj)
Q.isHttpURL(obj)
Q.isHttpURL(obj)
Q.isHttpURL(obj)

Q.ready(fn)
Q.param(obj)
Q.join(url)
Q.parseHash(hash)
Q.getPageName(path)
Q.loadJS(urls, callback, ops)
Q.loadCSS(urls, callback, ops)
Q.isInputKey(code)
Q.isSameHost(url)
Q.clearSelection()
```

###队列
```
Q.Queue(ops)
Q.series(tasks, complete, ops, workerThread)
Q.parallel(tasks, complete, ops)
Q.ajaxQueue(ops)
```

###浏览器识别
```
var engine=Q.engine;
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

JSON.encode(obj)
JSON.decode(text, secure)
```

###Cookie
```
var cookie=Q.cookie;
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

var store=new Q.Storage("localStorage", true);
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
var E=Q.event;
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
var view=Q.view;
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
var $el=$(selector,context);
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