var ses = require('./src/ses/sender');
var IO = require('./src/lib/rest/io');

module.exports.sender = function(event, context, callback) {
    /*let parsed = {
        "email": "jjimenez@compropago.com",
        "subject": "Test AWS SES",
        "name": "Customer Name",
        "message": "Hello World!\nGoing to the moon!"
    };*/
    const parsed = event;
    const body = parsed.body;
    console.log("dddddddd: ", body);
    //parsed.push({ "templateid": event.pathParameters.template });
    //console.log("----------------------", body);
    ses.send(body)
        .then(res => {
            return callback(null, IO({
                path: parsed.resource
            }));
        })
        .catch(e => {
            console.log(e);
            return callback(null, IO({
                code: e.code,
                path: body.resource,
                data: {
                    params: body,
                    details: e.message
                }
            }));
        });

    //callback(null, evebt);
};