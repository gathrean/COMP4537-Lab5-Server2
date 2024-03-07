const http = require('http');
const url = require('url');
const sqlite3 = require('sqlite3').verbose();

// npm install mysql
const mysql = require('mysql');

// Create connection
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "lab5"
});

// Connect to MySQL to run SQL query
con.connect(function(err) {
    if (err) throw err;
    let sql = "INSERT INTO patient(name, dateOfBirth) VALUES ('Elon Musk', '1901-01-01')"
    con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("1 record inserted");
    });
});

class DBResponder {
    constructor() {
        this.setupServer();
        this.setupDatabase();
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

    setupDatabase() {
        this.db = new sqlite3.Database(':memory:'); // In-memory database for simplicity
        this.db.serialize(() => {
            this.db.run('CREATE TABLE IF NOT EXISTS users (name TEXT, dob TEXT)');
        });
    }

    handleInsert(req, res) {
        const data = req.body.data;

        this.db.serialize(() => {
            const stmt = this.db.prepare('INSERT INTO users VALUES (?, ?)');
            data.forEach(({ name, dob }) => {
                stmt.run(name, dob);
            });
            stmt.finalize();
        });

        res.status(200).send('Insertion successful');
    }

    handleQuery(req, res) {
        const query = req.query.query;

        this.db.all(query, (err, rows) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
            } else {
                res.status(200).json(rows);
            }
        });
    }
}

new DBResponder();