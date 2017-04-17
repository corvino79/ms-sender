"use strict";

var config = {
    "templateBucket": "ms-ses-sender",
    "templateKey": "Templates/",
    "targetAddress": "jjimenez@compropago.com",
    "fromAddress": "Me <jjimenez@compropago.com>",
    "defaultSubject": "Email From {{name}}",
    "template": "Template"
}

module.exports = config