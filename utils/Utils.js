var express = require('express');

var Utils = {
  buildFindParameters: function (params) {
    if (!params || !params.columns || !params.search || (!params.search.value && params.search.value !== '')) {
      return null;
    }

    var searchText = params.search.value,
    findParameters = {},
    searchRegex,
    searchOrArray = [];

    if (searchText === '') {
      return findParameters;
    }

    searchRegex = new RegExp(searchText, 'i');
    console.log(JSON.stringify(searchRegex, null, 2));

    var searchableFields = this.getSearchableFields(params);

    if (searchableFields.length === 1) {
      findParameters[searchableFields[0]] = searchRegex;
      return findParameters;
    }

    searchableFields.forEach(function (field) {
      var orCondition = {};
      orCondition[field] = searchRegex;
      searchOrArray.push(orCondition);
    });

    findParameters.$or = searchOrArray;

    return findParameters;
  },

  buildSortParameters: function (params) {
    if (!params || !Array.isArray(params.order) || params.order.length === 0) {
      return null;
    }

    var sortColumn = Number(params.order[0].column),
    sortOrder = params.order[0].dir,
    sortField;

    if (this.isNaNorUndefined(sortColumn) || !Array.isArray(params.columns) || sortColumn >= params.columns.length) {
      return null;
    }

    if (params.columns[sortColumn].orderable === 'false') {
      return null;
    }

    sortField = params.columns[sortColumn].data;

    if (!sortField) {
      return null;
    }

    if (sortOrder === 'asc') {
      return sortField;
    }

    return '-' + sortField;
  },

  buildSelectParameters: function (params) {
    if (!params || !params.columns || !Array.isArray(params.columns)) {
      return null;
    }

    return params
    .columns
    .map(col => col.data)
    .reduce((selectParams, field) => {
      selectParams[field] = 1;
      return selectParams;
    }, {});
  },

  getSearchableFields: function (params) {
      return params.columns.filter(function (column) {
          return JSON.parse(column.searchable);
      }).map(function (column) {
          return column.data;
      });
  },

  isNaNorUndefined: function () {
      var args = Array.prototype.slice.call(arguments);
      return args.some(function (arg) {
          return isNaN(arg) || (!arg && arg !== 0);
      });
  },
}

module.exports = Utils;
