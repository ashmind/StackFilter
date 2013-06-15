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
        lowReputationMinScore: 3,
        maxAnswers: 0,
        
        changed: false
    },
    notifications : {
        possible: false,
        problem:  '',
        enabled:  false
    },
    questions: []
};
ko.track(Model.filter);
ko.track(Model.notifications);
ko.track(Model);

var App = {
    _soFieldFilter: '!5-2CV5.zdri*hFccadRi6*fBC48*S(u.vSmnlf',
   
    applyFilter : function() {
        this._appliedFilter = Model.filter;
        window.clearTimeout(this._timeoutID);
        Model.filter.changed = false;
        Model.questions.removeAll();
        this.requestUpdate();
    },

    requestUpdate: function() {
        var query = {
            fromDate: new Date().addDays(-1),
            tags:     this._appliedFilter.tags.split(/[,;\s]+/),
            closed:   false,
            migrated: false,
            score:    { min: this._appliedFilter.minScore },
            filter:   this._soFieldFilter,
            sort:    'creation',
            order:   'desc',
            pageSize: 100
        };
        StackOverflow.search.advanced(query, function(result) {
            this._lastUpdate = new Date();
            this.processUpdate(result.items);
            this._timeoutID = setTimeout(App.requestUpdate.bind(App), 120000);
        }.bind(this));
    },

    processUpdate : function(questionsJson) {
        var cleaner = $('<div>');
        var getExceprt = function(bodyHtml) {
            var bodyText = cleaner.html(bodyHtml).text();
            return bodyText.match(/^\s*(\S*(?:\s+\S+){0,39})/)[1] + '…';
        };

        var questionMap = {};
        for (var i = 0; i < Model.questions.length; i++) {
            Model.questions[i].updated = false;
            questionMap[Model.questions[i].id] = Model.questions[i];
        }

        var spliceArgs = [0, 0];
        for (var i = 0; i < questionsJson.length; i++) {
            var q = questionsJson[i];
            if (parseInt(q.owner.reputation) < this._appliedFilter.minReputation && parseInt(q.score) < this._appliedFilter.lowReputationMinScore)
                continue;
            
            if (parseInt(q.answer_count) > this._appliedFilter.maxAnswers)
                continue;
            
            var question = questionMap[q.question_id];
            var isNew = false;
            if (!question) {
                // new question
                isNew = true;
                question = {};
                questionMap[q.question_id] = question;
            }
            
            $.extend(question, {
                id:      q.question_id,
                url:     q.link,
                title:   q.title,
                excerpt: getExceprt(q.body),
                tags:    q.tags,
                score:   q.score,
                answers: q.answer_count,
                views:   q.view_count,
                posted:  Date.fromUnixTime(q.creation_date),
                author: {
                    name:       q.owner.display_name,
                    imageUrl:   q.owner.profile_image,
                    reputation: q.owner.reputation
                },
                
                updated: true
            });

            if (!isNew)
                continue;

            ko.track(question);
            spliceArgs.push(question);
            
            this.notifications.show(question);
        }
        
        cleaner.remove();
        Model.questions.splice.apply(Model.questions, spliceArgs);
        // remove all questions that were not found during this update
        Model.questions.remove(function(q) { return !q.updated; });
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
        StackOverflow.authenticate(settings.StackOverflowAPI.clientId, settings.StackOverflowAPI.key, function() {
            this.requestUpdate();
        }.bind(this));
    }
};
App.applyFilter = App.applyFilter.bind(App);

App.notifications = {
    _permission: undefined,

    setup : function() {
        if (window.Notification === undefined) {
            Model.notifications.possible = false;
            Model.notifications.problem = 'not supported';
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
            Model.notifications.problem = 'denied permission';
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
                Model.notifications.problem = 'denied permission';
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
            body: question.excerpt
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