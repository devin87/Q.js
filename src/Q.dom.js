/// <reference path="Q.core.js" />
/*
* Q.dom.js DOM操作
* author:devin87@qq.com
* update:2017/12/05 10:09
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

    //动态创建样式
    function createStyle(cssText) {
        var style = document.createElement("style");
        style.type = "text/css";

        style.styleSheet && (style.styleSheet.cssText = cssText) || style.appendChild(document.createTextNode(cssText));

        Q.head.appendChild(style);

        return style;
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
    //value:重置后输入框的值,默认为空字符串
    function setInputError(input, hasBorder, value) {
        if (hasBorder) input.style.borderColor = "red";
        else input.style.border = "1px solid red";

        input.value = value || "";
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
        createStyle: createStyle,
        parseHTML: parseHTML,
        removeEle: removeEle,
        containsNode: containsNode,

        hasClass: hasClass,
        addClass: addClass,
        removeClass: removeClass,
        replaceClass: replaceClass,
        toggleClass: toggleClass,

        setInputError: setInputError,
        setInputDefault: setInputDefault
    });

})();