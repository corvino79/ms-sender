'use strict';

/**
 * IO lib portable for AWS nodejs lamdas
 * @author Rolando Lucio <rolando@compropago.com,rolandolucio@gmail.com>
 **/

var http = require('http');

/**
 * Maps the http codes vs the sended status from the controller
 * @package API Public middleware
 * @author Victor Huerta <victor@compropago.com, vhuertahnz@gmail.com>
 * @param  {Number} [status=200] response status
 * @return {Object}              result object with httpCode property and message
 */
const httpCodes = function(code = 200) {
  code = parseInt(code) || 500;

  let result = {
    status: 'error',
    httpCode: code,
    message: http.STATUS_CODES[code]
  };

  if(code >= 200 && code < 300)
    result.status = 'success';

  return result;
};

/**
 * Method than resolves the response
 * @author Rolando Lucio <rolando@compropago.com,rolandolucio@gmail.com>
 * Based on Original
 * @package API Public middleware
 * @author Victor Huerta <victor@compropago.com, vhuertahnz@gmail.com>
 *
 * Modified to process response object for AWS API Gateway Event Payload
 * @param {Object} path           http request object
 * @param {Object} res           http response object
 * @param {Number} [status=200]  response status
 * @return {Object} API gateway response struct
 */
const io = function({
  path = null,
  code = 200,
  message,
  data,
  headers = {
    "Access-Control-Allow-Origin": "*" // Required for CORS support to work
      //"Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept"
  }
} = {}) {

  let result = httpCodes(code);

  let body = {
    code: result.httpCode,
    status: result.status,
    message: message || result.message,
    request: Date.now(),
    url: path
  };

  if(data) body = Object.assign(body, data);

  const response = {
    statusCode: result.httpCode,
    headers: headers,
    body: JSON.stringify(body)
  };

  return response;
};

module.exports = io;
