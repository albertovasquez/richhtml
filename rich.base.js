/*
 * RichHTML v1.0.0 - jQuery/mustache.js grid control
 * Copyright (c) 2012 Alberto Vasquez
 *
 * www: http://www.richhtml.com
 * email: support@richhtml.com
 */

var RichHTML = {
	version : '1.0.0',
    versionDetail : {
        major: 1,
        minor: 0,
        patch: 0
    },
    prefixLabel: '',
    debugLvl: 1
};

RichHTML.apply = function (o, c, defaults) {
	var p;
    if (defaults) {
        RichHTML.apply(o, defaults);
    }
    if (o && c && typeof c === 'object') {
        for(p in c){
            o[p] = c[p];
        }
    }
    return o;
};

(function (){

	var idSeed = 0;

    RichHTML.apply(RichHTML, {
        overlayTpl :'<div id="richhtml-overlay" style="display:none;left:-999999px;"></div><div id="richhtml-overlay-inner" style="display:none;left:-999999px;"></div>',
        id : function(el, prefix){
            el = RichHTML.getDom(el, true) || {};
            if (!el.id) {
                el.id = (prefix || "rich-comp-") + (++idSeed);
            }
            return el.id;
        },
        isEmpty : function(obj) {
          var prop;
          //used to determine if js objects have changed
          for (prop in obj) {
            return false;
          }
          return true;
        },
        replaceAll : function(str, token, newToken,ignoreCase) {
            var i = -1, _token;
            if(typeof token === "string") {
                _token = ignoreCase === true? token.toLowerCase() : undefined;
                while((i = (
                    _token !== undefined?
                        str.toLowerCase().indexOf(
                                    _token,
                                    i >= 0? i + newToken.length : 0
                        ) : str.indexOf(
                                    token,
                                    i >= 0? i + newToken.length : 0
                        )
                )) !== -1 ) {
                    str = str.substring(0, i)
                            .concat(newToken)
                            .concat(str.substring(i + token.length));
                }
            }
            return str;
        },
        mask : function(selector,fade) {

            if (!fade) fade = false;
            if ((!selector) || selector === null) selector = "body";
            var $t, height, width;
            $t = $(selector);
            height = ($t.outerHeight() === 0) ? $(document).height() : $t.outerHeight();
            width = $t.outerWidth();

            $("#richhtml-overlay").css({
              top     : $t.offset().top,
              left    : $t.offset().left,
              width   : width,
              height  : height,
              display : ''
            });


            if (fade) $("#richhtml-overlay").fadeIn('slow');
            else $("#richhtml-overlay").show();
        },
        onPreLoad: function(el) {
            $(this).trigger('preload', el);
        },
        onPostLoad: function(el) {
            $(this).trigger('postload', el);
        },
        unMask: function() {
            $("#richhtml-overlay").fadeOut();
            $("#richhtml-overlay").css({display:'none',left:'-999999px'});
        },
        debug : function(lvl,message){
          if (RichHTML.debugLvl >= lvl) {
            console.log(message);
          }
        },
        mouseCoords : function(ev){
            if(ev.pageX || ev.pageY){
                return {x:ev.pageX, y:ev.pageY};
            }
            return {
                x:ev.clientX + document.body.scrollLeft - document.body.clientLeft,
                y:ev.clientY + document.body.scrollTop  - document.body.clientTop
            };
        },
        getDom : function(el, strict){
            var e;
            if(!el || !document){
                return null;
            }
            return $(".ce-container").get(0);
        },
        center : function (el,containerEl,transition,offset) {

            if(!offset) { offset = 0;}

			var $me = el;
			if (!containerEl) { containerEl = window; }

			return $me.each(function() {
				var props, top, left;
				if (containerEl == window) {
                props = {position:'absolute'};
                $me.css(props);
                top = ($(containerEl).height() - $me.outerHeight()) / 2;
                top += $(containerEl).scrollTop() || 0;
                top = (top > 0 ? top : 0);

            } else {
                props = {position:'relative'};
                top = ($(containerEl).parent().height() - $me.outerHeight()) / 2;
                top += $(containerEl).scrollTop() || 0;
                top = (top > 0 ? top : 0);
            }

                //vertical
                top = (top - offset < 10) ? top : top-offset;
                $.extend(props, {top: top +'px'});

				//horizontal
                left = ($(containerEl).width() - $me.outerWidth()) / 2;
                left += $(containerEl).scrollLeft() || 0;
                left = (left > 0 ? left : 0);
                $.extend(props, {left: left+'px'});

                if (transition && transition > 0) { $me.animate(props, transition); }
                else { $me.css(props); }
                return $me;
            });

		}
    });
})();

$(document).ready(function() {
    $(document.body).append(RichHTML.overlayTpl);
});
Array.max = function( array ) {
    return Math.max.apply( Math, array );
};
Array.min = function( array ) {
    return Math.min.apply( Math, array );
};
$.fn.hasAttr = function(prop, val) {
    return ($(this).attr(prop.toLowerCase()) === val.toLowerCase());
};

// replace this to hook up to your own lang lib
if (typeof lang !== 'function') {
    function _sprintf(s) {
        var re = /%/;
        var i = 0;
        while (re.test(s))
        {
           s = s.replace(re, _sprintf.arguments[++i]);
        }

        return s;
    }

    function lang() {
        switch (lang.arguments.length) {
            case 1:
                return phrase;
            case 2:
                return _sprintf(phrase, lang.arguments[1]);
            case 3:
                return _sprintf(phrase, lang.arguments[1], lang.arguments[2]);
            case 4:
                return _sprintf(phrase, lang.arguments[1], lang.arguments[2], lang.arguments[3]);
        }

        return phrase;
    }
}
