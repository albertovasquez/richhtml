/*
 * RichHTML v1.0.0 - jQuery/mustache.js grid control
 * Copyright (c) 2012 Alberto Vasquez
 *
 * www: http://www.richhtml.com
 * email: support@richhtml.com
 */

RichHTML.msgBox = function (content, config, callback)
{
    var msgBox = new RichHTML.window({});
    var required = "";

    msgBox.name = 'msgBox';
    msgBox.options.escClose = false;
    msgBox.options.type = "alert"; //alert,info,error,prompt,confirm, question
    msgBox.options.password = false;
    msgBox.options.textarea = false;
    msgBox.options.allowblank = false;
    msgBox.options.value = "";

    msgBox.confirm_buttons = {  button1:{text:lang("Yes")}, button2:{text:lang("No")}, button3:{text:lang("Cancel"),type:"cancel"} };
    msgBox.prompt_buttons = {  button1:{text:lang("OK")}, button2:{text:lang("Cancel"),type:"cancel"} };
    msgBox.yesno_buttons = {  button1:{text:lang("Yes")}, button2:{text:lang("No")} };

    msgBox.options = $.extend(msgBox.options,config);

    //if no buttons passed use default based on type
    if (typeof (msgBox.options.buttons) == "undefined") {
        switch (msgBox.options.type) {
            case "confirm":
                msgBox.options.buttons = msgBox.confirm_buttons;
                break;
            case "yesno":
                msgBox.options.buttons = msgBox.yesno_buttons;
                break;
            case "prompt":
                msgBox.options.type = "prompt";
                msgBox.options.buttons = msgBox.prompt_buttons;
                break;
            default:
                break;
        }
    }

    switch (msgBox.options.type) {
        case "prompt":
            if (msgBox.options.content ===  null) {

                if ( msgBox.options.allowblank === false ) {
                    required = " class='required' ";
                }

                if (msgBox.options.password) {
                    msgBox.options.content = content + "<input type='password' class='required' name='value' style='width:80%;margin-top:4px;' />";
                } else if (msgBox.options.textarea) {
                    msgBox.options.content = content + "<textarea "+required+" name='value' style='width:100%;margin-top:4px;' rows='2' /></textarea>";
                } else {
                    msgBox.options.content = content + "<input type='text' "+required+" name='value' style='width:80%;margin-top: 4px;' value='"+msgBox.options.value+"' />";
                }
            }
            break;
        default:
            if (msgBox.options.content ===  null) {
                msgBox.options.content = content;
            }
            break;
    }

    if (callback) {
        msgBox.options.afterClick = callback;
    } else {
        msgBox.options.afterClick = null;
    }
    if (msgBox.options.title === '') {
        msgBox.options.hideTitle = true;
    }
    msgBox.show();

    //might not center if you pass url
    RichHTML.center($('#'+msgBox.id+' .window-description-elements'),$('#'+msgBox.id+' .window-description form'));

    if (typeof msgBox.options.afterClick === 'function' &&
        msgBox.options.afterClick !== false) {
        $(msgBox).bind({
            "buttonclick" : function(event,data) {
                var elements, args = [];
                elements = msgBox.form.serializeArray();
                data.elements = {};
                for(var i=0;i<elements.length;i++) {
                    data.elements[elements[i].name] = elements[i].value;
                }
                args.push(data);
                msgBox.options.afterClick.apply(self,args);
            }
        });
    }

    return msgBox;

};

RichHTML.confirm = function(title,options,callback) {
    var config = {type: 'confirm'};
    config = $.extend(config,options);
    return RichHTML.msgBox(title,config,callback);
};

RichHTML.error = function(title,options,callback) {
    var config = {type: 'error'};
    config = $.extend(config,options);
    return RichHTML.msgBox(title,config,callback);
};

RichHTML.prompt = function(title,options,callback) {
    var config = {type: 'prompt'};
    config = $.extend(config,options);
    return RichHTML.msgBox(title,config,callback);
};

RichHTML.alert = function(msg,options,callback) {
    var config = {type: 'yesno'};
    config = $.extend(config,options);
    return RichHTML.msgBox(msg,config,callback);
};

RichHTML.info = function(msg,options,callback) {
    var config = {type: 'info'};
    config = $.extend(config,options);
    return RichHTML.msgBox(msg,config,callback);
};

