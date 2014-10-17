var ajax = {
  get: function (url, query) {
    return this.ajax({
      type: 'GET',
      url: url,
      data: query
    })
  },
  post: function (url, data) {
    return this.ajax({
      type: 'POST',
      url: url,
      data: data
    })
  },
  put: function (url, data) {
    return this.ajax({
      type: 'PUT',
      url: url,
      data: data
    })
  },
  delete: function (url, data) {
    return this.ajax({
      type: 'DELETE',
      url: url,
      data: data
    })
  },
  ajax: function (opts) {
    opts.dataType = 'json'
    return $.ajax(opts);
  }
}
