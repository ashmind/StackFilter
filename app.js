Date.prototype.toUnixTime = function() {
    return Math.round(this.getTime() / 1000);
};

Date.prototype.addHours = function(hours) {
    this.setHours(this.getHours() + hours);
    return this;
};

var model = {
    questions: []
};
ko.track(model);

var StackOverflow = {
    _key: 'pDZGs9mGjjQ*mP0RG6ojYg((',
    _apiUrl: 'https://api.stackexchange.com/2.1',

    authenticate: function(success) {
        SE.init({
            clientId: 1655,
            key: this._key,
            channelUrl: window.location.href.replace('app.html', 'blank.html'),
            complete: function() {
                SE.authenticate({
                    success : function(result) {
                        StackOverflow._accessToken = result.accessToken;
                        success();
                    },
                    error: function(e) {
                        alert('Failed to authenticate: ' + e.errorName + ", " + e.errorMessage + ".");
                    }
                });
            }
        });
    },

    questions : function(query, complete) {
        var request = {
            site: 'stackoverflow',
            key: this._key,
            access_token: this._accessToken,
            min: query.min,
            sort: query.sort
        };
        if (query.fromDate)
            request.fromdate = query.fromDate.toUnixTime();

        $.get(this._apiUrl + '/questions', request, complete);
    }     
};

var App = {
    _lastUpdate: new Date().addHours(-1),
    
    requestUpdate: function() {
        var query = { fromDate: App._lastUpdate, sort: 'creation', min: 0 };
        StackOverflow.questions(query, function(result) {
            App._lastUpdate = new Date();
            App.processUpdate(result.items);
            setTimeout(App.requestUpdate, 120000);
        });
    },

    processUpdate : function(questions) {
        for (var i = 0; i < questions.length; i++) {
            model.questions.splice(0, 0, {
                title: questions[i].title,
                url: questions[i].link
            });
        }
    },
    
    start : function() {
        StackOverflow.authenticate(function() {
            App.requestUpdate();
        });
    }
};

$(function() {
    ko.applyBindings(model);
    App.start();
});