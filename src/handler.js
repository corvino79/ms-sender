var aws = require('aws-sdk');
var config = require('./src/config.js');
var mustache = require('mustache');


var ses = new aws.SES({ region: 'us-east-1' });
var s3 = new aws.S3();

module.exports.sender = function (event, context, callback) {

    try {
        var req = event.body
    } catch (e) {
        context.fail("No era JSON")
    }

    if (req.email == null) {
        context.fail('Bad Request: Missing required member: email');
        return;
    }

    if (event.body.name == null) {
        event.body.name = event.body.email;
    }

    if (event.subject == null) {
        event.subject = config.defaultSubject;

        if (event.body.subject == null) {
            event.body.subject = "Mail from {{name}}";
        }
    }

    s3.getObject({
        Bucket: config.templateBucket,
        Key: config.templateKey
    }, function (err, data) {
        if (err) {
            context.fail('Internal Error: Failed to load template from s3.')
        } else {
            var templateBody = data.Body.toString();
            console.log("Template Body: " + templateBody);

            if (event.body.message != null) {
                event.body.message = event.body.message
                    .replace("\r\n", "<br />")
                    .replace("\r", "<br />")
                    .replace("\n", "<br />");
            }
            
            var subject = mustache.render(event.subject, event.body);
            console.log("Final subject: " + subject);

            var message = mustache.render(templateBody, event.body);
            console.log("Final message: " + message);

            var params = {
                Destination: {
                    ToAddresses: [
                        config.targetAddress
                    ]
                },
                Message: {

                    Subject: {
                        Data: subject,
                        Charset: 'UTF-8'
                    }
                },
                Source: config.targetAddress,
                ReplyToAddresses: [
                    event.body.name + '<' + event.body.email + '>'
                ]
            };

            var fileExtension = config.templateKey.split(".").pop();
            if (fileExtension.toLowerCase() == 'html') {
                params.Message.Body = {
                    Html: {
                        Data: message,
                        Charset: 'UTF-8'
                    }
                };
            } else if (fileExtension.toLowerCase() == 'txt') {
                params.Message.Body = {
                    Text: {
                        Data: message,
                        Charset: 'UTF-8'
                    }
                };
            } else {
                context.fail('Internal Error: Unrecognized template file extension: ' + fileExtension);
                callback(null, err);
                return;
            }

            ses.sendEmail(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                    context.fail('Internal Error: The email could not be sent.');
                    callback(null, err);
                } else {
                    console.log(data);
                    context.succeed('The email was successfully sent to ' + event.body.email);
                    callback(null, data);
                }
            });
        }
    });
};