var StackOverflow = {
    _tokenCacheKey: 'StackOverflow.accessToken',
    _apiUrl: 'https://api.stackexchange.com/2.1',
    
    setup : function(key) {
        this._key = key;
        var cachedToken = localStorage.getItem(this._tokenCacheKey);
        if (cachedToken) {
            this._accessToken = cachedToken;
            this.authenticated = true;
        }
    },

    authenticate: function(clientId, options) {
        var success = function(result) {
            this._accessToken = result.accessToken;
            this.authenticated = true;
            if (options.cache)
                localStorage.setItem(this._tokenCacheKey, result.accessToken);

            if (options.success)
                options.success();
        }.bind(this);
        
        SE.init({
            clientId: clientId,
            key: this._key,
            channelUrl: window.location.href.replace('app.html', 'blank.html'),
            complete: function() {
                SE.authenticate({
                    scope: options.cache ? ['no_expiry'] : [],
                    success: success,
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