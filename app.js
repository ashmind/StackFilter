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
    notifications : {
        possible: false,
        enabled:  false
    },
    questions: []
};
ko.track(Model.filter);
ko.track(Model.notifications);
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
                filter:   query.filter
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

var App = {
    _lastUpdate:             new Date().addHours(-1),
    _soFieldFilter:          '!5-2CV5.zdri*hFccadRi6*fBC48*S(u.vSmnlf',
    
    applyFilter : function() {
        this._appliedFilter = Model.filter;
        window.clearTimeout(this._timeoutID);
        Model.filter.changed = false;
        Model.questions.removeAll();
        this.requestUpdate(new Date().addHours(-1));
    },

    requestUpdate: function(fromDate) {
        var query = {
            fromDate: fromDate || this._lastUpdate,
            tags:     this._appliedFilter.tags.split(/[,;\s]+/),
            closed:   false,
            migrated: false,
            score:    { min: this._appliedFilter.minScore },
            filter:   this._soFieldFilter,
            sort:    'creation',
            order:   'desc'
        };
        StackOverflow.search.advanced(query, function(result) {
            this._lastUpdate = new Date();
            this.processUpdate(result.items);
            this._timeoutID = setTimeout(App.requestUpdate, 120000);
        }.bind(this));
    },

    processUpdate : function(questionsJson) {
        var spliceArgs = [0, 0];
        var cleaner = $('<div>');
        for (var i = 0; i < questionsJson.length; i++) {
            var q = questionsJson[i];
            if (parseInt(q.owner.reputation) < this._appliedFilter.minReputation)
                continue;
            
            if (parseInt(q.answer_count) > this._appliedFilter.maxAnswers)
                continue;

            var bodyText = cleaner.html(q.body).text();

            var question = {
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
            };
            spliceArgs.push(question);
            
            if (i === 0)
                this.notifications.show(question);
        }

        Model.questions.splice.apply(Model.questions, spliceArgs);
    },
       
    start : function() {
        this._appliedFilter = Model.filter;
        Model.filter.changed = false;
        for (var key in Model.filter) {
            var keyFixed = key;
            ko.getObservable(Model.filter, key).subscribe(function(newValue) {
                if (this._appliedFilter[keyFixed] !== newValue)
                    Model.filter.changed = true;
            }.bind(this));
        }
        
        this.notifications.setup();
        StackOverflow.authenticate(function() {
            this.requestUpdate();
        }.bind(this));
    }
};
App.applyFilter = App.applyFilter.bind(App);

App.notifications = {
    _permission: undefined,

    setup : function() {
        if (Notification === undefined) {
            Model.notifications.possible = false;
            return;
        }

        this._permission = Notification.permission;
        if (this._permission === undefined) {
            // hi Chromium!
            // https://code.google.com/p/chromium/issues/detail?id=163226
            // https://code.google.com/p/v8/issues/detail?id=2281

            var notification = new Notification("");
            notification.onshow = function() { notification.close(); };
            this._permission = notification.permission;
        }
        
        if (this._permission === 'denied') {
            Model.notifications.possible = false;
            return;
        }
        
        Model.notifications.possible = true;
        if (this._permission === 'granted')
            return;
        
        ko.getObservable(Model.notifications, 'enabled').subscribe(function(newValue) {
            console.log('Enabled changed!');
            if (newValue)
                this.enable();
        }.bind(this));
    },
    
    enable: function() {
        if (this._permission !== 'default')
            return;

        Model.notifications.enabled = false;
        Notification.requestPermission(function(permission) {
            this._permission = permission;
            if (permission === 'denied') {
                Model.notifications.possible = false;
                return;
            }

            if (permission === 'default')
                return;

            Model.notifications.enabled = true;
        }.bind(this));
    },

    show: function(question) {
        if (!Model.notifications.enabled)
            return;

        var notification = new Notification(question.title, {
            body: question.excerpt,
            icon: question.imageUrl
        });
        notification.onshow = function() {
            window.setTimeout(function() {
                notification.close();
            }, 2 * 60 * 1000);
        };
        notification.onclick = function() {
            window.open(question.url);
            notification.close();
        };
    }
};

$(function() {
    ko.applyBindings(Model);
    App.start();
});