/*
 * RichHTML v1.0.0 - jQuery/mustache.js grid control
 * Copyright (c) 2012 Alberto Vasquez
 *
 * www: http://www.richhtml.com
 * email: support@richhtml.com
 */

RichHTML.grid = function(config){
    this.name = "richgrid";
    this.id = null;
    this.el = null;
    this.data= null;
    this.last_tag = 0;
    this.jsonData= null;
    this.pagingEl = null;
    this.footerEl = null;
    this.hasExpander= false;
    this.hasCheckbox= false;
    this.width= '100%';
    this.internalTplClean = "<div class='richtable'><div class='edit_menu'>Loading ...</div><table id='{rich-id}' style='table-layout: fixed;{tablestyle}'><thead><tr>{{#columns}}<th nowrap='nowrap' rowspan='1' colspan='1' class='{{align}} {{sortable}} {{xtype}} {{editable}} {{#flexing}}flexing{{/flexing}}' {{#getsortfieldname}}{{sortFieldName}}{{/getsortfieldname}} dataindex='{{dataIndex}}' style='{{#width}}width:{{width}};{{/width}}{{#hidecolumn}}{{hidden}}{{/hidecolumn}}' {{#hasCheckbox}}data-checkbox='true'{{/hasCheckbox}}>{{#editable_menu}}<div class='{{edit_icon_class}}' data-rich-icon='&#xe600;'></div>{{/editable_menu}}<span class='{{sort_icon_class}}'>{{text}}&nbsp;</span></th>{{/columns}}</tr></thead><tbody>{tbody}</tbody><tfoot class='light rich-footer'><tr><th colspan='{footer-colspan}' id='{rich-id}-footer'></th></tr></tfoot></table><div id='{rich-id}-navigation' class='richgrid-pagenavi-wrapper'></div></div>";
    this.tbodyTplClean = "{{#groups}}{{#groupname}}<tr class='rich-group-row' id='{{rich_group_id}}'><td class='rich-group-name' colspan={{cols}}><span class='rich-grouptoggle rich-grouptoggle-plus {{plusvisible}}' data-rich-icon='&#xe001;' /><span class='rich-grouptoggle rich-grouptoggle-minus {{minusvisible}}' data-rich-icon='&#xe000;' />{{{name}}}</td></tr>{{/groupname}}{{#items}}{row-data}{{/items}}{{/groups}}";
    this.internalTpl = null;
    this.tbodyTpl = null;
    this.pagingTpl = "<div class='richgrid-pagenavi' data-items-per-page='{navpagesitemsperpage}' data-pages='{navpagescount}'>{navbuttons}</div>";
    this.columns= null;
    this.url= null;
    this.selectedColumn= null;
    this.editable = false;
    this.groupField = null,
    this.startCollapsed = false,
    this.baseParams= {
            dir: "desc",
            start: 0,
            limit: 10
    };
    this.root='items';
    this.totalProperty= 'total';
    this.padingEl= null;
    this.isDraggable= false;
    this.dragData= {
        dragObject: null,
        onDragClass: "dragging",
        scrollAmount: 5,
        savedY: 0
    };
    this.emptyText= lang("No data found");
    this.pagingData= [];
    this.cookieExpires = 365;

    //lets populate the config params if passed
    if (config.name) { this.name = config.name; }
    if (config.el) { this.el = config.el;}
    if (config.groupField) { this.groupField = config.groupField;}
    if (config.startCollapsed) { this.startCollapsed = config.startCollapsed;}
    if (config.id) {this.id = config.id;}
    else {this.id = this.getId();}
    if (config.editable) {this.editable = config.editable;}
    if (config.url) {this.url = config.url;}
    if (config.root) {this.root = config.root;}
    if (config.data) {this.data = config.data;}
    if (config.pagingEl) {this.pagingEl = config.pagingEl;}
    if (config.columns) {this.columns = config.columns;}

    this.columns.push({
            id:         "extra_th",
            dataIndex:  "extra_th",
            xtype:      "extra_th"
        });

    //define meta element we need to check if it exists when adding the content
    //as customer might have not wanted it if he didn't send it
    if (config.metaEl) {this.metaEl = config.metaEl;}
    else {this.metaEl = this.el+"-metadata";}

    if (config.footerEl) {this.footerEl = config.footerEl;}
    else {this.footerEl = this.el+"-footer";}

    if (config.width) {this.width = config.width;}
    if (config.emptyText) {this.emptyText = config.emptyText;}
    if (config.baseParams) {jQuery.extend(this.baseParams, config.baseParams);}

    if (config.totalProperty) {this.totalProperty = config.totalProperty;}
    if (config.cookieExpires) {this.cookieExpires = config.cookieExpires;}

};

RichHTML.grid.prototype.getId = function () {
    return this.id || (this.id = RichHTML.id.apply(this));
};

RichHTML.grid.prototype.getSelectedRowData = function () {
    var self = this,arrayOfObjs = [],ids;
    ids = self.getSelectedRowIds();
    $.each(self.data,function(k,v){
        if ($.grep(ids, function(n) { return n == v.id; }).length > 0) {
            arrayOfObjs.push(v);
        }
    });
    return arrayOfObjs;
};

RichHTML.grid.prototype.getSelectedRowIds = function () {
    var self = this,arrayOfIds;
    arrayOfIds = $.map($("#"+self.id+" tbody .checkbox-icon-checked"), function(n, i){
        //let's not add an id of a hidden checkbox
        //how can checkboxes be hidden? el.addStyle on renderer
        if ($(n).parent().hasClass('hide-checkbox')) return;
        substr = $(n).parent().attr('id').split('{-}');
        return $.trim(substr[1]);
    });
    return arrayOfIds;
};

