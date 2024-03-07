const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

// npm install mysql
const mysql = require('mysql');

// Create connection
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "webdev"
});

// Connect to MySQL to run SQL query
con.connect(function(err) {
    if (err) throw err;
    let sql = "INSERT INTO score(name, score) VALUES ('Elon Musk', 2900)"
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
        const app = express();
        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        // Enable CORS for all routes
        app.use(cors({
            origin: 'http://127.0.0.1:5500', 
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            credentials: true,
            optionsSuccessStatus: 204,
        }));
        

        // Handling preflight requests
        app.options('*', cors());

        app.post('/insert', this.handleInsert.bind(this));
        app.get('/query', this.handleQuery.bind(this));

        const port = 8008;
        app.listen(port, () => {
            console.log(`Server2 listening at http://localhost:${port}`);
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