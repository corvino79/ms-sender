console.log('Version 0.1.3');

var aws = require('aws-sdk');

var ses = new aws.SES({
   region: 'us-east-1'
});
var s3 = new aws.S3();

module.exports.sender = function (event, context, callback) {

    console.log("Event: " + JSON.stringify(event.body));
    
    try {
        var req = event.body
    }catch(e){
        context.fail("No era JSON")
    }
    // Check required parameters
    if (req.email == null) {
        context.fail('Bad Request: Missing required member: email');
        return;
    }

    var config = require('./src/config.js');
    
    // Make sure some expected results are present
    console.log("-------", config)
    if (event.body.name == null) {
        event.body.name = event.body.email;
    }
    
    // Make sure we have a subject.
    // If the event didn't include it, then
    // pull it from the configuration.
    // If we still don't have a subject, then
    // just make one up.
    if (event.subject == null) {
        event.subject = config.defaultSubject;
        
        if (event.body.subject == null) {
            event.body.subject = "Mail from {{name}}";
        }
    }
    
    console.log('Loading template from ' + config.templateKey + ' in ' + config.templateBucket);

    // Read the template file
    s3.getObject({
        Bucket: config.templateBucket, 
        Key: config.templateKey
    }, function (err, data) {
        //console.log(err)
        if (err) {
            // Error
            console.log(err, err.stack);
            context.fail('Internal Error: Failed to load template from s3.')
        } else {
            var templateBody = data.Body.toString();
            console.log("Template Body: " + templateBody);
            
            // Convert newlines in the message
            if (event.body.message != null) {
                event.body.message = event.body.message
                .replace("\r\n", "<br />")
                .replace("\r", "<br />")
                .replace("\n", "<br />");
            }

            // Perform the substitutions
            var mustache = require('mustache');
            var subject = mustache.render(event.subject, event.body);
            console.log("Final subject: " + subject);
            
            console.log("xxxxxxxxxxxxxxxxxx: " + event.body);
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
                console.log("++++++++++++++++++++++++++++++++++++++++++ HTML");
                params.Message.Body = {
                    Html: {
                        Data: message,
                        Charset: 'UTF-8'
                    }
                };
            } else if (fileExtension.toLowerCase() == 'txt') {
                console.log("++++++++++++++++++++++++++++++++++++++++++ TXT");
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

            // Send the email
            //console.log("++++++++++++++++++++++++++++++++++++++++++", event);
            ses.sendEmail(params, function (err, data) {
                if (err) {
                    console.log(err, err.stack);
                    context.fail('Internal Error: The email could not be sent.');
                    callback(null, err);
                } else {
                    console.log(data);           // successful response
                    context.succeed('The email was successfully sent to ' + event.body.email);
                    callback(null, data);
                }
            });
        }
    });
};