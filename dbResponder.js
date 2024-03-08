const http = require('http');
const url = require('url');
const mysql = require('mysql');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "lab5"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected to MySQL database");
});

class DBResponder {
    constructor() {
        this.setupServer();
    }

    setupServer() {
        const server = http.createServer((req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const path = parsedUrl.pathname;

            res.setHeader('Access-Control-Allow-Origin', 'http://127.0.0.1:5500');
            res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            // Preflight request handling
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            // Routing
            if (path === '/insert' && req.method === 'POST') {
                this.handleInsert(req, res);
            } else if (path === '/query' && req.method === 'GET') {
                this.handleQuery(req, res, parsedUrl.query.query);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        });

        const port = 8008;
        server.listen(port, () => {
            console.log(`Server listening at http://localhost:${port}`);
        });
    }

    handleInsert(req, res) {
        let data = '';

        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', () => {
            try {
                const jsonData = JSON.parse(data);

                con.query('INSERT INTO patient(patientID, name, dateOfBirth) VALUES ?', [jsonData.data.map(patient => [patient.patientid, patient.name, patient.dateOfBirth])], function (err, result) {
                    if (err) {
                        console.error(err);
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    } else {
                        console.log(`${result.affectedRows} records inserted`);
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('Insertion successful');
                    }
                });
            } catch (error) {
                console.error(error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON data');
            }
        });
    }

    handleQuery(req, res, queryParam) {
        const query = queryParam;

        con.query(query, (err, rows) => {
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

new DBResponder();