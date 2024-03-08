const ServerError = 'internal server error';
const InvalidBody = 'Invalid request body';
const InvalidQuery = 'Error executing query';
const InvalidQueryType = 'Only SELECT and INSERT queries are allowed';
const notFound = 'Not found';
const insertSuccess = 'Insert successful';
const insertJSONError = 'Invalid JSON data';


module.exports = {
    ServerError,
    InvalidBody,
    InvalidQuery,
    InvalidQueryType,
    notFound,
    insertSuccess,
    insertJSONError
}