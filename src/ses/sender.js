'use strict';

var aws = require('aws-sdk');
var Joi = require('joi');
var config = require('../config.js');
var mustache = require('mustache');

var ses = new aws.SES({
    region: 'us-east-1'
});
var s3 = new aws.S3();

var parameters = {};

const controller = {

    send({ email = '', name = '', subject = '', message = '', template = '', body = {} } = {}, from = 'soporte@compropago.com') {
        parameters = { email, name, subject, message, template };

        let schema = Joi.object()
            .keys({
                email: Joi.string()
                    .email(),
                name: Joi.string()
                    .min(1),
                subject: Joi.string()
                    .min(4),
                message: Joi.string()
                    .min(4)
            });
        return new Promise(function(resolve, reject) {
            const validation = Joi.validate({ email, name, subject, message }, schema);
            //console.log("xxxxxxxxxxxxxxxxxxxxxxxxxx", config.templateKey + "367895.html");
            if (validation.error !== null) {
                reject({ code: 400, message: validation.error });
            }

            if (parameters.email == null || parameters.email == '') {
                reject({ code: 400, message: "Datos invalidos" });
            }

            config.templateKey = config.templateKey + parameters.template + ".html"

            s3.getObject({
                Bucket: config.templateBucket,
                Key: config.templateKey
            }, function(err, data) {
                if (err) {
                    //context.fail('Internal Error: Failed to load template from s3.')
                    reject({ code: 503, message: "error.message.template.invalid" });
                } else {
                    var templateBody = data.Body.toString();
                    //console.log("Template Body: " + templateBody);

                    if (message != null) {
                        message = message
                            .replace("\r\n", "<br />")
                            .replace("\r", "<br />")
                            .replace("\n", "<br />");
                    }

                    //console.log("Final subject: ", subject, params);
                    //var subject = mustache.render(subject, body);

                    //console.log("Final message: ", parameters);
                    var message = mustache.render(templateBody, parameters);

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
                            name + '<' + email + '>'
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
                        //context.fail('Internal Error: Unrecognized template file extension: ' + fileExtension);
                        //callback(null, err);
                        reject({ code: 503, message: "error.message.template.invalid" });
                        console.log("Error: ", err)
                        return;
                    }

                    ses.sendEmail(params, function(err, data) {
                        if (err) {
                            console.log(err, err.stack);
                            //context.fail('Internal Error: The email could not be sent.');
                            reject({ code: 503, message: error });
                        } else {
                            console.log(data);
                            //context.succeed('The email was successfully sent to ' + email);
                            resolve({ code: 200 });
                        }
                    });
                }
            });
        });
    }
};

module.exports = controller;