RichHTML.window = function(config){
    var defaults, self=this;

    self.id = null;
    self.hasButtons = false;
    self.name = 'richwindow';
    self.delayLoad = false;
    self.form = null;
    self.params = {};

    defaults = {
        content: null,
        width: 360,
        showerrors: true,
        type: "form",
        grid: null,
        onSubmit: null,
        showSubmit: false,
        showDelete: false,
        hideButtons: false,
        escClose: true,
        hideTitle: false,
        useOverlay: true,
        transition: 0,
        title: '',
        beforeSubmit: null,
        beforeCancel: null
    };

    self.options =  $.extend(defaults, config);

    self.elements = {
        firstElement: null,
        lastElement:null,
        firstGroup:null,
        lastGroup:null
    };

    if (config.id) {
        self.id = config.id;
    }
    else {
        self.id = self.getId();
    }

    self.template = '<div class="richwindow" id="{richid}" style="width:{width};"><div class="window-bg" style="width:{width};">';
    self.template += '<div class="window-title" style="width:{width};">{title}</div>';
    self.template += '<div class="window-description loading-content {msgboxclasses}" style="{minHeight};height:{height};"><form novalidate action="index.php" id="form-description-{richid}" novalidate="novalidate" style="margin-bottom:5px;"><div class="window-description-elements"></div></form></div>';
    self.template += '<div class="window-buttons">{{buttons}}</div></div></div>';

    //lets bind esc to the form hide
    self.closeKeyHandler = function(e) {
        if (e.keyCode === 27 && self.options.escClose) {
            //adding this here but not in richhtml as it is just for us
            $('.richwindow .datepicker').hide();
            if(jQuery().timepicker) {
                $('.richwindow .timepicker').timepicker('hideWidget');
            }
            if(jQuery().colourPicker) {
                $('#jquery-colour-picker').hide();
            }
            self.hide();
        }
    };

    //prevents the form from submitting
    self.enterKeyHandler = function (e) {
        if (e.keyCode === 13) {
            if ($(document.activeElement).hasClass('rich-button')) {
                $(document.activeElement).click();
            }

            if(!$(document.activeElement).is('div') && !$(document.activeElement).is('textarea')) {
                e.preventDefault();
                // enter key submits only windows of type prompt
                if (self.options.type == 'prompt') {
                    $('#' + self.id + ' #rich-button-button1').click();
                }
                return false;
            }
        }
    };

    //lets bind the first tab to the first form element in our content
    self.tabKeyHandler = function(e) {
        if (e.keyCode === 9) {
            if ($(e.target).is(self.elements.lastGroup) && !e.shiftKey) {
                self.elements.firstGroup.first().focus();
                e.preventDefault();
            } else if ($(e.target).is(self.elements.firstGroup) && e.shiftKey) {
                self.elements.lastGroup.first().focus();
                e.preventDefault();
            }
        }
    };

};

//lets submit the form in window-description
//check to see if jquery validator is supported
//if so validate and if not just submit
RichHTML.window.prototype.callDelete = function (method) {
    var self = this, me;

    me = $('#'+self.id);
    if (typeof(self.options.deleteUrl) === "undefined") {
        RichHTML.debug(1,"You need to define a deleteUrl if you want to use the delete method.");
        return false;
    }

    if (self.form === null) {
        RichHTML.debug(1,"this.form is not set yet via the render method.");
        return false;
    }

    if (typeof(method) === "undefined") {
        successMethod = function(data) {
            if (self.options.grid !== null) {
                self.options.grid.reload();
            }
            self.hide();
        };
    } else {
        successMethod = function(data) {
            method(data);
            if (self.options.grid !== null) {
                self.options.grid.reload();
            }
            self.hide();
        };
    }

    //lets add some hidden elements
    if (self.params && typeof(self.params) !== "undefined") {
        $.each(self.params,function(c_i, c_val) {
            me.find('.window-description form .window-description-elements').append(
                $('<input/>')
                .attr('type', 'hidden')
                .attr('name', c_i)
                .val(c_val)
                );
        });
    }

    $.post(self.options.deleteUrl, self.form.serialize(), successMethod, "json");

};


