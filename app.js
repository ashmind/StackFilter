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

var Model = {
    filter: {
        tags: 'c#',
        minScore: 0,
        minReputation: 2,
        maxAnswers: 0,
        
        changed: false
    },
    questions: []
};
ko.track(Model.filter);
ko.track(Model);

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
            site:   'stackoverflow',
            key:    this._key,
            access_token: this._accessToken,
            min:    (query.score || {}).min,
            order:  query.order,
            sort:   query.sort,
            filter: query.filter
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
    _soFieldFilter: '!5-2CV5.zdri*hFccadRi6*fBC48*S(u.vSmnlf',
    
    applyFilter : function() {
        App._appliedFilter = Model.filter;
        window.clearTimeout(App._timeoutID);
        Model.filter.changed = false;
        Model.questions.removeAll();
        App.requestUpdate(new Date().addHours(-1));
    },

    requestUpdate: function(fromDate) {
        var query = {
            fromDate: fromDate || App._lastUpdate,
            filter:   App._soFieldFilter,
            score:    { min: App._appliedFilter.minScore },
            sort:    'creation',
            order:   'desc',
            tags:    App._appliedFilter.tags.split(/[,;\s]+/)
        };
        StackOverflow.questions(query, function(result) {
            App._lastUpdate = new Date();
            App.processUpdate(result.items);
            App._timeoutID = setTimeout(App.requestUpdate, 120000);
        });
    },

    processUpdate : function(questions) {
        var spliceArgs = [0, 0];
        var cleaner = $('<div>');
        for (var i = 0; i < questions.length; i++) {
            var q = questions[i];
            if (parseInt(q.owner.reputation) < App._appliedFilter.minReputation)
                continue;
            
            if (parseInt(q.answer_count) > App._appliedFilter.maxAnswers)
                continue;

            var bodyText = cleaner.html(q.body).text();

            spliceArgs.push({
                url:     q.link,
                title:   q.title,
                excerpt: bodyText.match(/^\s*(\S*(?:\s+\S+){0,39})/)[1] + '…',
                tags:    q.tags,
                score:   q.score,
                answers: q.answer_count,
                views:   q.view_count,
                posted:  Date.fromUnixTime(q.creation_date),
                author: {
                    name:       q.owner.display_name,
                    imageUrl:   q.owner.profile_image,
                    reputation: q.owner.reputation
                }
            });
        }

        Model.questions.splice.apply(Model.questions, spliceArgs);
    },
    
    start : function() {
        App._appliedFilter = Model.filter;
        Model.filter.changed = false;
        for (var key in Model.filter) {
            var keyFixed = key;
            ko.getObservable(Model.filter, key).subscribe(function(newValue) {
                if (App._appliedFilter[keyFixed] !== newValue)
                    Model.filter.changed = true;
            });
        }

        StackOverflow.authenticate(function() {
            App.requestUpdate();
        });
    }
};

$(function() {
    ko.applyBindings(Model);
    App.start();
});