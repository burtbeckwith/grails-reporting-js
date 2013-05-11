var ReportingJs = (function(){

	var domainListCached;

	function clearTable(table){
		table.find('thead').empty();
		table.find('tbody').empty();
	};

	function makeObjects(data, headers){
		var objects = [];
		for (var i = 0; i < data.length; i++) {
			var obj = {};
			for (var j = 0; j < data[i].length; j++) {
				var prop = headers[j];
				obj[prop] = data[i][j];
			}
			objects.push(obj);
		}
		return objects;
	};

	function getKey(obj){
		if(typeof(obj) == 'object'){
			return obj.id;
		}
		return obj;
	}

	function contains(arr, value){
		var v = getKey(value);
		if(arr.indexOf(v) == -1){
			arr.push(v)
			return false;
		}else{
			return true;
		}
	}

	function makeAxis(objectList, confAxis){
		var yAxis = [];
		var uniques = [];
		for (var i = 0; i < objectList.length; i++) {
			for (var j = 0; j < confAxis.length; j++) {
				var yValue = objectList[i][confAxis[j].prop];
				if(!contains(uniques, yValue)){
					yAxis.push(yValue);
				}
			};
		};
		return yAxis;
	};

	function makeTableKey(obj, axis){
		var keySep = '-|-';
		var key = [];
		for (var j = 0; j < axis.length; j++) {
			key.push(getKey(obj[axis[j].prop]));
		}
		return {key: key.join(keySep), obj: obj};
	}

	function createAxisTable(data, headers, conf){
		var objectList = makeObjects(data, headers);
		var distinctX = makeAxis(objectList, conf.xAxis);

		var outputTable = conf.outputTable;
		var thead = outputTable.find('thead');
		var tr = $('<tr>');
		for (var i = 0; i < conf.yAxis.length; i++) {
			var th = $('<th>').append(conf.yAxis[i].prop).attr('rowspan', conf.cellValues.length);
			tr.append(th);
		};
		for (var i = 0; i < distinctX.length; i++) {
			var th = $('<th>').append(createItemLabel(distinctX[i])).attr('colspan', conf.cellValues.length);
			tr.append(th);
		};
		thead.append(tr);

		tr = $('<tr>');
		for (var j = 0; j < distinctX.length; j++) {
			for (var i = 0; i < conf.cellValues.length; i++) {
				var th = $('<th>').append(conf.cellValues[i].prop);
				tr.append(th);	
			};
		};
		thead.append(tr);
		
		var dataMap = {};
		var yAxisObj = [];
		var yAxis = [];

		var xAxis = [];

		for (var i = 0; i < objectList.length; i++) {
			var keyY = makeTableKey(objectList[i], conf.yAxis);
			if(yAxis.indexOf(keyY.key) == -1){
				yAxis.push(keyY.key);
				yAxisObj.push(keyY);
			}
			var indexX = dataMap[keyY.key] || (dataMap[keyY.key] = {});
			var keyX = makeTableKey(objectList[i], conf.xAxis);
			if(xAxis.indexOf(keyX.key) == -1) xAxis.push(keyX.key);
			indexX[keyX.key] = objectList[i];
		};

		var tbody = outputTable.find('tbody');
		tbody.empty();

		for (var i = 0; i < yAxis.length; i++) {
			var tr = $('<tr>');
			for (var j = 0; j < conf.yAxis.length; j++) {
				var td = $('<td>').append(yAxisObj[i].obj[conf.yAxis[j].prop]);
				tr.append(td);
			}
			for (var j = 0; j < xAxis.length; j++) {
				var cellValue = dataMap[yAxis[i]][xAxis[j]];
				for (var k = 0; k < conf.cellValues.length; k++) {
					var prop = conf.cellValues[k].prop;
					var td;

					if(conf.columnRenderer[prop]){
						td = conf.columnRenderer[prop].render(cellValue[prop], cellValue);
					}else{
						td = $('<td>').append(createItemLabel(cellValue[prop]));
					}

					tr.append(td);
				};
			};
			tbody.append(tr);
		};
	};

	function createSimpleTable(data, headers, conf){
		var outputTable = conf.outputTable;
		var thead = outputTable.find('thead');
		var tr = $('<tr>');

		for (var i = 0; i < headers.length; i++) {
			var th = $('<th>').append(headers[i]);
			tr.append(th);
		};
		thead.append(tr);

		var dataTable;// = outputTable.dataTable();
		if(dataTable){
			dataTable.fnClearTable();
			dataTable.fnAddData(data);
		}else{
			var tbody = outputTable.find('tbody');
			tbody.empty();

			for (var i = 0; i < data.length; i++) {
				var tr = $('<tr>');
				for (var j = 0; j < data[i].length; j++) {
					var td, prop = headers[j];
					if(conf.columnRenderer[prop]){
						td = conf.columnRenderer[prop].render(data[i][j], data[i], data);
					}else{
						td = $('<td>').append(createItemLabel(data[i][j]));
					}
					tr.append(td);
				};
				tbody.append(tr);
				data[i];
			};
		}
	};

	function callServer(domain, conf){
		var outputTable = conf.outputTable;
		clearTable(outputTable);
		var headers = [];
		var criteria = new Criteria(domain.simpleName);
		criteria.projections(function(projections){
			for (var p in domain.props) {
				if(domain.props[p].inProjection()){
					headers.push(p);
					var method = domain.props[p].getMethod();
					if(method == 'sum' || method == 'min' || method == 'max'){
						projections[method](p, p);	
					}else{
						projections[method](p);
					}
				}
			};
		});
		for (var i = 0; i < domain.orderBy.length; i++) {
			var order = domain.orderBy[i];
			criteria.order(order.sort, order.order);
		};

		criteria.list(function(data){
			if(conf.yAxis){
				createAxisTable(data, headers, conf);
			}else{
				createSimpleTable(data, headers, conf);
			}
		});
	}

	function createItemLabel(item){
		if(item && typeof(item) == 'object'){
			return item['name'];
		}
		return item;
	}

	function createDomainTitle(domain, conf){
		var simpleName = domain.simpleName;
		var a = $('<a>').text(simpleName);
		a.attr('href', '#' + simpleName);
		a.click(function(){
			conf.yAxis = null;
			callServer(domain, conf);
		});
		return a;
	};

	function createDomainDiv(domain, outputTable){
		return $('<div>').append(createDomainTitle(domain, outputTable));
	};

	function createProjectionOptions(domain, prop){
		var select = $('<select>').attr('name', domain.simpleName + '.' + prop + '.projections')
			.append($('<option>').val('property').text('show'))
			.append($('<option>').val('groupProperty').text('group'))
			.append($('<option>').val('min').text('min'))
			.append($('<option>').val('max').text('max'))
			.append($('<option>').val('sum').text('sum'))
			.append($('<option>').val('avg').text('avg'))
		;
		domain.props[prop].getMethod = function(){
			return select.val();
		};
		return select;
	};

	function createAttrOptions(domain, prop){
		var chk = $('<input>').attr('type', 'checkbox').attr('name', domain.simpleName + '.' + prop + '.visible');
		domain.props[prop].inProjection = function(){return chk.is(':checked')};
		var lbl = $('<label>').append(chk).append(prop);
		var span = $('<span>').append(createProjectionOptions(domain, prop)).append(lbl);
		return span;
	};

	function createDomainProperties(domain){
		var div = $('<div>').append($('<div>').text("Columns"));
		var ul = $('<ul class="domain-properties">');
		for(var prop in domain.props){
			var lbl = createAttrOptions(domain, prop);
			var li = $('<li>').append(lbl);
			ul.append(li);
		}
		return div.append(ul);
	};

	function createAttrOrderBy(domain, prop, showIn){
		var select = $('<select>')
			.append($('<option>').val('').text('none'))
			.append($('<option>').val('asc').text('asc'))
			.append($('<option>').val('desc').text('desc'))
		;
		select.change(function(){
			var newOrder = [];
			for (var i = 0; i < domain.orderBy.length; i++) {
				if(domain.orderBy[i].sort != prop){
					newOrder.push(domain.orderBy[i]);
				}
			};
			if(select.val() != ''){
				newOrder.push({sort: prop, order: select.val()});
			}
			domain.orderBy = newOrder;
			showIn.empty();
			for (var i = 0; i < domain.orderBy.length; i++) {
				var o = domain.orderBy[i];
				showIn.append(o.sort + ':' + o.order + '; ');
			};
		});
		var lbl = $('<label>').append(prop).append(select);
		return lbl;
	};

	function createDomainOrderBy(domain){
		domain.orderBy = [];
		var showIn = $('<li>');
		var ul = $('<ul>');
		var div = $('<div>').append($('<div>').text("Order by"));
		for(var prop in domain.props){
			var lbl = createAttrOrderBy(domain, prop, showIn);
			var li = $('<li>').append(lbl);
			ul.append(li);
		}
		ul.append(showIn);
		return div.append(ul);
	};

	function createDomainDescription(domain, conf){
		var domainDiv = createDomainDiv(domain, conf);
		domainDiv.append(createDomainProperties(domain));
		domainDiv.append(createDomainOrderBy(domain));
		conf.userInputUI.append(domainDiv);
	};

	function listDomains(cb){
		if(domainListCached != null){
			cb(domainListCached);
		}else{
			$.ajax(config.contextPath + '/reportingJs/domains', {
				contentType : 'application/json',
				type : 'POST',
				success: function(data){
					domainListCached = data;
					cb(data);
				}
			});
		}
	};

	var Moon = function(userConfig){
		var self = this;
		var domain;
		var conf = $.extend({
			onInit: function(){},
			columnRenderer: {}
		}, userConfig);

		listDomains(function(domains){
			for (var i = 0; i < domains.length; i++) {
				if(domains[i].simpleName == conf.domainName){
					domain = domains[i];
					createDomainDescription(domains[i], conf);		
				}
			};
			conf.onInit();
		});

		this.loadReport = function(){
			callServer(domain, conf);
		};

		this.addCellRenderer = function(renderer){
			conf.columnRenderer[renderer.column] = renderer;
		};

		this.setYaxis = function(arr){
			conf.yAxis = arr;
		};

		this.setXaxis = function(arr){
			conf.xAxis = arr;
		};

		this.setCellValues = function(arr){
			conf.cellValues = arr;
		};

		this.setOrderBy = function(arr){
			domain.orderBy = arr;
		};
	};

	Moon.listDomains = listDomains;

	return Moon;
})();


