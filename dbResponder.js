const http = require('http');
const url = require('url');
const mysql = require('mysql');

class Database {
    constructor(config) {
        this.connection = mysql.createConnection(config);

        this.connection.connect((err) => {
            if (err) throw err;
            console.log("Connected to MySQL database");
        });
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

            // CORS headers
            res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            // Preflight request handling
            if (req.method === 'OPTIONS') {
                res.writeHead(204); // No content
                res.end();
                return;
            }

            // Route requests
            if (path === '/insert' && req.method === 'POST') {
                this.handleInsert(req, res);
            } else if (path === '/query' && req.method === 'GET') {
                this.handleQuery(req, res, parsedUrl.query.query);
            } else {
                res.writeHead(404);
                res.end('Not Found');
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
                const getMaxPatientIdQuery = 'SELECT MAX(patientID) AS maxPatientId FROM patient';
                const maxPatientIdResult = await this.queryAsync(getMaxPatientIdQuery);

                let nextPatientId = 1;

                if (maxPatientIdResult.length > 0 && maxPatientIdResult[0].maxPatientId !== null) {
                    nextPatientId = maxPatientIdResult[0].maxPatientId + 1;
                }

                // Prepare data for insertion
                const insertionData = jsonData.data.map(patient => [nextPatientId++, patient.name, patient.dateOfBirth]);

                const insertQuery = 'INSERT INTO patient(patientID, name, dateOfBirth) VALUES ?';

                // Perform the actual insertion
                await this.queryAsync(insertQuery, [insertionData]);

                console.log(`${jsonData.data.length} records inserted`);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Insertion successful');
            } catch (error) {
                console.error(error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON data');
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

    handleQuery(req, res, queryParam) {
        const query = queryParam;

        this.database.query(query, (err, rows) => {
            if (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(rows));
            }
        });
    }
}

// Create instances of Database and HTTPServer
const database = new Database({
    host: "localhost",
    user: "root",
    password: "",
    database: "lab5"
});

const server = new HTTPServer(8008);

// Create an instance of DBResponder with the Database and HTTPServer instances
new DBResponder(database, server);