//lets submit the form in window-description
//check to see if jquery validator is supported
//if so validate and if not just submit
RichHTML.window.prototype.submit = function (method) {
    var self = this, me;

    if (!method) method = null;

    me = $('#'+self.id);
    if (typeof(self.options.actionUrl) === "undefined") {
        RichHTML.debug(1,"You need to define an actionUrl if you want to use the submit method.");
        return false;
    }

    if (self.form === null) {
        RichHTML.debug(1,"this.form is not set yet via the render method.");
        return false;
    }
    if (method === null) {
        successMethod = function(data) {
            self.postSubmit(data);
        };
    } else {
        successMethod = function(data) {
            method(data,self.form.serializeArray());
            self.postSubmit(data);
        };
    }

    //lets add some hidden elements
    if (self.params && typeof(self.params) !== "undefined") {
        $.each(self.params,function(c_i, c_val) {
            me.find('.window-description form .window-description-elements').append(
                $('<input/>')
                .attr('type', 'hidden')
                .attr('name', c_i)
                .val(c_val)
                );
        });
    }

    $.post(self.options.actionUrl, self.form.serialize(), successMethod, "json");

};

RichHTML.window.prototype.postSubmit = function (data) {
    var self = this;
    //only hide window if data.error did not return true
    if (( typeof (data.error) == "undefined") ||
        ((typeof (data.error) != "undefined") && !data.error) ) {

        if (self.options.grid !== null) {
            self.options.grid.reload();
        }

        self.hide();
    } else {
        if ((typeof (data.message) === "undefined") || ($.trim(data.message) === "")) {
            data.message = 'There was an error submitting your request';
        }
        if (self.options.showerrors) RichHTML.msgBox(data.message,{type:'error'});
    }
};

RichHTML.window.prototype.getId = function () {
    return this.id || (this.id = RichHTML.id.apply(this));
};

/* Checking content for duplicates */
RichHTML.window.prototype.checkContent = function () {
    var self = this, itemsDefined = 0;

    (self.options.content !== null) ? itemsDefined++ : itemsDefined;
    (typeof (self.options.el) !== "undefined") ? itemsDefined++ : itemsDefined;
    (typeof (self.options.url) !== "undefined") ? itemsDefined++ : itemsDefined;

    //lets make sure that we are not loading from both div el and url as we only need one
    if ( itemsDefined > 1 ) {
        RichHTML.debug(1,"You need only one param of el, url, or content to determine where the content is coming from.");
        return false;
    } else if ( itemsDefined === 0 ) {
        RichHTML.debug(1,"You need either config param el, url, or content to determine where the content is coming from.");
        return false;
    }

    return true;
};

/**
 * Method to set height of window after render
 * @param void
 */
RichHTML.window.prototype.setHeight = function(height) {
    var innerwindow = $('#'+this.id).find('.window-description');
    innerwindow.height(height);
};

RichHTML.window.prototype.prepTemplate = function () {
    var self = this, content = "";

    if (!self.checkContent()) {
        return false;
    }

    self.template = RichHTML.replaceAll(self.template,"{richid}",self.id);

    if ((self.options.title === '') && (!self.options.hideTitle) ) {
        self.options.title = 'Empty title';
    }

    if (self.options.type === "form") {
        self.template = RichHTML.replaceAll(self.template,"{msgboxclasses}","");
    } else {
        self.template = RichHTML.replaceAll(self.template,"{msgboxclasses}","msgbox-wrapper msgbox-"+self.options.type);
    }
    self.template = RichHTML.replaceAll(self.template,"{title}",self.options.title);
    self.template = RichHTML.replaceAll(self.template,"{width}",self.options.width+"px");
    if (typeof(self.options.height) === "undefined") {
        self.template = RichHTML.replaceAll(self.template,"{height}", "auto");
    } else {
        self.template = RichHTML.replaceAll(self.template,"{height}", self.options.height+"px");
    }

    if (typeof(self.options.minHeight) !== "undefined") {
        self.template = RichHTML.replaceAll(self.template,"{minHeight}", "min-height:"+self.options.minHeight+"px");
    } else {
        self.template = RichHTML.replaceAll(self.template,"{minHeight}", "");
    }
    self.template = RichHTML.replaceAll(self.template,"{descriptionwidth}",(self.options.width-40)+"px");

    return true;
};

