Date.fromUnixTime = function(value) {
    return new Date(value * 1000);
};

Date.prototype.toUnixTime = function() {
    return Math.round(this.getTime() / 1000);
};

Date.prototype.addHours = function(hours) {
    this.setHours(this.getHours() + hours);
    return this;
};

ko.bindingHandlers.datetime = {
    init: function(element, valueAccessor) {
        $(element).attr('datetime', valueAccessor().toISOString())
            .timeago();
    },

    update: function(element, valueAccessor) {
        $(element).attr('datetime', valueAccessor().toISOString());
    }
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
            key:   this._key,
            access_token: this._accessToken,
            min:   (query.score || {}).min,
            order: query.order,
            sort:  query.sort
        };
        if (query.fromDate)
            request.fromdate = query.fromDate.toUnixTime();
        if (query.tags)
            request.tagged = query.tags.join(';');

        $.get(this._apiUrl + '/questions', request, complete);
    }     
};

var App = {
    _lastUpdate: new Date().addHours(-1),
    
    requestUpdate: function() {
        var query = {
            fromDate: App._lastUpdate,
            score:    { min: 0 },
            sort:    'creation',
            order:   'desc',
            tags:    ['c#']
        };
        StackOverflow.questions(query, function(result) {
            App._lastUpdate = new Date();
            App.processUpdate(result.items);
            setTimeout(App.requestUpdate, 120000);
        });
    },

    processUpdate : function(questions) {
        var spliceArgs = [0, 0];
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            spliceArgs.push({
                title:   q.title,
                score:   q.score,
                answers: q.answer_count,
                views:   q.view_count,
                url:     q.link,
                posted:  Date.fromUnixTime(q.creation_date),
                author: {
                    name:       q.owner.display_name,
                    imageUrl:   q.owner.profile_image,
                    reputation: q.owner.reputation
                }
            });
        }

        model.questions.splice.apply(model.questions, spliceArgs);
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