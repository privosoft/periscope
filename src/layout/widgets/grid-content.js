import {inject, computedFrom} from 'aurelia-framework';
import {WidgetContent} from './widget-content';
import {DataHelper} from 'helpers/data-helper';
import $ from 'jquery';
import lodash from 'lodash';
import kendo from 'kendo-ui';
//import kendodata from 'kendo.data.min';

export class GridContent extends WidgetContent {
  constructor(widget) {
    super(widget);
    this.columns = this.settings.columns;
    this.navigatable = this.settings.navigatable;
    this._gridDataSource = new kendo.data.DataSource({
      type: "json",
      pageSize: this.settings.pageSize ? this.settings.pageSize : 20,
      group: this.settings.group
    });
  }

  get selectedCol(){
    return this._selectedCol;
  }
  set selectedCol(value){
    this._selectedCol = value;
  }

  get selectedRow(){
    return this._selectedRow;
  }
  set selectedRow(value){
    this._selectedRow = value;
  }

  set columns(value){
    this._columns = value;
  }
  get columns(){
    return this._columns;
  }

  attached() {
    this.restoreState();

    var me = this;
    me._grid = $(this.gridElement).kendoGrid({
      dataSource: this._gridDataSource,
      height: this._calculateHeight(this.gridElement),
      sortable: true,
      scrollable: {
        virtual: true
      },
      selectable: "row",
      pageable: {
        numeric: false,
        previousNext: false,
        messages: {
          display: "{2} data items"
        }
      },
      filterable: {
        mode: "row"
      },
      navigatable: true, //this.navigatable,
      navigate: e => {
        // select the entire row
        var row = $(e.element).closest("tr");

        var colIdx = $("td,th", row).index(e.element);
        var col = me.columns[colIdx-1];
        if ((col)&&(col.selectable)) {
          if (col!=this.selectedCol) {
            $(me.gridElement).find('th').removeClass("col-selected")
            var th = $(me.gridElement).find('th').eq(colIdx);
            th.addClass("col-selected");
            this.selectedCol = col;
            me.onColumnSelected(col.field);
          }
        }
        else
          $(me.gridElement).find('th').removeClass("col-selected");
        me._grid.data("kendoGrid").select(row);
      },
      groupable: true,
      columnMenu:true,
      columnMenuInit: e=> {
        var menu = e.container.find(".k-menu").data("kendoMenu");
        var field = e.field;
        menu.remove($(menu.element).find('li:contains("Columns")'));
        menu.append({ text: "Columns" });
        menu.bind("select", x=> {
          if ($(x.item).text() == "Columns") {
            $(me.columnsChooserPopup).modal('show');
          }
        });
      },
      columns: this.columns,
      change: e => {
        var selectedRows = me._grid.data("kendoGrid").select();
        if(selectedRows.length == 0 )
          return;
        this.selectedRow = me._grid.data("kendoGrid").dataItem(selectedRows[0]);
        me.onSelected(this.selectedRow);
      },
      dataBound: e=> {
        $(me.gridElement).find("tr[data-uid]").dblclick(e=> {
          var selectedData = me._grid.data("kendoGrid").select()
          me.onActivated(me._grid.data("kendoGrid").dataItem(selectedData[0]));
        });
      }
    });
  }

  set data(value) {
    this._gridDataSource.page(0);
    this._gridDataSource.data(value);

    var self = this;
    self.widget.dataSource.getMetadata().then(meta=>{
      for (let fld of meta.fields){
        var c = _.find(self.columns, {'field':fld.field});
        if (!c)
          self.columns.push({field:fld.field, hidden:true});
        else if ((!c.hidden)&&(!c.format))
          c.format = this.getColumnFormat(c.field, fld.type);
      }
      $(self.gridElement).data("kendoGrid").setOptions({
        columns: self.columns
      });
    })


  }


  saveState(){
    this.widget.state = {columns:this.columns};
  }

  restoreState(){
    if (this.widget.state)
      this.columns = this.widget.state.columns;
  }

  onColumnSelected(colName){
    this.widget.dataFieldSelected.raise(colName);
  }

  onActivated(dataItem){
    var currentRecord = new Map();
    _.forOwn(dataItem, (v, k)=>{
      currentRecord.set(k,v);
    })
    this.widget.dataActivated.raise(currentRecord);
  }

  onSelected(dataItem){ // assuming single row select for now
    var currentRecord = new Map();
    _.forOwn(dataItem, (v, k)=>{
      currentRecord.set(k,v);
    })
    this.widget.dataSelected.raise(currentRecord);
  }



  getColumnFormat(columnName, type){
    switch (type){
      case "date":
        return "{0:MMM.dd yyyy}";
      case "currency":
        return "{0:n2}";
      default:
        return "";
    }
  }

  /// Columns chooser
  get columnsFilterExpression(){
    return this._columnsFilterExpression;
  }
  set columnsFilterExpression(value){
    this._columnsFilterExpression = value;
  }

  get filteredColumns(){
    if (this.columnsFilterExpression)
      return _.filter(this.columns, x => (x.field.toLowerCase().indexOf(this.columnsFilterExpression.toLowerCase())==0));
    return this.columns;
  }


  selectColumn(column){
    var c = _.find(this.columns, {"field": column.field});
    c.hidden=(!c.hidden);
    if (!c.format)
      c.format = this.getColumnFormat(c.field, this._gridDataSource.data());
    $(this.gridElement).data("kendoGrid").setOptions({
      columns: this.columns
    });
    this.saveState();
    return true;
  }
  /// End columns chooser
}