RichHTML.window.prototype.prepButtons = function() {
    var self = this,buttons = '',button;
    for (button in self.options.buttons) {
        buttons +=  '<a href="#" class="rich-button white" id="rich-button-' + button + '"><span class="buttontext">' + self.options.buttons[button].text + '</span></a>';
    }

    if ((buttons === '') && (self.options.hideButtons)) {
        self.hasButtons = false;
        RichHTML.debug(3,"No buttons and hide Ok passed as true");
    } else if (buttons === '') {
        self.hasButtons = true;
        if (self.options.showSubmit) {
            buttons += '<a href="#" class="rich-button white" id="rich-button-submit"><span class="buttontext">' + lang('Submit') + '</span></a>';
            if (self.options.showDelete) {
                buttons += '<a href="#" class="rich-button white" id="rich-button-delete"><span class="buttontext">' + lang('Delete') + '</span></a>';
            }
            buttons += '<a href="#" class="rich-button white" id="rich-button-autoclose"><span class="buttontext">' + lang('Close') + '</span></a>';
        } else {
            if (self.options.showDelete) {
                buttons = '<a href="#" class="rich-button white" id="rich-button-delete"><span class="buttontext">' + lang('Delete') + '</span></a>';
            }
            buttons += '<a href="#" class="rich-button white" id="rich-button-autoclose"><span class="buttontext">' + lang('Ok') + '</span></a>';
        }
        self.template = RichHTML.replaceAll(self.template,"{{buttons}}",buttons);
    }else {
        self.hasButtons = true;
        self.template = RichHTML.replaceAll(self.template,"{{buttons}}",buttons);
    }
    return true;

};

RichHTML.window.prototype.render = function(useOverlay) {
    var self = this, me;

    if (useOverlay) {
        $('<div class = "rich-dark-overlay" />').appendTo('body').fadeIn("slow");
    }

    $(document.body).append(self.template);
    me = $('#'+self.id);

    if (!self.hasButtons) {
        me.find('.window-buttons').css('display','none');
        me.find('.window-description').addClass('window-no-buttons');
    }

    if (self.options.hideTitle) {
        me.find('.window-title').css('display','none');
        me.find('.window-description').addClass('window-no-title');
    }

    self.form = me.find('.window-description form');

    if (typeof (self.options.el) !== "undefined") {
        RichHTML.debug(3,"Loading content from element with id: "+self.options.el);
        $('#'+self.id + ' .window-description form .window-description-elements').html($('#'+self.options.el).html());
        //$('#'+self.options.el).remove();
        $('.richwindow .loading-content').removeClass('loading-content');
    } else if (typeof (self.options.url) !== "undefined") {
        RichHTML.debug(3,"Loading content from url: "+self.options.url);
        self.delayLoad = true; //we want to load the data after we draw window
    } else if (typeof (self.options.content) !== "undefined") {
        RichHTML.debug(3,"Loading content from content param: "+self.options.content);
        $('#'+self.id + ' .window-description form .window-description-elements').html(self.options.content);
        $('.richwindow .loading-content').removeClass('loading-content');
    }

    //let's see if there was position passed
    self.position();


    return true;
};

/**
 * We have been given some position attributes for the window
 * @param  {[type]} pos [description]
 * @return {[type]}     [description]
 */
RichHTML.window.prototype.position = function () {
    var self = this;
    var props;
    var obj = {};

    if (self.options.right) {
        obj.right = self.options.right+"px";
    }

    if (self.options.left) {
        obj.left = self.options.left+"px";
    }

    if (self.options.top) {
        obj.top = self.options.top+"px";
    }

    if (self.options.bottom) {
        obj.bottom = self.options.bottom+"px";
    }

    if ( (self.options.right) || (self.options.left) || (self.options.top) || (self.options.bottom) ) {
        obj.position = 'absolute';
        $('#'+self.id).css(obj);
    } else {
        RichHTML.center($('#'+self.id),window,self.options.transition, 100);
    }

    return;

};

RichHTML.window.prototype.hide = function () {
    var self = this;

    // avoid timepicker issues remaining open issues. If there's no timepicker it doesn't matter, this won't do anything
    if(jQuery().timepicker) {
        $('.richwindow .timepicker').timepicker('hideWidget');
    }

    if(jQuery().colourPicker) {
        $('#jquery-colour-picker').hide();
    }

    if (self.options.useOverlay) {
        $('.rich-dark-overlay').fadeOut("fast", function() {
            $(this).remove();
        });
    }

    $(document).unbind('keydown', self.closeKeyHandler).unbind('keydown', self.tabKeyHandler).unbind('keydown', self.enterKeyHandler);
    $('#'+self.id).remove();
};