RichHTML.grid.prototype.render = function () {
    var self = this;

    if(!self.templatePrep()) { return; }

    //lets draw a wrapper temp grid that will be replced later
    json = self.dataPrep();
    $('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));

    self.initialLoad(json);

};


/**
 * toggle column viewing and set to cache
 * @param  {[type]} colId [description]
 * @return {[type]}       [description]
 */
RichHTML.grid.prototype.toggleColumn = function(colId, visible){
    var self = this, a_hidden = [];

    $.each(self.columns,function(i, val) {

        if (jQuery.inArray( val.xtype, ["expander","checkbox","drag", "extra_th"] ) != -1) return;

        if (colId == val.dataIndex) {
            if (visible) {
                self.columns[i].hidden = false;
            } else {
                self.columns[i].hidden = true;
            }
        }

        if (self.columns[i].hidden) a_hidden.push(val.dataIndex);


    });


    //we just perfomed a column selection
    //so let's cache it
    self.set_cookie({
        'action':'columns',
        data:{
            'h':a_hidden
        }
    });



    self.reload();

};


RichHTML.grid.prototype.renderEditable = function()
{
    var self = this, html = "";
    //editable?
    $.each(self.columns,function(i, val) {
        if (jQuery.inArray( val.xtype, ["expander","checkbox","drag","extra_th"] ) != -1) return;

        if (val['hidden']) {
            checked = "";
        } else {
            checked = "checked=true";
        }

        html += '<p class="edit-column-entry" data-index="'+val.dataIndex+'"><input '+checked+' type="checkbox" class="col_checkbox" val="'+val.dataIndex+'" />'+val.text+'</p>';
    });

    $('.edit_menu').html(html);

    $("document").off('click');
    $('.edit_menu p').bind('click', function(event) {

        var dataIndex = null;
        if (event.target.className !== "col_checkbox") {
            dataIndex = $(event.target).attr('data-index');
            checked = $(event.target).find('.col_checkbox').prop( "checked" );
            $(event.target).find('.col_checkbox').prop( "checked" , !checked);
            state = !checked;
        } else {
            dataIndex = $(event.target).parent().attr('data-index');
            state = $(event.target).prop( "checked" );
        }

        self.toggleColumn(dataIndex, state);

    });

}

RichHTML.grid.prototype.enable = function()
{
    var self = this;
    RichHTML.unMask();
};

RichHTML.grid.prototype.disable = function()
{
    var self = this;
    RichHTML.mask('#'+self.id);
};

RichHTML.grid.prototype.timestamp = function(label) {
    var self = this;
    previous_tag = self.last_tag;
    self.last_tag = Date.now();

    if (previous_tag == 0) {
        //console.debug(label);
    } else {
        elapsed = self.last_tag - previous_tag;
        //console.debug('('+ (elapsed.toFixed(0)/1000) +'s) ',label);
    }

}

/*
Calls data via url getJson if url exists otherwise
uses the json passed to it
*/
RichHTML.grid.prototype.initialLoad = function(json) {
    var self = this;

    RichHTML.mask('#'+self.id);
    RichHTML.onPreLoad(self);

    self.last_tag = 0;
    // self.timestamp("Start InitialLoad");

    if (self.url!==null) {
        RichHTML.debug(3,Array('JSON initialLoad request for data',self.baseParams));
        $.getJSON(self.url, self.baseParams, function(data) {
            //lets add some code here specifically for CE
            if (typeof(ce.parseResponse) === "function") {
                cedata = ce.parseResponse(data);
                if ( data.error == true ) {
                    data.error = false;
                }
            }

            // self.timestamp("Returned Json");
            RichHTML.debug(3,Array('JSON request success',data));
            if (data.error) { return false; }
            if (typeof(data[self.root]) === "undefined") {
                RichHTML.debug(1,Array('Grid is expecting data collection in root named:'+self.root));
                return false;
            }

            json.rows = data[self.root];

            json.rows = self.addRenderers(json.columns,json.rows);
            self.data = json.rows;
            self.jsonData = data;
            //lets render based on json returned
            //if we have groups lets render the groupTpl
            if (self.groupField === null) {

                //create a group of 1.. this is so we can use the same templates as groups
                json.groups = [];
                json.groups.push({items:json.rows});

                $('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));

                //lets get total count information for paging
                self.pagingData.items = json.rows.length;
                if (typeof(data[self.totalProperty]) === "undefined") {
                    RichHTML.debug(3,Array('Paging de-activated. JSON does not contain total count in element: '+self.totalProperty));
                    self.pagingData.totalItems = null;
                } else {
                    self.pagingData.totalItems = data[self.totalProperty];
                }

            } else {

                //grouped items
                json = self.groupOnGroupField(json);
                $('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));
                self.pagingData.totalItems = null;

            }

            if (json.rows.length===0) {
                $('#'+self.el+' tbody').html('<tr><td class="richgrid-nodata" colspan="'+json.columns.length+'">'+self.emptyText+'</td></tr>');
            }

            self.onLoad();

            // self.timestamp("End InitialLoad");
        });
    } else {
        RichHTML.debug(1,'url config param is required to populate datagrid');
        //lets not render anything without url
        //$('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));
        //self.onLoad();
    }
};

/**
 * If groupField is passed then we group the similar rows into objects
 * Then create a new groups array in the json return param with name and columns (for colspan)
 * @param  json json unoriginal name of json object we are passing to mustache
 * @return json new json with groups
 */
RichHTML.grid.prototype.groupOnGroupField = function (json) {
    var self = this;
    var minusvisible = 'visible';
    var plusvisible= '';
    var groups = [];
    var group_index = 1;
    json.groups = [];

    //let's group them
    for (var x=0; x< json.rows.length; x++) {
        if (typeof(groups[json.rows[x][this.groupField]]) === "undefined") {
            groups[json.rows[x][this.groupField]] = [];
        }
        groups[json.rows[x][this.groupField]].push(json.rows[x]);
    }

    for (var key in groups) {
        if (groups.hasOwnProperty(key)) {

            var force_collapsed = false;
            var obj = groups[key];

            //if we have cookie plugin lets see if we have anything saved for this group state
            if( (jQuery.cookie != 'undefined') && ($.cookie("richgrid-data"+RichHTML.prefixLabel)) ) {
                cookie_vars = JSON.parse($.cookie("richgrid-data"+RichHTML.prefixLabel));
                if ( typeof(cookie_vars[self.el]) != "undefined" && typeof(cookie_vars[self.el].groups) != "undefined") {
                    is_collapsed = cookie_vars[self.el].groups[self.id+'-rich-group-'+group_index];
                    if (typeof(is_collapsed) != "undefined") {
                        force_collapsed = true;
                    }
                }
            }

           if (this.startCollapsed || force_collapsed) {
              plusvisible = 'visible';
              minusvisible='';
              //for each of the rows added to this group let's make them hidden
              $.each(obj,function(i,o){
                o.hidden = true;
              });
           } else {
              plusvisible = '';
              minusvisible='visible';
           }

           json.groups.push({items: obj,groupname:{rich_group_id:this.id+'-rich-group-'+group_index,plusvisible:plusvisible,minusvisible:minusvisible,name:obj[0][this.groupField],cols:json.columns.length}});
           group_index++;
        }
    }

    return json;
};

RichHTML.grid.prototype.reload = function (config) {
	var self = this,params = {};

    self.last_tag = 0;
    // self.timestamp("Start Reload");

	RichHTML.mask('#'+self.id);
    RichHTML.onPreLoad(self);
    self.templatePrep();

	//lets see if we are passing any new params
	if (config && (typeof(config.params) !== "undefined")) {

        params = config.params;
        //let's see if we have jquery cookie so we can store this for next time
        self.set_cookie({'action':'sort',data:{'d':config.params.dir, 's':config.params.sort}});
    }

	jQuery.extend(self.baseParams, params);

	json = self.dataPrep();
	if (self.url!==null) {
		RichHTML.debug(3,Array('JSON reload request for data',self.baseParams));
		$.getJSON(self.url, self.baseParams, function(data) {
            // self.timestamp("Returned Json");
            //lets add some code here specifically for CE
            if (typeof(ce.parseResponse) === "function") {
                cedata = ce.parseResponse(data);
                if ( data.error == true ) {
                    data.error = false;
                }
            }

            RichHTML.debug(3,Array('JSON request success',data));
            if (data.error){ return false; }
            if (typeof(data[self.root]) === "undefined") {
                RichHTML.debug(1,Array('Grid is expecting data collection in root named:'+self.root));
                return false;
            }
            json.rows = data[self.root];
            json.rows = self.addRenderers(json.columns,json.rows);
            self.data = json.rows;
            self.jsonData = data;
            //lets render based on json returned
            //let's group the json if there is groupField passed
            if (self.groupField === null) {

                //let's create a groups of one only so that we can use the same templates for groups and no groups
                json.groups = [];
                json.groups.push({items:json.rows});

                // $('#'+self.el+' tbody').html(Mustache.to_html(self.tbodyTpl, json).replace(/^\s*/mg, ''));
                $('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));

                //not grouped so we do extra work to handle paging
                //lets get total count information for paging
                self.pagingData.items = json.rows.length;
                if (typeof(data[self.totalProperty]) === "undefined") {
                    RichHTML.debug(3,Array('Paging de-activated. JSON does not contain total count in element: '+self.totalProperty));
                    self.pagingData.totalItems = null;
                } else {
                    self.pagingData.totalItems = data[self.totalProperty];
                }

            } else {
                //we are going to show grouped data.. lets regroup this data
                json = self.groupOnGroupField(json);
                // $('#'+self.el+' tbody').html(Mustache.to_html(self.tbodyTpl, json).replace(/^\s*/mg, ''));
                $('#'+self.el).html(Mustache.to_html(self.internalTpl, json).replace(/^\s*/mg, ''));
                self.pagingData.totalItems = null;
            }

            if (json.rows.length===0) {
                $('#'+self.el+' tbody').html('<tr><td class="richgrid-nodata" colspan="'+json.columns.length+'">'+self.emptyText+'</td></tr>');
            }

            self.onLoad(true);
            // self.timestamp("End Reload");
        });

        // self.postToggleColumn();


    } else {
        RichHTML.debug(1,Array('url config param is required to populate datagrid'));
        //lets render
        //$('#'+self.el+' tbody').html(Mustache.to_html(self.tbodyTpl, json).replace(/^\s*/mg, ''));
        //self.onLoad(true);
    }

};

RichHTML.grid.prototype.dataDelayedRenderer = function(renderer,text,id,row) {
    var el = {},html;
    html = renderer(text,row,el);
    //if(typeof(el.html)!=="undefined"){ $("#"+id).html(el.html);}
    $("#"+id).html(html);
};

RichHTML.grid.prototype.dataRenderer = function(renderer, row) {
    var self = this;

    //if checkbox we only want to know if returns true or false

    return function() {
        return function(text,cellid) {
            var raw,id,el={};
            raw = text.split("{||}");
            id = self.id+"-cell-"+raw[0];
            text = raw[1];
            if (renderer) {
                text = renderer(text,row,el);
                if (!RichHTML.isEmpty(el)) {
                    $(self).bind({
                        "colload" : function() {
                            self.mapCellModifiers(el,id);
                        }
                    });
                }
                return text;
            }else{
                return text;
            }
        };
    };
};

RichHTML.grid.prototype.mapCellModifiers = function (el,id) {
    var self = this;
    if(typeof(el.addClass)!== "undefined") { $('td[id="'+id+'"]').addClass(el.addClass); }
    if(typeof(el.removeClass)!== "undefined") { $('td[id="'+id+'"]').removeClass(el.removeClass); }
    if(typeof(el.addStyle)!== "undefined") { $('td[id="'+id+'"]').attr('style',el.addStyle);}
    if(typeof(el.removeStyle)!== "undefined" && el.removeStyle) { $('td[id="'+id+'"]').attr('style',''); }
    $(self).unbind('colload');
};

RichHTML.grid.prototype.addRenderers = function (cols,rows) {
    var self = this,renderOnExpand = false;
    $.each(cols,function(c_i, c_val) {
        if ((typeof(c_val.dataIndex) === "undefined") && (typeof(c_val.renderer) === "undefined")) {
            if (c_val.xtype !== "drag") { RichHTML.debug(1,"Error: You need either a dataIndex or renderer for column:"+c_i);}
        }
        $.each(rows,function(r_i,r_val) {
            renderOnExpand = (typeof(c_val.renderOnExpand)==="undefined") ? false : c_val.renderOnExpand;
            if(c_val.renderer && !renderOnExpand){
                r_val[c_i+"-rich-renderer"] = self.dataRenderer(c_val.renderer,r_val);
            } else if (!renderOnExpand) {
                r_val[c_i+"-rich-renderer"] = self.dataRenderer();
            } else {
                r_val[c_i+"-rich-delayedrenderer"] = c_val.renderer;
                r_val[c_i+"-rich-delayedrenderer-classes"] = "delayedrenderer rowdata-"+c_i+"-"+r_i;
            }
        });
    });
    return rows;
};

RichHTML.grid.prototype.getMouseOffset = function(target, ev) {
        var docPos, mousePos;
        ev = ev || window.event;
        docPos    = this.getPosition(target);
        mousePos  = this.mouseCoords(ev);
        if (docPos == null) {
            return null;
        } else {
            return {x:mousePos.x - docPos.x, y:mousePos.y - docPos.y};
        }

    };
RichHTML.grid.prototype.getPosition = function(e){
        var top  = 0, left=0;
        // using fix found at http://jacob.peargrove.com/blog/2006/technical/table-row-offsettop-bug-in-safari/
        // Safari fix -- thanks to Luis Chato for this!
        if (e.offsetHeight === 0) {
            e = e.firstChild; // a table cell
        }

        if (e == null) {
            return null;
        }

        while (e.offsetParent){
            left += e.offsetLeft;
            top  += e.offsetTop;
            e     = e.offsetParent;
        }

        left += e.offsetLeft;
        top  += e.offsetTop;
        return {x:left, y:top};
    };

RichHTML.grid.prototype.mouseCoords = function(ev){
        if(ev.pageX || ev.pageY){
            return {x:ev.pageX, y:ev.pageY};
        }
        return {
            x:ev.clientX + document.body.scrollLeft - document.body.clientLeft,
            y:ev.clientY + document.body.scrollTop  - document.body.clientTop
        };
    };

RichHTML.grid.prototype.templatePrep = function()
{

	var self = this, cols = "", colCount = 0, expandercolCount = 0,
    expanderDataIndex = "", expanderRenderer = "", itemIndex = "",
    richid = "", widthStr, last_visible_index = null, hidden, foundhidden, has_fullwidth_th =false, flexid = null;

	if (self.columns === null) {
		RichHTML.debug(1,Array('You need to define columns array'));
		return false;
	}

    hidden = null;
    if(jQuery.cookie != 'undefined') {
        if ($.cookie("richgrid-data"+RichHTML.prefixLabel)) {
            cookie_vars = JSON.parse($.cookie("richgrid-data"+RichHTML.prefixLabel));

            //hidden columns from cookies
            if ( typeof(cookie_vars[self.el]) != "undefined" &&
                 typeof(cookie_vars[self.el].hidden) != "undefined")
             {
                hidden = cookie_vars[self.el].hidden;
            }

            //dir //sort from cookie
            if ( typeof(cookie_vars[self.el]) != "undefined" &&
                 typeof(cookie_vars[self.el].d) != "undefined" &&
                 typeof(cookie_vars[self.el].s) != "undefined")
             {
                self.baseParams.dir = cookie_vars[self.el].d;
                self.baseParams.sort = cookie_vars[self.el].s;
            }
        }
    }

	$.each(self.columns,function(i, val) {

		if (typeof(val.hidden)==="undefined") {val.hidden = false;}

        if (hidden != null) {
            foundhidden  = jQuery.inArray( self.columns[i].dataIndex, hidden );
            if (foundhidden != -1 ) {
                val.hidden = true;
                self.columns[i].hidden = true;
            } else {
                val.hidden = false;
                self.columns[i].hidden = false;
            }
        }

        if (val.xtype === "extra_th") {

            extraid = i;
            self.columns[i].width = "100%";
            self.columns[i].hidden = true;
            // val.hidden = true;
            cols += "<td class='extra_td' valign='top'></td>";

		} else if (val.xtype === "expander") {
            //force visible
            val.hidden = false;
            self.columns[i].hidden = false;

			if (val.dataIndex){
				if (typeof(val.escapeHTML)==="undefined" || !val.escapeHTML) {
					expanderDataIndex = "{"+val.dataIndex+"}";
				} else {
					expanderDataIndex = val.dataIndex;
				}
			}
			expanderRenderer = colCount+"-rich-renderer";
			self.hasExpander = true;
			cols += "<td valign='top' class='expander {{"+colCount+"-rich-delayedrenderer-classes}}' rowspan='1' id='{{#expanderid}}{{/expanderid}}'><div class='expander-icon'></div></td>";
			self.columns[i].width = "23px";
		} else if (val.xtype === "checkbox") {
            //force visible
            val.hidden = false;
            self.columns[i].hidden = false;

            itemIndex = (typeof(val.escapeHTML)==="undefined" || !val.escapeHTML) ? "{"+val.dataIndex+"}" : val.dataIndex;
			self.hasCheckbox = true;
			cols += "<td class='checkbox' id='{{#checkboxid}}{{"+itemIndex+"}}{{/checkboxid}}' {{#"+colCount+"-rich-renderer}}{{#getlastcellid}}{{/getlastcellid}}{-}{{"+itemIndex+"}}{||}{{"+itemIndex+"}}{{/"+colCount+"-rich-renderer}} valign='top'><div class='checkbox-icon'></div></td>";
			self.columns[i].width = "28px";
            self.columns[i].hasCheckbox = true;
		} else if (val.xtype === "drag") {
            //force visible
            val.hidden = false;
            self.columns[i].hidden = false;

			self.columns[i].width = "23px";
			self.isDraggable = true;
			cols += "<td class='draghandle' id='{{#cellid}}{{/cellid}}' valign='top'><div class='drag-icon'></div></td>";
		} else if (val.dataIndex) {

            self.columns[i].editable_menu = false;
            self.columns[i].editable = "";

            if (val.hidden) {
                hiddenstyle = "display:none;"
            } else {
                hiddenstyle = "";
            }

			if(typeof(val.sortable) !== "undefined" && val.sortable) {
				self.columns[i].sortable = "sortable";
				self.columns[i].sort_icon_class = "sort-icon";
			}
			if(typeof(val.width) !== "undefined" && val.width != null) {
				widthStr = self.columns[i].width.toString();
				if( (widthStr.indexOf("px") != -1) || (widthStr === "100%") ){
					self.columns[i].width = val.width;
				} else { self.columns[i].width = val.width+"px"; }
			} else if (!val.hidden){
				// self.columns[i].width = "100%";
                // self.columns[i].width = "";
			}

			//lets asssign the id we want to bind this element to
			//we should make sure that customer hasn't already used this id
			if (typeof(val.id)!=="undefined") { richid = "data-localid='"+val.id+"'";}
			else {richid = "";}

			itemIndex = (typeof(val.escapeHTML)==="undefined" || !val.escapeHTML) ? "{"+val.dataIndex+"}" : val.dataIndex;
			cols += "<td id='{{#cellid}}{{/cellid}}' style='overflow: visible;"+hiddenstyle+"' class='"+( (typeof(val.align) !== "undefined") ? val.align : "left")+"' "+richid+"  dataindex='"+val.dataIndex+"' valign='top'>{{#"+colCount+"-rich-renderer}}{{#getlastcellid}}{{/getlastcellid}}{||}{{"+itemIndex+"}}{{/"+colCount+"-rich-renderer}}</td>";

		}
		colCount++;
        if (!val.hidden) expandercolCount++;

        //need to see which fields is flexing
        if (jQuery.inArray( val.xtype, ["expander","checkbox","drag","extra_th"] ) == -1) {
            if (val.flex == 1 && !self.columns[i].hidden) flexid = i;
            if ( (val.width == "100%") && (!self.columns[i].hidden)) has_fullwidth_th = true;
            if (!self.columns[i].hidden) last_visible_index = i;
        }

	});

    if(typeof(self.editable) !== "undefined" && self.editable) {
        if (last_visible_index == null) last_visible_index = extraid;
        self.columns[last_visible_index].editable = "editable";
        self.columns[last_visible_index].editable_menu = true;
        self.columns[last_visible_index].edit_icon_class = "edit-icon";
    }


    if (!has_fullwidth_th) {

        if (flexid != null) {
            self.columns[flexid].flexing = true;
        } else if (last_visible_index != null) {
            if (extraid == last_visible_index) {
                self.columns[extraid].hidden = false;
            }
            self.columns[last_visible_index].flexing = true;
        }
    }


	cols = "<tr {{#hidden}}style='display:none;'{{/hidden}} class='{{#getcollapsedstate}}{{/getcollapsedstate}}' id='{{#getrowid}}{{/getrowid}}'>"+cols+"</tr>";
	if (self.hasExpander) {
		cols += "<tr class='expander-row' id='{{#expanderrowid}}{{/expanderrowid}}' style='display:none;'>";
		cols += "<td colspan='"+(expandercolCount)+"'><div class='pointer' boundto='{{#getlastextenderid}}{{/getlastextenderid}}' />";
		cols += "<div class='expander-data' id='{{#cellid}}{{/cellid}}'>{{#"+expanderRenderer+"}}{{#getlastextenderid}}{{/getlastextenderid}}{||}{{"+expanderDataIndex+"}}{{/"+expanderRenderer+"}}</div>";
		cols += "</td></tr>";
	}

	self.tbodyTpl = RichHTML.replaceAll(self.tbodyTplClean,"{row-data}",cols);

	//append template data
	self.internalTpl = RichHTML.replaceAll(self.internalTplClean,"{rich-id}",this.getId());
	self.internalTpl = RichHTML.replaceAll(self.internalTpl,"{tablestyle}","width:"+this.width);
	self.internalTpl = RichHTML.replaceAll(self.internalTpl,"{footer-colspan}",colCount);
	self.internalTpl = RichHTML.replaceAll(self.internalTpl,"{tbody}",self.tbodyTpl);

	return true;
};

/*
Function used to prepare the data we are going to pass to mustache.js template engine
We create a lamda function for checkboxids, expanderids, and the rowids the expander will use
*/
RichHTML.grid.prototype.dataPrep = function()
{
    var self = this, cellCounter = 0, rowCounter = 0, expanderCounter = 0, json = {};
    json.getsortfieldname = function (){return function (text, render) {return (text) ? "sortfieldname='"+text+"'": "";};};
    json.checkboxid = function (){return function (text, render) {return self.id+"-cell-"+(++cellCounter)+"{-}"+text;};};
    json.expanderid = function (){return function (text, render) {return self.id+"-expander-"+(++expanderCounter);};};
    json.cellid = function (){return function (text, render) {return self.id+"-cell-"+(++cellCounter);};};
    json.getlastcellid = function (){return function (text, render) {return cellCounter;};};

    json.hidecolumn = function (){
        return function (text, render) {
            if(text==="true"){
                return "display:none;";
            }else{
                return "";
            }
        };
    };

    json.getcollapsedstate = function (){return function (text, render) {
        if ( (self.groupField !== null) && (self.startCollapsed)) return 'collapsed';
        else return '';
    };};
    json.getrowid = function (){return function (text, render) {return self.id+"-row-"+(++rowCounter);};};
    json.getlastextenderid = function (){return function (text, render) {return expanderCounter;};};
    json.expanderrowid = function (){return function (text, render) {return self.id+"-expander-"+(expanderCounter)+"-data";};};
    json.columns = self.columns;

    return json;
};

/*
After render of columns
*/
RichHTML.grid.prototype.bindColumns = function () {
    var self = this, span, dir;


    // $("#"+self.id+" thead th.sortable").bind('click', function(event) {
    $("body").off('click',"#"+self.id+" thead th.sortable");
    $("body").on('click',"#"+self.id+" thead th.sortable", function(event) {

        if ( event.target.className === "col_checkbox" || event.target.className === "edit-icon" || event.target.className === "edit-column-entry") {
            return true;
        }

        if(typeof(event.dosort)==="undefined"){
            event.dosort = true;
        }
        $("#"+self.id+" thead th.sortable").removeClass('sortable-selected');

        $(this).siblings('.sortable').children('span').removeClass('sort-icon-asc').removeClass('sort-icon-desc');
        span = $(this).children('span');
        $(this).addClass('sortable-selected');

        if (!event.dosort) {
            //lets get the passed default order
            span.toggleClass('sort-icon-'+event.sortdir);
        } else {
            span.toggleClass('sort-icon-asc');
        }

        if (span.hasClass('sort-icon-asc')){
            span.removeClass('sort-icon-desc');
            dir = "asc";
        } else {
            span.addClass('sort-icon-desc');
            dir = "desc";
        }

        self.selectedColumn = $(this).attr('dataindex');
        if (event.dosort) {
         self.reload({"params":{"start":0,"dir":dir,"sort":self.selectedColumn}});
        }
    });

    //click on clock to edit grid
    // $("th.editable div.edit-icon").bind('click', function(event) {
    $("body").off('click',"th.editable div.edit-icon");
    $("body").on('click',"th.editable div.edit-icon", function(event) {
        event.preventDefault();
        $('.edit_menu').fadeToggle("fast", function() {
            $('.edit_menu').toggleClass('open');
            if ($('.edit_menu').hasClass('open') && !$('.edit_menu').hasClass('populated')) {
                self.renderEditable();
                $('.edit_menu').addClass('populated');
            }
        });

    });

};

RichHTML.grid.prototype.getRowValues = function(colId, justtext){
    var self = this, arrayofids = [], i;

    if (typeof(justtext) == "undefined") {
        justtext = true;
    }

    rows = $("#"+self.id+" tr td[data-localid='"+colId+"']");
    for (i=0; i<rows.length; i++) {
        if (justtext) {
            arrayofids[i] = $(rows[i]).text();
        } else {
            arrayofids[i] = rows[i].innerHTML;
        }

    }
    return arrayofids;
};

/*
After render event click additions to make expander and checkboxes work
*/
RichHTML.grid.prototype.onLoad = function (reloading) {
    var self = this, data, paginghtml="", buttonshtml="", classes = "", rowid, renderer, text, col, id, event, loopstart, loopend;

	//lets see if we had any data to load
	if (self.data.length === 0) {
        RichHTML.debug(3,Array('Data Not Loaded - Doesn\'t appear to be any data to load'));
        if (self.pagingEl !== null){ $("#"+self.pagingEl).html("");}
		else { $("#"+self.id).parent().children(".richgrid-pagenavi-wrapper").html("");}
        // We should always bind cols, even if no data...
        self.bindColumns();
	} else {
		//we had data to render
		RichHTML.debug(3,Array('Data Loaded - Setting up grid binds (expander & checkboxes)'));

		if(typeof(reloading)==="undefined"){ reloading = false; }
		// if (!reloading) {
			self.bindColumns();
		// }

        //if default sort information is passed lets also
        //mimic that the column was clicked
        if (typeof(self.baseParams.sort) !== "undefined") {
            RichHTML.debug(3,Array('Had default sort info - sorting column',self.baseParams));
            event = jQuery.Event("click");
            event.dosort = false;
            event.sortdir = self.baseParams.dir.toLowerCase();
            $("#"+self.id+" thead th.sortable[dataindex='"+self.baseParams.sort+"']").trigger(event);
        }

		if (self.hasExpander) {

            $("body").off('click',"#"+self.id+" tbody td.expander div.expander-icon");
			$("body").on('click',"#"+self.id+" tbody td.expander div.expander-icon", function() {

				// $(this).toggleClass('expander-icon').toggleClass('expander-icon-expanded');
                $(this).toggleClass('expander-icon-expanded');
				$(this).parent().parent().children('td').toggleClass('nobottomborder');
				$("#"+$(this).parent().attr('id')+"-data").toggle();

				//lets check if we have a delayed renderer
				if ( ($(this).parent().hasClass('delayedrenderer')) && ($(this).hasClass('expander-icon-expanded')) ) {
					classes = $(this).parent().attr('class');
					text = $("#"+$(this).parent().attr('id')+"-data .expander-data").text();
					id = $("#"+$(this).parent().attr('id')+"-data .expander-data").attr('id');
					RichHTML.debug(3,Array('preparing to call delayed renderer',Array("classes:"+classes,"text:"+text,"id:"+id)));
					$.each(classes.split(" "),function(i, val) {
						if (val.indexOf('rowdata') > -1) {
							val = val.split("-"); rowid = val[2]; col = val[1];
							renderer = self.data[rowid][col+"-rich-delayedrenderer"];
							self.dataDelayedRenderer(renderer,text,id,self.data[rowid]);
						}
					});
				}
			});
		}

		if (self.isDraggable) {
            //TODO need to make this a one time binding

            // $("#"+self.id+" tbody td.draghandle .drag-icon").mousedown(function(event) {
            $("body").off("mousedown", "#"+self.id+" tbody td.draghandle .drag-icon");
            $("body").on("mousedown", "#"+self.id+" tbody td.draghandle .drag-icon", function(event) {
				self.mouseDown(this,event);
				return false;
			});
		}

		if (self.hasCheckbox) {

            $("body").off('click',"#"+self.id+" tbody td .checkbox-icon");
            $("body").on('click',"#"+self.id+" tbody td .checkbox-icon", function(event,massclick) {

                //trigger rowselect
                var rowid, data;
                if(typeof(massclick)==="undefined") { massclick = false;}

                $(this).toggleClass('checkbox-icon-checked');
                if(!massclick && !$(this).hasClass('checkbox-icon-checked')) {
                    $("#"+self.id+" th.checkbox-checked").removeClass('checkbox-checked').addClass('checkbox');
                }

                if (!massclick){
                    rowid = $(this).parent().attr('id').split("{-}")[1];
                    data = {};
                    data.rowid = rowid;
                    data.rowsSelected = self.getSelectedRowIds();
                    data.totalSelected = self.getSelectedRowIds().length;
                    $(self).trigger('rowselect',[data]);
                }

                $(this).parent().parent().each(function (){ $(this).toggleClass('row-selected'); });

            });
		}


		//render paging
		if (self.pagingData.totalItems && self.pagingData.totalItems !== null) {
			//lets calculate paging numbers
			self.pagingData.pages = Math.ceil(self.pagingData.totalItems / self.baseParams.limit);
			self.pagingData.start = parseInt(self.baseParams.start,10);
			if (self.pagingData.start === 0) {
				self.pagingData.page = 1;
			} else {
				self.pagingData.page = Math.ceil((self.pagingData.start + 1) / self.baseParams.limit);
			}
			self.pagingData.next = self.pagingData.page +1;
			self.pagingData.previous = self.pagingData.page -1;

			//loop start
			loopstart=Array.max(Array(1,self.pagingData.page));
			loopend=Array.min(Array(self.pagingData.page,self.pagingData.pages));

			if (loopstart!==1 && (self.pagingData.page > 2)) {
				buttonshtml += "<span class='first' data-"+self.id+"-link='0'></span>";
			} else {
                buttonshtml += "<span class='first disabled' data-"+self.id+"-link='0'></span>";
            }

			if (self.pagingData.page > 1) {
				buttonshtml += "<span data-"+self.id+"-link='"+((self.pagingData.page-2)*self.baseParams.limit)+"' class='previouspostslink'></span>";
			} else {
                buttonshtml += "<span data-"+self.id+"-link='"+((self.pagingData.page-2)*self.baseParams.limit)+"' class='previouspostslink disabled'></span>";
            }

			/* Loop through the total pages */
			for(i = loopstart; i <= loopend; i++)
			{
				if (self.pagingData.page === i) { buttonshtml += "<span class='current'>"+i+"</span>"; }
				else {buttonshtml += "<span data-"+self.id+"-link='"+((i-1)*self.baseParams.limit)+"'>"+i+"</span>";}
			}

			if(self.pagingData.page < self.pagingData.pages)
			{
				buttonshtml += "<span class='nextpostslink' data-"+self.id+"-link='"+(self.pagingData.page*self.baseParams.limit)+"'></span>";
			} else {
                buttonshtml += "<span class='nextpostslink disabled' data-"+self.id+"-link='"+(self.pagingData.page*self.baseParams.limit)+"'></span>";
            }

			if (loopend !== self.pagingData.pages) {
				buttonshtml += "<span class='last' data-"+self.id+"-link='"+((self.pagingData.pages-1)*self.baseParams.limit)+"'></span>";
			} else {
                buttonshtml += "<span class='last disabled' data-"+self.id+"-link='"+((self.pagingData.pages-1)*self.baseParams.limit)+"'></span>";
            }

			//lets show paging only if more than one page
			if (self.pagingData.pages>1) {
				paginghtml = RichHTML.replaceAll(self.pagingTpl,"{navbuttons}",buttonshtml);
                paginghtml = RichHTML.replaceAll(paginghtml,"{navpagescount}",self.pagingData.pages);
                paginghtml = RichHTML.replaceAll(paginghtml,"{navpagesitemsperpage}",self.baseParams.limit);

				if (self.pagingEl !== null){
                    $("#"+self.pagingEl).html(paginghtml);
                } else {
                    $("#"+self.id).parent().children(".richgrid-pagenavi-wrapper").html(paginghtml);
                }
			}else{
				if (self.pagingEl !== null){ $("#"+self.pagingEl).html("");}
				else { $("#"+self.id).parent().children(".richgrid-pagenavi-wrapper").html("");}
			}

            $(document).on("click","*[data-"+self.id+"-link]:not(.disabled)",function(){
                $(document).off("click","*[data-"+self.id+"-link]:not(.disabled)");
				self.reload({params:{start:$(this).attr("data-"+self.id+"-link")}});
			});

		}

        //let's see if we have column expanders to bind
        if (self.groupField !== null)
        {
            $("body").on('click','.richtable .rich-grouptoggle', function() {
                $(this).siblings().filter('.rich-grouptoggle').show();
                $(this).hide();
                $(this).parent().parent().nextUntil(".rich-group-row").toggle();
                group_id = $(this).parent().parent().attr('id');
                group_visible = $(this).parent().parent().find('.rich-grouptoggle-minus').is(":visible");

                //if we have cookie enabled let's save this information
                self.set_cookie({'action':'group',data:{group_id: group_id, group_visible: group_visible}});
            });
        }

		//lets set up which cols were selected
		$("#"+self.id+" tbody tr:not(.rich-group-row) td[dataindex='"+self.selectedColumn+"']").addClass('col-selected');
		//lets set up even rows
		$("#"+self.id+" tbody tr:not(.expander-row,.rich-group-row):odd").addClass('odd');

	}

    //bind the checkall
    if (self.hasCheckbox) {
        if(!reloading) {
            $("body").on('click',"#"+self.id+" thead th.checkbox", function() {

                th = this;
                RichHTML.debug(3,Array('Clicking checkbox header',"#"+self.id));

                if(!$(th).hasClass('checkbox-checked')) {
                    $("#"+self.id+" tbody td.checkbox div.checkbox-icon:not(.checkbox-icon-checked)").each(function(){
                        $(this).trigger('click',[true]);
                    });
                } else {
                    $("#"+self.id+" tbody td.checkbox div.checkbox-icon-checked").each(function(){
                        $(this).trigger('click',[true]);
                    });
                }
                // $(th).toggleClass('checkbox').toggleClass('checkbox-checked');
                $(th).toggleClass('checkbox-checked');

                data = {};
                data.rowid = 'all';
                data.rowsSelected = self.getSelectedRowIds();
                data.totalSelected = self.getSelectedRowIds().length;
                $(self).trigger('rowselect',[data]);

            });
        } else {
            //lets uncheck it since we just reloaded the grid
            // $("#"+self.id+" thead th.checkbox-checked").removeClass('checkbox-checked').addClass('checkbox');
            $("#"+self.id+" thead th.checkbox-checked").removeClass('checkbox-checked');
        }
    }

	RichHTML.unMask();
    RichHTML.onPostLoad(self);

	//lets raise trigger that data has been loaded and pass data
	data = {};
	data.paging = self.pagingData;
	data.meta = self.setMetaData(); //shows if el for meta was passed
    data.jsonData = self.jsonData;

    //let's make the footervisible
    if (typeof(self.footerEl) !== "undefined") {
        $('#'+self.footerEl).show();
        $('#'+self.footerEl+ ' .rich-button').attr('disabled','disabled');
    }
	$(self).trigger("load",[data]).trigger("colload");

};

/* method that sets cookies is jquery cookie plugin is present */
RichHTML.grid.prototype.set_cookie = function(params) {
    var self = this;

    if(jQuery.cookie == 'undefined') return;
    if ($.cookie("richgrid-data"+RichHTML.prefixLabel)) {
        cookie_vars = JSON.parse($.cookie("richgrid-data"+RichHTML.prefixLabel));
    } else {
        cookie_vars = {};
    }

    //let's set group toggle states
    if (params.action == "group") {
        //let's ensure we have proper arrays and keys
        if (typeof (cookie_vars[self.el]) == "undefined") cookie_vars[self.el] = {};
        if (typeof (cookie_vars[self.el]['groups']) == "undefined") cookie_vars[self.el].groups = {};

        if (!params.data.group_visible) {
           cookie_vars[self.el].groups[params.data.group_id] = "1"
        } else {
           delete cookie_vars[self.el].groups[params.data.group_id];
        }

    } else if (params.action == "sort") {
        //let's set column ordering in cookie
        if ( (typeof(params.data.d) == "undefined") || (typeof(params.data.s) == "undefined") ) return false;
        //let's ensure we have proper arrays and keys
        if (typeof (cookie_vars[self.el]) == "undefined") cookie_vars[self.el] = {};

        //d for direction, s for sortid
        cookie_vars[self.el]['d'] = params.data.d;
        cookie_vars[self.el]['s'] = params.data.s;

    } else if (params.action == "columns") {

        if (typeof (cookie_vars[self.el]) == "undefined") cookie_vars[self.el] = {};
        if (typeof (cookie_vars[self.el]['hidden']) == "undefined") cookie_vars[self.el].groups = {};

        cookie_vars[self.el].hidden = params.data['h'];
    }

    $.cookie("richgrid-data"+RichHTML.prefixLabel, JSON.stringify(cookie_vars), {expires: self.cookieExpires});
}

RichHTML.grid.prototype.setMetaData = function() {
	var self=this, meta = "";
    if (self.pagingData.totalItems == 0) {
        meta = lang("Displaying items")+": 0 - 0 "+lang("of")+" 0";
    } else if (typeof(self.pagingData.start)!=="undefined") {
        meta = lang("Displaying items")+": " + (self.pagingData.start + 1)+" - "+(self.pagingData.start + self.pagingData.items)+" "+lang("of")+" "+self.pagingData.totalItems;
    }
    if (typeof(self.metaEl) !== "undefined") { $('#'+self.metaEl).html(meta); }
	return meta;
};

RichHTML.grid.prototype.getTargetRow =  function(draggedRow, y) {
        var self = this, rows, row, rowY, rowHeight, i;
        rows = $("#"+self.id)[0].rows;
        for (i=0; i<rows.length; i++) {
            row = rows[i];
            rowY    = self.getPosition(row);
            if (rowY == null) return null;
            rowY = rowY.y;
            rowHeight = parseInt(row.offsetHeight,10)/2;
            if (row.offsetHeight === 0) {
                rowY = self.getPosition(row.firstChild);
                if (rowY == null) return null;
                rowY = rowY.y;

                rowHeight = parseInt(row.firstChild.offsetHeight,10)/2;
            }
            // Because we always have to insert before, we need to offset the height a bit
            if ((y > rowY - rowHeight) && (y < (rowY + rowHeight))) {
				if (row === draggedRow[0]) {
					// ignore the same row
					return null;
				}
                return row;
            }
        }
        return null;
    };

RichHTML.grid.prototype.mouseDown = function(target, event) {
		var self = this;

		self.dragData.dragObject = $(target).parent().parent();
		self.dragData.mouseOffset = self.getMouseOffset(target, event);

        if (self.dragData.mouseOffset == null) return;

		RichHTML.debug(3,Array("Initializing Drag",self.dragData));

		//bind to mouse move
        // $('#'+self.id).mousemove(function(ev){
        $("body").off("mousemove");
        $("body").on("mousemove",'#'+self.id, function(ev){

            var expanderrow, mousePos, y, yOffset, windowHeight, movingDown, currentRow;
            if (self.dragData.dragObject === null) {
                return;
            }
            mousePos = self.mouseCoords(ev);
            y = mousePos.y - self.dragData.mouseOffset.y;
            yOffset = window.pageYOffset;
            if (document.all) {
                if (typeof document.compatMode !== 'undefined' &&
                     document.compatMode !== 'BackCompat') {
                   yOffset = document.documentElement.scrollTop;
                }
                else if (typeof document.body !== 'undefined') {
                   yOffset=document.body.scrollTop;
                }
            }

            if (mousePos.y-yOffset < self.dragData.scrollAmount) {
                window.scrollBy(0, -self.dragData.scrollAmount);
            } else {
                windowHeight = window.innerHeight ? window.innerHeight
                        : document.documentElement.clientHeight ? document.documentElement.clientHeight : document.body.clientHeight;
                if (windowHeight-(mousePos.y-yOffset) < self.dragData.scrollAmount) {
                    window.scrollBy(0, self.dragData.scrollAmount);
                }
            }
            if (y !== self.dragData.savedY) {
                movingDown = y > self.dragData.savedY;
                self.dragData.savedY = y; // update the saved value
                if (self.dragData.onDragClass) { //dragging - time to update style
                    self.dragData.dragObject.addClass(self.dragData.onDragClass);
                }
                //get the row we are over and update the dragobject to proper place
                currentRow = self.getTargetRow(self.dragData.dragObject, y);

                //skip if the current row is an open expander window.. we don't
                //really want to place the row above or below an expander row
                if (currentRow && !$('#'+currentRow.id).hasClass('expander-row')) {
                    if (movingDown) {
                        $('#'+currentRow.id).insertBefore(self.dragData.dragObject);
                    } else {
                        $('#'+currentRow.id).insertAfter(self.dragData.dragObject);
                    }

                    //we have to move the expander
                    if (self.hasExpander) {
                        expanderrow = $("#"+self.id+"-expander-"+currentRow.id.split('row-')[1]+"-data");
                        if(expanderrow.length){
                            expanderrow.insertAfter($('#'+currentRow.id));
                        }
                        expanderrow = $("#"+self.id+"-expander-"+self.dragData.dragObject.attr('id').split('row-')[1]+"-data");
                        if(expanderrow.length){
                            expanderrow.insertAfter(self.dragData.dragObject);
                        }
                    }
                }
            }
        });

        //bind to mouse up
        // $('#'+self.id).mouseup(function(ev){
        $("body").off("mouseup",'#'+self.id);
        $("body").on("mouseup",'#'+self.id, function(ev){

            if (self.dragData.dragObject === null) {return;}

            $('#'+self.id).unbind("mousemove");
            if (self.dragData.onDragClass) {
                self.dragData.dragObject.removeClass(self.dragData.onDragClass);
            }
            //lets re-add the odd/even class
            $("#"+self.id+" tbody tr:not(.expander-row)").removeClass('odd');
            $("#"+self.id+" tbody tr:not(.expander-row):odd").addClass('odd');

            self.dragData.dragObject = null;
            var data = {};
            $(self).trigger("drop",[data]);
        });
    };
