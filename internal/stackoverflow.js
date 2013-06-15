var StackOverflow = {
    _apiUrl: 'https://api.stackexchange.com/2.1',

    authenticate: function(clientId, key, success) {
        this._key = key;
        SE.init({
            clientId: clientId,
            key: this._key,
            channelUrl: window.location.href.replace('app.html', 'blank.html'),
            complete: function() {
                SE.authenticate({
                    success : function(result) {
                        this._accessToken = result.accessToken;
                        success();
                    }.bind(this),
                    error: function(e) {
                        alert('Failed to authenticate: ' + e.errorName + ", " + e.errorMessage + ".");
                    }
                });
            }.bind(this)
        });
    },

    search : {
        advanced: function(query, complete) {
            var request = {
                site:     'stackoverflow',
                key:      this._key,
                access_token: this._accessToken,
                closed:   query.closed,
                migrated: query.migrated,
                min:      (query.score || {}).min,
                order:    query.order,
                sort:     query.sort,
                filter:   query.filter,
                pagesize: query.pageSize
            };
            if (query.fromDate)
                request.fromdate = query.fromDate.toUnixTime();
            if (query.tags)
                request.tagged = query.tags.join(';');

            $.get(this._apiUrl + '/search/advanced', request, complete);
        }
    }
};
StackOverflow.search.advanced = StackOverflow.search.advanced.bind(StackOverflow);