Date.fromUnixTime = function(value) {
    return new Date(value * 1000);
};

Date.prototype.toUnixTime = function() {
    return Math.round(this.getTime() / 1000);
};

Date.prototype.addMinutes = function(hours) {
    this.setMinutes(this.getMinutes() + hours);
    return this;
};

Date.prototype.addHours = function(hours) {
    this.setHours(this.getHours() + hours);
    return this;
};

Date.prototype.addDays = function(days) {
    this.setDate(this.getDate() + days);
    return this;
};

Date.prototype.toJSON = function() {
    return this.toISOString();
};