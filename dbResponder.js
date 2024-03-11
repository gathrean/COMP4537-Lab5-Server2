// DISCLOSURE: ChatGPT was used to code solutions presented in this assignment
//
// Server1 : https://comp4537-lab5-server1.netlify.app/
// Server2 : https://lab5-server2as.vercel.app
//
// - With Lab 5, we practiced how to integrate NodeJS with MySQL to 
//   create and manage a relational database with dynamic table creation.
// - We also enhanced our knowledge of allowing users send both
//   POST and GET requests to the server

require('dotenv').config({ path: './.env' });

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const mysql = require('mysql2');
const { ServerError, InvalidBody, InvalidQuery, InvalidQueryType, notFound
    , insertSuccess, insertJSONError } = require('./lang/en');
    
let usersPath = path.join(process.cwd(), './ca-certificate.crt');
let file = fs.readFileSync(usersPath);

const config = {
    user: process.env.NAME,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: process.env.PORT,
    database: process.env.DATABASE,
    ssl: {
        ca: file,
    },
};

const connection = mysql.createConnection(config);

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database');
});

connection.query(`USE lab5`);

const startServer = (port, requestHandler) => {
    const server = http.createServer(requestHandler);
    server.listen(port, () => {
        console.log(`Server listening at http://localhost:${port}`);
    });
};

const queryAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const handleInsert = (req, res) => {
    let data = '';

    req.on('data', (chunk) => {
        data += chunk;
    });

    req.on('end', async () => {
        try {
            const jsonData = JSON.parse(data);
            const getMaxPatientIdQuery = 'SELECT MAX(patientID) AS maxPatientId FROM PATIENT';
            const maxPatientIdResult = await queryAsync(getMaxPatientIdQuery);
            let nextPatientId = 1;

            if (maxPatientIdResult.length > 0 && maxPatientIdResult[0].maxPatientId !== null) {
                nextPatientId = maxPatientIdResult[0].maxPatientId + 1;
            }

            const insertionData = jsonData.data.map(patient => [nextPatientId++, patient.name, patient.dateOfBirth]);
            const insertQuery = 'INSERT INTO PATIENT(patientID, name, dateOfBirth) VALUES ?';

            await queryAsync(insertQuery, [insertionData]);

            console.log(`${jsonData.data.length} records inserted`);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(insertSuccess);
        } catch (error) {
            console.error(error);
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(insertJSONError);
        }
    });
};

const handlePostQuery = (req, res) => {
    let body = '';

    req.on('data', chunk => {
        body += chunk.toString();
    });

    req.on('end', () => {
        try {
            const data = JSON.parse(body);
            const query = data.query.trim().toUpperCase();

            if (!query.startsWith("SELECT") && !query.startsWith("INSERT")) {
                console.error("Invalid query type");
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: InvalidQueryType }));
                return;
            }

            queryAsync(query).then(result => {
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
};

const handleQuery = (req, res, queryParam) => {
    queryAsync(queryParam).then(rows => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: rows }));
    }).catch(err => {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: ServerError }));
    });
};

const requestHandler = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (path === '/insert' && req.method === 'POST') {
        handleInsert(req, res);
    } else if (path === '/query') {
        if (req.method === 'GET') {
            handleQuery(req, res, parsedUrl.query.query);
        } else if (req.method === 'POST') {
            handlePostQuery(req, res);
        }
    } else {
        res.writeHead(404);
        res.end(notFound);
    }
};

startServer(8008, requestHandler);