RichHTML.window.prototype.validateForm = function () {
    var self = this;
        data = {};

    if(jQuery().validate) {
        data.validate = self.form.validate({
            highlight: function(element, errorClass, validClass) {
                $(element).addClass(errorClass).removeClass(validClass);
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).removeClass(errorClass).addClass(validClass);
                $(element).attr('title','');
            },
            errorPlacement: function(error, element) {
                if(error.html() !== ''){
                    element.attr('title',error[0].innerText);
                }
            }
        }
        );

        if (self.form.valid()) {
            return true;
        } else {
            $('#'+self.id+' .window-description .error').first().focus();

            $(self).trigger("validationerror",[data]);

            return false;
        }
    } else if (jQuery().parsley) {

        data.validate = self.form.parsley( 'validate' );
        if (self.form.parsley( 'isValid' )) {
            return true;
        }

        $('#'+self.id+' .window-description .error').first().focus();

        $(self).trigger("validationerror",[data]);

        return false;
    } else {
        return true;
    }
};

RichHTML.window.prototype.mask = function() {
    var $t, height, width;
    $t = $('.richwindow');
    height = ($t.outerHeight() === 0) ? $(document).height() : $t.outerHeight();
    width = $t.outerWidth();

    $("#richhtml-overlay-inner").css({
      top     : $t.offset().top,
      left    : $t.offset().left,
      width   : width,
      height  : height,
      display : ''
    });

    $("#richhtml-overlay-inner").show();
};

RichHTML.window.prototype.unMask = function() {
    $("#richhtml-overlay-inner").fadeOut();
    $("#richhtml-overlay-inner").css({display:'none',left:'-999999px'});
};

RichHTML.window.prototype.buttonBindings = function () {
    var self = this, me, data = {};
    me = $('#'+self.id);

    me.find('.rich-button').bind('click', function () {
        var scope, buttonId = $(this).attr('id').substring(12);

        //lets check to see if we have the default close buttons
        //because no other buttons were passed
        if (buttonId === "autoclose") {
            if (self.options.showSubmit && self.options.beforeCancel) {
                self.options.beforeCancel();
            }
            self.hide();
            data.btn = "ok";
            $(self).trigger('buttonclick',[data]);
        } else if (buttonId === "submit") {
            if (!self.validateForm()) {
                return false;
            }
            if (self.options.showSubmit && self.options.beforeSubmit) {
                if (self.options.beforeSubmit() === false) {
                    return false;
                }
            }
            self.submit(self.options.onSubmit);
            data.btn = "submit";
            $(self).trigger('buttonclick',[data]);
        } else if (buttonId === "delete") {
            self.callDelete(self.options.onDelete);
            data.btn = "delete";
            $(self).trigger('buttonclick',[data]);
        } else {
            //validate unless it is a cancel button
            if ( ( (self.options.buttons[buttonId].type!=="cancel") || typeof (self.options.buttons[buttonId].type) === "undefined") && !self.validateForm()) {
                return false;
            }

            if (typeof self.options.buttons[buttonId].onclick === 'function' &&
                self.options.buttons[buttonId].onclick !== false) {
                self.options.buttons[buttonId].onclick(self,{elements:self.form.serializeArray()});
            } else {
                self.hide();
            }
            data.btn = self.options.buttons[buttonId].text;

            //cancel should not submit trigger for after click
            //so if we haven't defined the btn as canceled or if the type is not canceled trigger the event
            if ( (self.name == "richwindow") && ((typeof (self.options.buttons[buttonId].type) === "undefined") || (self.options.buttons[buttonId].type !=="cancel")) ) {
                $(self).trigger('buttonclick',[data]);
            } else {
                //only if it msgbox just pass all button data
                $(self).trigger('buttonclick',[data]);
            }

        }



        return false;
    });

    return true;

};

RichHTML.window.prototype.setEscToClose = function (bClose) {
    var self = this;
    self.options.escClose = bClose;
};

RichHTML.window.prototype.setUrl = function (url) {
    var self = this;
    self.options.url = url;
};

