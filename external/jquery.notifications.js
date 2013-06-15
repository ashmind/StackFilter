(function ($) {
    'use strict';
    var supported;
    var show;
    var permitted;
    
    if (window.Notification) {
        supported = true;
        show = function(options) {
            var notification = new Notification(options.title, { body: options.body, icon: options.icon, tag: options.tag });
            notification.onshow  = options.show;
            notification.onclick = options.click;
            notification.onerror = options.error;
            notification.onclose = options.close;
        };
        var permission = window.Notifications.permission;
        if (permission !== undefined)
            permitted = (permission === 'granted');
    }
    
    if (window.webkitNotifications) {
        supported = true;
        show = function(options) {
            var notification = window.webkitNotifications.createNotification(options.title, options.icon, options.content);
            notification.ondisplay  = options.show;
            notification.onclick = options.click;
            notification.onerror = options.error;
            notification.onclose = options.close;
        };
    }

    $.notify = function(options) {
        if (!$.notify.supported)
            return;
    };
}(jQuery));