require('dotenv').config({ path: './.env' });

const http = require('http');
const url = require('url');
const mysql = require('mysql2');
const { ServerError, InvalidBody, InvalidQuery, InvalidQueryType, notFound
    , insertSuccess, insertJSONError } = require('./lang/en')
const {readFileSync} = require("fs");

class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);

        this.connection.connect((err) => {
            if (err) throw err;
            console.log("Connected to MySQL database");
        });

        this.connection.query(`USE lab5`);
    }

    query(sql, params, callback) {
        this.connection.query(sql, params, callback);
    }
}

class HTTPServer {
    constructor(port) {
        this.port = port;
    }

    startServer(requestHandler) {
        const server = http.createServer(requestHandler);
        server.listen(this.port, () => {
            console.log(`Server listening at http://localhost:${this.port}`);
        });
    }
}

class DBResponder {
    constructor(database, server) {
        this.database = database;
        this.server = server;

        this.setupServer();
    }

    setupServer() {
        this.server.startServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const path = parsedUrl.pathname;

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            // Preflight request handling
            if (req.method === 'OPTIONS') {
                res.writeHead(204); // No content
                res.end();
                return;
            }

            if (path === '/insert' && req.method === 'POST') {
                this.handleInsert(req, res);
            } else if (path === '/query') {
                if (req.method === 'GET') {
                    this.handleQuery(req, res, parsedUrl.query.query);
                } else if (req.method === 'POST') {
                    this.handlePostQuery(req, res);
                }
            } else {
                res.writeHead(404);
                res.end(notFound);
            }
        });
    }

    async handleInsert(req, res) {
        let data = '';

        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', async () => {
            try {
                const jsonData = JSON.parse(data);

                // Fetch the current maximum patientid from the database
                const getMaxPatientIdQuery = 'SELECT MAX(patientID) AS maxPatientId FROM PATIENT';
                const maxPatientIdResult = await this.queryAsync(getMaxPatientIdQuery);

                let nextPatientId = 1;

                if (maxPatientIdResult.length > 0 && maxPatientIdResult[0].maxPatientId !== null) {
                    nextPatientId = maxPatientIdResult[0].maxPatientId + 1;
                }

                // Prepare data for insertion
                const insertionData = jsonData.data.map(patient => [nextPatientId++, patient.name, patient.dateOfBirth]);

                const insertQuery = 'INSERT INTO PATIENT(patientID, name, dateOfBirth) VALUES ?';

                // Perform the actual insertion
                await this.queryAsync(insertQuery, [insertionData]);

                console.log(`${jsonData.data.length} records inserted`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(insertSuccess);
            } catch (error) {
                console.error(error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end(insertJSONError);
            }
        });
    }

    // Add an asynchronous query method to handle database queries with promises
    queryAsync(sql, params) {
        return new Promise((resolve, reject) => {
            this.database.query(sql, params, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async handlePostQuery(req, res) {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString(); // Convert Buffer to string
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const query = data.query.trim().toUpperCase(); // Normalize the query
                console.log(query);

                // Validate the query type for SELECT and INSERT
                if (!query.startsWith("SELECT") && !query.startsWith("INSERT")) {
                    console.error("Invalid query type");
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: InvalidQueryType }));
                    return;
                }

                // Use queryAsync for database operation
                this.queryAsync(query).then(result => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, data: result }));
                }).catch(err => {
                    console.error(err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: InvalidQuery }));
                });
            } catch (error) {
                console.error(error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid request body' }));
            }
        });
    }


    async handleQuery(req, res, queryParam) {
        // Use queryAsync for database operation
        this.queryAsync(queryParam).then(rows => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: rows }));
        }).catch(err => {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: ServerError }));
        });
    }

}

// Create instances of Database and HTTPServer
const database = new Database({
    user: process.env.NAME,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE,
    ssl: {
        ca: readFileSync("./ca-certificate.crt"),
    }
});

const server = new HTTPServer(8008);

// Create an instance of DBResponder with the Database and HTTPServer instances
new DBResponder(database, server);