RichHTML.window.prototype.addParams = function(newparams) {
    this.params = $.extend(this.params,newparams);
};

/**
 * Basically just calls load.   Not sure what else we might want to do here
 *
 * @return void
 */
RichHTML.window.prototype.reload = function() {

    this.load();

};

/**
 * Loads the content into the window
 *
 * @return void
 */
RichHTML.window.prototype.load = function() {
    var self = this, me;
    me = $('#'+self.id);

    if (self.delayLoad) {
        RichHTML.mask('#'+self.id);
        $.get(self.options.url, self.params,function(response, status, xhr) {
            me.find('.window-description form .window-description-elements').html(response);
            if (status == "error") {
                var msg = "Sorry but there was an error: ";
                RichHTML.debug(1,Array(msg + xhr.status + " " + xhr.statusText,xhr));
            }
            self.prepElements();
        });
        RichHTML.unMask();
    }else{
        self.prepElements();
    }

    $(document).bind('keydown', self.closeKeyHandler).bind('keydown', self.tabKeyHandler).bind('keydown', self.enterKeyHandler);

};

/**
 * Shows the richhtml window control
 *
 * @param  object options object with the params field to be extended into the params
 * @return true
 */
RichHTML.window.prototype.show = function(options) {
    var self = this;

    if (options && typeof(options.params) !== "undefined") {
        self.params = $.extend(self.params,options.params);
    } else {
        self.params = {};
    }

    //Temp code might remove.. trying to see if we can removebuttosn or hide submit on show
    if (options && typeof(options.options) !== "undefined") {
        self.options = $.extend(self.options,options.options);
    }

    RichHTML.debug(3,Array("Starting render for: "+self.id,self));
    if (!self.prepTemplate()) {
        return false;
    }

    if (!self.prepButtons()) {
        return false;
    }

    if (!self.render(self.options.useOverlay)) {
        return false;
    }

    if (self.hasButtons && !self.buttonBindings()) {
        return false;
    }

    //loads the content
    this.load();

    self.setDraggable();

    return true;
};

//this is to prep the content loaded mostly for tabbing
//also adds hidden elements
RichHTML.window.prototype.prepElements = function() {
    var self = this, tabbable, me;

    me = $('#'+self.id);
    //lets set first element active
    me.find(':input, .rich-button, textarea').eq(0).focus();
    tabbable = me.find(':input, .rich-button, textarea');
    if (tabbable.length > 0) {
        self.elements.firstElement = $(tabbable).filter(':first');
        self.elements.lastElement = $(tabbable).filter(':last');
        self.elements.firstGroup = (self.elements.firstElement[0].type !== 'radio') ?
        self.elements.firstElement :
        tabbable.filter("[name='" + self.elements.firstElement[0].name + "']");
        self.elements.lastGroup = (self.elements.lastElement[0].type !== 'radio') ?
        self.elements.lastElement :
        tabbable.filter("[name='" + self.elements.lastElement[0].name + "']");
    }

    $('.richwindow .loading-content').removeClass('loading-content');

};

RichHTML.window.prototype.setDraggable = function () {
    var self = this, me, relX, relY, thistarget, targetw, targeth,docw,doch,ismousedown=false;

    me = $('#'+self.id);
    me.css('position','absolute');
    thistarget = me.find('.window-title');

    targetw = thistarget.width();
    targeth = thistarget.height();

    thistarget.bind('mousedown', function(e){
        var pos,srcX,srcY,mousePos;
        pos = me.offset();
        srcX = pos.left;
        srcY = pos.top;

        docw = $('body').width();
        doch = $('body').height();

        mousePos = RichHTML.mouseCoords(e);
        relX = e.pageX - srcX;
        relY = e.pageY - srcY;

        ismousedown = true;
    });

    $(document).bind('mousemove',function(e){
        var maxY, maxX, mousePos, diffX, diffY;
        if(ismousedown)
        {
            targetw = me.width();
            targeth = me.height();

            maxX = docw - targetw - 10;
            maxY = doch - targeth - 10;

            mousePos = RichHTML.mouseCoords(e);

            diffX = mousePos.x - relX;
            diffY = mousePos.y - relY;

            me.css('top', (diffY)+'px');
            me.css('left', (diffX)+'px');
        }
    });

    $(window).bind('mouseup', function(e){
        ismousedown = false;
    });

    return this;
};
