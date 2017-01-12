cc3d.extend(cc3d, function () {
    'use strict';

    var ScopeId = function (name) {
        // Set the name
        this.name = name;

        // Set the default value
        this.value = null;

        // Create the version object
        this.versionObject = new cc3d.VersionedObject();
    };

    ScopeId.prototype = {
        setValue: function (value) {
            // Set the new value
            this.value = value;

            // Increment the revision
            this.versionObject.increment();
        },

        getValue: function (value) {
            return this.value;
        }
    };

    return {
        ScopeId: ScopeId
    };
}());
